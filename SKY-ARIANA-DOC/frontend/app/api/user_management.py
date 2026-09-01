from __future__ import annotations

from datetime import datetime, timedelta
import hashlib
import secrets
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import asc, desc, func, or_
from sqlalchemy.orm import Session

from app.core.security import get_current_user, get_password_hash, get_session_id_from_request, require_permission
from app.database.session import get_db
from app.models import models
from app.schemas.schemas import (
    AdminPasswordResetRequest,
    ChangeRoleRequest,
    LoginActivityOut,
    PermissionOut,
    PermissionUpdateRequest,
    RoleCreate,
    RoleOut,
    RoleUpdate,
    SecuritySettingsBase,
    SecuritySettingsOut,
    SessionOut,
    UserManagementCreate,
    UserManagementUpdate,
)
from app.services.access_control import (
    ALL_PERMISSION_KEYS,
    PERMISSION_DEFINITIONS,
    ROLE_RANK,
    can_assign_role,
    effective_permission_keys,
    ensure_access_control,
    get_role_name,
    get_security_settings,
    has_permission,
    is_super_admin,
    normalize_role_name,
    serialize_user,
    validate_password,
    generate_temporary_password,
)
from app.services.audit import write_audit

router = APIRouter(prefix="/users", tags=["user-management"])


def _user_or_404(db: Session, user_id: int, include_deleted: bool = False) -> models.User:
    query = db.query(models.User).filter(models.User.id == user_id)
    if not include_deleted:
        query = query.filter(models.User.deleted_at.is_(None))
    user = query.first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user


def _role_or_404(db: Session, role_name: str) -> models.Role:
    role = db.query(models.Role).filter(models.Role.name == normalize_role_name(role_name)).first()
    if not role:
        raise HTTPException(status_code=422, detail="The selected role does not exist.")
    return role


def _snapshot(db: Session, user: models.User) -> dict[str, Any]:
    data = serialize_user(db, user, include_permissions=False)
    data.pop("permissions", None)
    return data


def _assert_target_access(db: Session, actor: models.User, target: models.User, *, action: str) -> None:
    if target.id == actor.id and action in {"delete", "suspend", "deactivate", "role"}:
        raise HTTPException(status_code=400, detail="You cannot remove or reduce access to your own account from this action.")
    actor_role = get_role_name(db, actor)
    target_role = get_role_name(db, target)
    if target_role == "Super Admin" and actor_role != "Super Admin":
        raise HTTPException(status_code=403, detail="Only a Super Admin can modify another Super Admin.")
    if actor_role != "Super Admin" and ROLE_RANK.get(actor_role, 0) < ROLE_RANK.get(target_role, 0):
        raise HTTPException(status_code=403, detail="You cannot modify a user with greater authority.")


def _assert_final_super_admin_protected(db: Session, target: models.User, *, removing_access: bool) -> None:
    if get_role_name(db, target) != "Super Admin" or not removing_access:
        return
    count = 0
    for user in db.query(models.User).filter(models.User.deleted_at.is_(None), models.User.is_active.is_(True)).all():
        if get_role_name(db, user) == "Super Admin" and (user.status or "active") == "active":
            count += 1
    if count <= 1:
        raise HTTPException(status_code=400, detail="The final active Super Admin must remain active and cannot be downgraded or deleted.")


def _session_dict(session: models.UserSession, current_session_id: str | None = None) -> dict[str, Any]:
    user = session.user
    return {
        "id": session.id,
        "user_id": session.user_id,
        "user_name": user.display_name or user.name if user else None,
        "username": user.username if user else None,
        "device": session.device,
        "browser": session.browser,
        "operating_system": session.operating_system,
        "ip_address": session.ip_address,
        "approximate_location": session.approximate_location,
        "created_at": session.created_at,
        "last_active_at": session.last_active_at,
        "expires_at": session.expires_at,
        "revoked_at": session.revoked_at,
        "is_current": bool(current_session_id and session.session_identifier == current_session_id),
    }


def _role_dict(db: Session, role: models.Role) -> dict[str, Any]:
    permission_keys = sorted(link.permission.key for link in role.permission_links if link.permission)
    return {
        "id": role.id,
        "name": role.name,
        "description": role.description,
        "is_system_role": role.is_system_role,
        "user_count": db.query(models.User).filter(models.User.role_id == role.id, models.User.deleted_at.is_(None)).count(),
        "permission_count": len(permission_keys),
        "permissions": permission_keys,
        "created_at": role.created_at,
        "updated_at": role.updated_at,
    }


def _issue_password_reset_record(db: Session, user: models.User) -> None:
    """Create a hashed, expiring reset record for the configured mail layer."""
    now = datetime.utcnow()
    db.query(models.PasswordReset).filter(
        models.PasswordReset.user_id == user.id,
        models.PasswordReset.used_at.is_(None),
    ).update({models.PasswordReset.used_at: now}, synchronize_session=False)
    security_settings = get_security_settings(db)
    raw_token = secrets.token_urlsafe(32)
    db.add(models.PasswordReset(
        user_id=user.id,
        token_hash=hashlib.sha256(raw_token.encode()).hexdigest(),
        expires_at=now + timedelta(minutes=security_settings.password_reset_expiration_minutes),
    ))


@router.get("")
def list_users(
    search: str | None = None,
    role: str | None = None,
    status_filter: str | None = Query(None, alias="status"),
    sort: str = "newest",
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=5, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("users.view")),
):
    query = db.query(models.User).filter(models.User.deleted_at.is_(None))
    if search:
        value = f"%{search.strip()}%"
        query = query.filter(or_(models.User.name.ilike(value), models.User.display_name.ilike(value), models.User.email.ilike(value), models.User.username.ilike(value), models.User.employee_id.ilike(value)))
    if role:
        selected_role = db.query(models.Role).filter(models.Role.name == normalize_role_name(role)).first()
        query = query.filter(models.User.role_id == selected_role.id if selected_role else models.User.id == -1)
    if status_filter:
        query = query.filter(models.User.status == status_filter)

    sort_map = {
        "name": models.User.name,
        "role": models.User.role,
        "last_login": models.User.last_login_at,
        "newest": models.User.created_at,
    }
    sort_column = sort_map.get(sort, models.User.created_at)
    query = query.order_by(asc(sort_column) if sort == "name" else desc(sort_column))
    total = query.count()
    users = query.offset((page - 1) * page_size).limit(page_size).all()
    active_session_counts = dict(db.query(models.UserSession.user_id, func.count(models.UserSession.id)).filter(models.UserSession.revoked_at.is_(None), models.UserSession.expires_at > datetime.utcnow()).group_by(models.UserSession.user_id).all())
    items = []
    for user in users:
        item = serialize_user(db, user, include_permissions=False)
        item["active_sessions"] = active_session_counts.get(user.id, 0)
        items.append(item)
    all_users = db.query(models.User).filter(models.User.deleted_at.is_(None)).all()
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "summary": {
            "total_users": len(all_users),
            "active_users": sum(1 for user in all_users if user.status == "active" and user.is_active),
            "suspended_users": sum(1 for user in all_users if user.status in {"suspended", "inactive", "locked"} or not user.is_active),
            "pending_invitations": sum(1 for user in all_users if user.status == "pending"),
            "active_sessions": sum(active_session_counts.values()),
        },
        "current_user_permissions": sorted(effective_permission_keys(db, current_user)),
    }


@router.get("/{user_id:int}")
def get_user(user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_permission("users.view"))):
    user = _user_or_404(db, user_id)
    item = serialize_user(db, user)
    item["sessions"] = [_session_dict(session) for session in db.query(models.UserSession).filter(models.UserSession.user_id == user.id).order_by(models.UserSession.last_active_at.desc()).limit(20).all()]
    item["recent_audit"] = [
        {"id": log.id, "action": log.action, "module": log.module, "description": log.description, "created_at": log.created_at}
        for log in db.query(models.AuditLog).filter(or_(models.AuditLog.actor_user_id == user.id, models.AuditLog.target_user_id == user.id)).order_by(models.AuditLog.created_at.desc()).limit(20).all()
    ]
    return item


@router.post("")
def create_user(request: Request, payload: UserManagementCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_permission("users.create"))):
    ensure_access_control(db)
    email = payload.email.strip().lower()
    username = payload.username.strip().lower() if payload.username else email.split("@")[0]
    if db.query(models.User).filter(models.User.email.ilike(email), models.User.deleted_at.is_(None)).first():
        raise HTTPException(status_code=409, detail="A user with that email already exists.")
    if db.query(models.User).filter(models.User.username.ilike(username), models.User.deleted_at.is_(None)).first():
        raise HTTPException(status_code=409, detail="A user with that username already exists.")
    if payload.employee_id and db.query(models.User).filter(models.User.employee_id == payload.employee_id, models.User.deleted_at.is_(None)).first():
        raise HTTPException(status_code=409, detail="A user with that employee ID already exists.")
    role = _role_or_404(db, payload.role)
    if not can_assign_role(db, current_user, role.name):
        raise HTTPException(status_code=403, detail="You cannot assign the selected role.")
    if role.name != "Viewer" and not has_permission(db, current_user, "users.change_role"):
        raise HTTPException(status_code=403, detail="You do not have permission to assign roles.")
    temporary_password = payload.password if payload.password and not payload.generate_temporary_password else generate_temporary_password()
    security_settings = get_security_settings(db)
    errors = validate_password(temporary_password, security_settings)
    if errors:
        raise HTTPException(status_code=422, detail={"message": "Password does not meet the security policy.", "errors": errors})
    name = (payload.display_name or f"{payload.first_name.strip()} {payload.last_name.strip()}").strip()
    user = models.User(
        name=name,
        display_name=name,
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        username=username,
        email=email,
        phone=payload.phone.strip() if payload.phone else None,
        employee_id=payload.employee_id.strip() if payload.employee_id else None,
        job_title=payload.job_title.strip() if payload.job_title else None,
        department=payload.department.strip() if payload.department else None,
        password_hash=get_password_hash(temporary_password),
        role=role.name,
        role_id=role.id,
        status=payload.status,
        is_active=payload.status == "active",
        language=payload.language,
        timezone=payload.timezone,
        must_change_password=payload.require_password_change,
        password_changed_at=datetime.utcnow(),
        created_by=current_user.id,
    )
    db.add(user)
    db.flush()
    if payload.custom_permissions:
        if not has_permission(db, current_user, "permissions.manage"):
            raise HTTPException(status_code=403, detail="Only a Super Admin can apply custom permission overrides.")
        _replace_user_permissions(db, user, payload.custom_permissions)
    write_audit(db, actor_user_id=current_user.id, target_user_id=user.id, action="user.created", module="users", description=f"Created user {user.display_name}.", new_values={"email": user.email, "username": user.username, "role": role.name, "status": user.status}, request=request)
    invitation_requested = bool(payload.send_invitation)
    if invitation_requested:
        _issue_password_reset_record(db, user)
        user.status = "pending"
        user.is_active = True
        write_audit(db, actor_user_id=current_user.id, target_user_id=user.id, action="user.invitation_requested", module="users", description="An invitation was prepared for delivery by the configured mail layer.", request=request)
    db.commit()
    response = {"user": serialize_user(db, user), "temporary_password": temporary_password, "invitation_sent": False, "invitation_requested": invitation_requested, "message": "User created successfully."}
    return response


@router.put("/{user_id:int}")
def update_user(request: Request, user_id: int, payload: UserManagementUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(require_permission("users.edit"))):
    user = _user_or_404(db, user_id)
    _assert_target_access(db, current_user, user, action="edit")
    old_values = _snapshot(db, user)
    values = payload.model_dump(exclude_unset=True)
    if "email" in values and values["email"]:
        values["email"] = values["email"].strip().lower()
        duplicate = db.query(models.User).filter(models.User.email.ilike(values["email"]), models.User.id != user.id, models.User.deleted_at.is_(None)).first()
        if duplicate:
            raise HTTPException(status_code=409, detail="A user with that email already exists.")
    if "username" in values and values["username"]:
        values["username"] = values["username"].strip().lower()
        duplicate = db.query(models.User).filter(models.User.username.ilike(values["username"]), models.User.id != user.id, models.User.deleted_at.is_(None)).first()
        if duplicate:
            raise HTTPException(status_code=409, detail="A user with that username already exists.")
    if "employee_id" in values and values["employee_id"]:
        duplicate = db.query(models.User).filter(models.User.employee_id == values["employee_id"], models.User.id != user.id, models.User.deleted_at.is_(None)).first()
        if duplicate:
            raise HTTPException(status_code=409, detail="A user with that employee ID already exists.")
    new_role = None
    if "role" in values and values["role"]:
        new_role = _role_or_404(db, values.pop("role"))
        _assert_target_access(db, current_user, user, action="role")
        if not can_assign_role(db, current_user, new_role.name):
            raise HTTPException(status_code=403, detail="You cannot assign the selected role.")
        if new_role.name == "Super Admin" and not is_super_admin(db, current_user):
            raise HTTPException(status_code=403, detail="Only a Super Admin can assign the Super Admin role.")
        if get_role_name(db, user) == "Super Admin" and new_role.name != "Super Admin":
            _assert_final_super_admin_protected(db, user, removing_access=True)
        if not has_permission(db, current_user, "users.change_role"):
            raise HTTPException(status_code=403, detail="You do not have permission to change roles.")
        values["role_id"] = new_role.id
        values["role"] = new_role.name
    requested_status = values.get("status")
    if requested_status in {"suspended", "inactive"}:
        _assert_target_access(db, current_user, user, action="suspend")
        _assert_final_super_admin_protected(db, user, removing_access=True)
        values["is_active"] = False
    elif requested_status == "active":
        values["is_active"] = True
    if values.get("custom_permissions") is not None:
        if not has_permission(db, current_user, "permissions.manage"):
            raise HTTPException(status_code=403, detail="Only a Super Admin can apply custom permission overrides.")
        permissions = values.pop("custom_permissions") or []
        _replace_user_permissions(db, user, permissions)
    values.pop("require_password_change", None)
    for field, value in values.items():
        if field in {"first_name", "last_name", "display_name", "phone", "job_title", "department", "language", "timezone", "status"} and isinstance(value, str):
            value = value.strip()
        setattr(user, field, value)
    if "first_name" in values or "last_name" in values or "display_name" in values:
        user.name = user.display_name or " ".join(filter(None, [user.first_name, user.last_name])) or user.name
        user.display_name = user.name
    if payload.require_password_change is not None:
        user.must_change_password = payload.require_password_change
    user.updated_by = current_user.id
    if new_role:
        now = datetime.utcnow()
        db.query(models.UserSession).filter(models.UserSession.user_id == user.id, models.UserSession.revoked_at.is_(None)).update({models.UserSession.revoked_at: now, models.UserSession.revoked_by: current_user.id})
    new_values = _snapshot(db, user)
    write_audit(db, actor_user_id=current_user.id, target_user_id=user.id, action="user.updated", module="users", description=f"Updated user {user.display_name or user.name}.", old_values=old_values, new_values=new_values, request=request)
    if new_role:
        write_audit(db, actor_user_id=current_user.id, target_user_id=user.id, action="user.role_changed", module="users", description=f"Changed role to {new_role.name}.", old_values={"role": old_values.get("role_name")}, new_values={"role": new_role.name}, request=request)
    db.commit()
    return {"user": serialize_user(db, user), "message": "User updated successfully."}


@router.post("/{user_id:int}/suspend")
def suspend_user(request: Request, user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_permission("users.suspend"))):
    user = _user_or_404(db, user_id)
    _assert_target_access(db, current_user, user, action="suspend")
    _assert_final_super_admin_protected(db, user, removing_access=True)
    user.status = "suspended"
    user.is_active = False
    now = datetime.utcnow()
    db.query(models.UserSession).filter(models.UserSession.user_id == user.id, models.UserSession.revoked_at.is_(None)).update({models.UserSession.revoked_at: now, models.UserSession.revoked_by: current_user.id})
    write_audit(db, actor_user_id=current_user.id, target_user_id=user.id, action="user.suspended", module="users", description=f"Suspended user {user.display_name or user.name}; active sessions were revoked.", request=request)
    db.commit()
    return {"message": "User suspended.", "user": serialize_user(db, user)}


@router.post("/{user_id:int}/activate")
def activate_user(request: Request, user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_permission("users.activate"))):
    user = _user_or_404(db, user_id)
    _assert_target_access(db, current_user, user, action="activate")
    user.status = "active"
    user.is_active = True
    user.locked_until = None
    user.failed_login_attempts = 0
    write_audit(db, actor_user_id=current_user.id, target_user_id=user.id, action="user.activated", module="users", description=f"Activated user {user.display_name or user.name}.", request=request)
    db.commit()
    return {"message": "User activated.", "user": serialize_user(db, user)}


@router.delete("/{user_id:int}")
def delete_user(request: Request, user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_permission("users.delete"))):
    user = _user_or_404(db, user_id)
    _assert_target_access(db, current_user, user, action="delete")
    _assert_final_super_admin_protected(db, user, removing_access=True)
    now = datetime.utcnow()
    user.deleted_at = now
    user.deleted_by = current_user.id
    user.deletion_reason = "Soft-deleted by an authorized administrator."
    user.status = "inactive"
    user.is_active = False
    db.query(models.UserSession).filter(models.UserSession.user_id == user.id, models.UserSession.revoked_at.is_(None)).update({models.UserSession.revoked_at: now, models.UserSession.revoked_by: current_user.id})
    write_audit(db, actor_user_id=current_user.id, target_user_id=user.id, action="user.deleted", module="users", description=f"Soft-deleted user {user.display_name or user.name}; relational history was preserved.", request=request)
    db.commit()
    return {"message": "User deleted."}


@router.post("/{user_id:int}/role")
def change_role(request: Request, user_id: int, payload: ChangeRoleRequest, db: Session = Depends(get_db), current_user: models.User = Depends(require_permission("users.change_role"))):
    return update_user(request, user_id, UserManagementUpdate(role=payload.role), db, current_user)


def _replace_user_permissions(db: Session, user: models.User, permission_keys: list[str]) -> None:
    normalized = {key.strip() for key in permission_keys if key.strip()}
    unknown = normalized - ALL_PERMISSION_KEYS - {permission.key for permission in db.query(models.Permission).all()}
    if unknown:
        raise HTTPException(status_code=422, detail=f"Unknown permission keys: {', '.join(sorted(unknown))}")
    db.query(models.UserPermission).filter(models.UserPermission.user_id == user.id).delete(synchronize_session=False)
    for key in normalized:
        permission = db.query(models.Permission).filter(models.Permission.key == key).first()
        if permission:
            db.add(models.UserPermission(user_id=user.id, permission_id=permission.id, allowed=True))


@router.put("/{user_id:int}/permissions")
def update_permissions(request: Request, user_id: int, payload: PermissionUpdateRequest, db: Session = Depends(get_db), current_user: models.User = Depends(require_permission("permissions.manage"))):
    user = _user_or_404(db, user_id)
    _assert_target_access(db, current_user, user, action="edit")
    if get_role_name(db, user) == "Super Admin" and set(payload.permissions) != ALL_PERMISSION_KEYS:
        raise HTTPException(status_code=400, detail="Super Admin accounts must retain all system permissions.")
    old_values = {"permissions": sorted(effective_permission_keys(db, user))}
    _replace_user_permissions(db, user, payload.permissions)
    new_values = {"permissions": sorted(effective_permission_keys(db, user))}
    write_audit(db, actor_user_id=current_user.id, target_user_id=user.id, action="user.permissions_changed", module="users", description=f"Updated permission overrides for {user.display_name or user.name}.", old_values=old_values, new_values=new_values, request=request)
    db.commit()
    return {"message": "Permissions updated.", "permissions": sorted(effective_permission_keys(db, user))}


@router.post("/{user_id:int}/password-reset")
def reset_password(request: Request, user_id: int, payload: AdminPasswordResetRequest, db: Session = Depends(get_db), current_user: models.User = Depends(require_permission("users.reset_password"))):
    user = _user_or_404(db, user_id)
    _assert_target_access(db, current_user, user, action="edit")
    password = payload.new_password if payload.new_password and not payload.generate_temporary_password else generate_temporary_password()
    security_settings = get_security_settings(db)
    errors = validate_password(password, security_settings)
    if errors:
        raise HTTPException(status_code=422, detail={"message": "Password does not meet the security policy.", "errors": errors})
    now = datetime.utcnow()
    user.password_hash = get_password_hash(password)
    user.password_changed_at = now
    user.must_change_password = payload.require_password_change
    if payload.revoke_sessions:
        db.query(models.UserSession).filter(models.UserSession.user_id == user.id, models.UserSession.revoked_at.is_(None)).update({models.UserSession.revoked_at: now, models.UserSession.revoked_by: current_user.id})
    write_audit(db, actor_user_id=current_user.id, target_user_id=user.id, action="user.password_reset", module="users", description=f"Administrator reset the password for {user.display_name or user.name}.", new_values={"require_password_change": user.must_change_password, "sessions_revoked": payload.revoke_sessions}, request=request)
    db.commit()
    return {"message": "Temporary password created.", "temporary_password": password}


@router.post("/{user_id:int}/invitation")
def resend_invitation(request: Request, user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_permission("users.edit"))):
    user = _user_or_404(db, user_id)
    _assert_target_access(db, current_user, user, action="edit")
    _issue_password_reset_record(db, user)
    user.status = "pending"
    user.is_active = True
    user.must_change_password = True
    write_audit(db, actor_user_id=current_user.id, target_user_id=user.id, action="user.invitation_resent", module="users", description="A fresh invitation was prepared for delivery by the configured mail layer.", request=request)
    db.commit()
    return {"message": "Invitation prepared. Configure the mail provider to deliver it.", "invitation_sent": False}


@router.post("/{user_id:int}/password-reset-link")
def send_password_reset_link(request: Request, user_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_permission("users.reset_password"))):
    user = _user_or_404(db, user_id)
    _assert_target_access(db, current_user, user, action="edit")
    _issue_password_reset_record(db, user)
    user.must_change_password = True
    write_audit(db, actor_user_id=current_user.id, target_user_id=user.id, action="password.reset_link_requested", module="users", description="A password reset link was prepared for delivery by the configured mail layer.", request=request)
    db.commit()
    return {"message": "Password reset link prepared. Configure the mail provider to deliver it.", "link_sent": False}


@router.get("/roles/list", response_model=list[RoleOut])
def list_roles(db: Session = Depends(get_db), current_user: models.User = Depends(require_permission("roles.view"))):
    return [_role_dict(db, role) for role in db.query(models.Role).order_by(models.Role.is_system_role.desc(), models.Role.name.asc()).all()]


@router.post("/roles", response_model=RoleOut)
def create_role(request: Request, payload: RoleCreate, db: Session = Depends(get_db), current_user: models.User = Depends(require_permission("roles.create"))):
    name = payload.name.strip()
    if db.query(models.Role).filter(models.Role.name.ilike(name)).first():
        raise HTTPException(status_code=409, detail="A role with that name already exists.")
    role = models.Role(name=name, description=payload.description.strip() if payload.description else None, is_system_role=False)
    db.add(role)
    db.flush()
    _replace_role_permissions(db, role, payload.permissions)
    write_audit(db, actor_user_id=current_user.id, action="role.created", module="roles", description=f"Created custom role {name}.", new_values={"name": name, "permissions": payload.permissions}, request=request)
    db.commit()
    return _role_dict(db, role)


@router.put("/roles/{role_id}", response_model=RoleOut)
def update_role(request: Request, role_id: int, payload: RoleUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(require_permission("roles.edit"))):
    role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found.")
    if role.is_system_role and not is_super_admin(db, current_user):
        raise HTTPException(status_code=403, detail="Built-in roles can only be changed by a Super Admin.")
    old_values = _role_dict(db, role)
    if payload.name and payload.name.strip() != role.name:
        if role.is_system_role:
            raise HTTPException(status_code=400, detail="Built-in role names cannot be changed.")
        role.name = payload.name.strip()
    if payload.description is not None:
        role.description = payload.description.strip()
    if payload.permissions is not None:
        if role.name == "Super Admin" and set(payload.permissions) != ALL_PERMISSION_KEYS:
            raise HTTPException(status_code=400, detail="Super Admin must retain all system permissions.")
        _replace_role_permissions(db, role, payload.permissions)
    write_audit(db, actor_user_id=current_user.id, action="role.updated", module="roles", description=f"Updated role {role.name}.", old_values=old_values, new_values=_role_dict(db, role), request=request)
    db.commit()
    return _role_dict(db, role)


@router.delete("/roles/{role_id}")
def delete_role(request: Request, role_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_permission("roles.delete"))):
    role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found.")
    if role.is_system_role:
        raise HTTPException(status_code=400, detail="Built-in roles cannot be deleted.")
    if db.query(models.User).filter(models.User.role_id == role.id, models.User.deleted_at.is_(None)).count():
        raise HTTPException(status_code=409, detail="Reassign users before deleting this role.")
    name = role.name
    db.delete(role)
    write_audit(db, actor_user_id=current_user.id, action="role.deleted", module="roles", description=f"Deleted custom role {name}.", request=request)
    db.commit()
    return {"message": "Role deleted."}


def _replace_role_permissions(db: Session, role: models.Role, permission_keys: list[str]) -> None:
    normalized = {key.strip() for key in permission_keys if key.strip()}
    unknown = normalized - {permission["key"] for permission in PERMISSION_DEFINITIONS}
    if unknown:
        raise HTTPException(status_code=422, detail=f"Unknown permission keys: {', '.join(sorted(unknown))}")
    db.query(models.RolePermission).filter(models.RolePermission.role_id == role.id).delete(synchronize_session=False)
    for key in normalized:
        permission = db.query(models.Permission).filter(models.Permission.key == key).first()
        if permission:
            db.add(models.RolePermission(role_id=role.id, permission_id=permission.id))


@router.get("/permissions/list", response_model=list[PermissionOut])
def list_permissions(db: Session = Depends(get_db), current_user: models.User = Depends(require_permission("roles.view"))):
    return db.query(models.Permission).order_by(models.Permission.module.asc(), models.Permission.action.asc()).all()


@router.get("/login-activity")
def list_login_activity(
    user_id: int | None = None,
    result: str | None = None,
    failed_only: bool = False,
    ip_address: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=5, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_permission("security.view_login_activity")),
):
    query = db.query(models.LoginActivity)
    if user_id:
        query = query.filter(models.LoginActivity.user_id == user_id)
    if result:
        query = query.filter(models.LoginActivity.result == result)
    if failed_only:
        query = query.filter(models.LoginActivity.result != "Successful")
    if ip_address:
        query = query.filter(models.LoginActivity.ip_address.ilike(f"%{ip_address.strip()}%"))
    total = query.count()
    rows = query.order_by(models.LoginActivity.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "items": [{
            "id": row.id,
            "user_id": row.user_id,
            "user_name": row.user.display_name or row.user.name if row.user else None,
            "email_attempted": row.email_attempted,
            "result": row.result,
            "failure_reason": row.failure_reason,
            "ip_address": row.ip_address,
            "device": row.device,
            "browser": row.browser,
            "operating_system": row.operating_system,
            "approximate_location": row.approximate_location,
            "created_at": row.created_at,
        } for row in rows],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/sessions")
def list_sessions(
    request: Request,
    user_id: int | None = None,
    include_revoked: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    can_manage_all = has_permission(db, current_user, "security.manage_sessions")
    if user_id and user_id != current_user.id and not can_manage_all:
        raise HTTPException(status_code=403, detail="You can only view your own sessions.")
    query = db.query(models.UserSession)
    if user_id:
        query = query.filter(models.UserSession.user_id == user_id)
    elif not can_manage_all:
        query = query.filter(models.UserSession.user_id == current_user.id)
    if not include_revoked:
        query = query.filter(models.UserSession.revoked_at.is_(None), models.UserSession.expires_at > datetime.utcnow())
    session_id = get_session_id_from_request(request)
    # The opaque session identifier itself is never returned to the client.
    sessions = query.order_by(models.UserSession.last_active_at.desc()).limit(100).all()
    return {"items": [_session_dict(session, session_id) for session in sessions], "total": len(sessions)}


@router.post("/sessions/{session_id}/revoke")
def revoke_session(request: Request, session_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    session = db.query(models.UserSession).filter(models.UserSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    if session.user_id != current_user.id and not has_permission(db, current_user, "security.manage_sessions"):
        raise HTTPException(status_code=403, detail="You cannot revoke another user's session.")
    if not session.revoked_at:
        session.revoked_at = datetime.utcnow()
        session.revoked_by = current_user.id
        write_audit(db, actor_user_id=current_user.id, target_user_id=session.user_id, action="session.revoked", module="security", description="A user session was revoked.", request=request)
        db.commit()
    return {"message": "Session revoked."}


@router.post("/{user_id:int}/sessions/revoke-all")
def revoke_all_sessions(request: Request, user_id: int, except_current: bool = False, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if user_id != current_user.id and not has_permission(db, current_user, "security.manage_sessions"):
        raise HTTPException(status_code=403, detail="You cannot revoke another user's sessions.")
    now = datetime.utcnow()
    current_session_id = get_session_id_from_request(request) if except_current and user_id == current_user.id else None
    query = db.query(models.UserSession).filter(models.UserSession.user_id == user_id, models.UserSession.revoked_at.is_(None))
    if current_session_id:
        query = query.filter(models.UserSession.session_identifier != current_session_id)
    query.update({models.UserSession.revoked_at: now, models.UserSession.revoked_by: current_user.id})
    write_audit(db, actor_user_id=current_user.id, target_user_id=user_id, action="sessions.revoked_all", module="security", description="All sessions were revoked for a user.", new_values={"except_current": except_current}, request=request)
    db.commit()
    return {"message": "Sessions revoked."}


@router.get("/security-settings", response_model=SecuritySettingsOut)
def read_security_settings(db: Session = Depends(get_db), current_user: models.User = Depends(require_permission("security.view"))):
    return get_security_settings(db)


@router.put("/security-settings", response_model=SecuritySettingsOut)
def update_security_settings(request: Request, payload: SecuritySettingsBase, db: Session = Depends(get_db), current_user: models.User = Depends(require_permission("security.manage"))):
    settings = get_security_settings(db)
    old_values = {key: getattr(settings, key) for key in payload.model_dump().keys()}
    incoming = payload.model_dump()
    weaker = (incoming["minimum_password_length"] < settings.minimum_password_length or incoming["failed_login_limit"] > settings.failed_login_limit or incoming["session_timeout_minutes"] > settings.session_timeout_minutes or (settings.require_uppercase and not incoming["require_uppercase"]) or (settings.require_lowercase and not incoming["require_lowercase"]) or (settings.require_number and not incoming["require_number"]) or (settings.require_special and not incoming["require_special"]))
    if weaker and request.headers.get("x-confirm-security-change") != "true":
        raise HTTPException(status_code=409, detail="This change reduces security. Confirm it explicitly before saving.")
    for key, value in incoming.items():
        setattr(settings, key, value)
    write_audit(db, actor_user_id=current_user.id, action="security.settings_changed", module="security", description="Security settings were updated.", old_values=old_values, new_values=incoming, request=request)
    db.commit()
    return settings
