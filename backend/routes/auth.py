"""Authentication, RBAC User Management, and Device Pairing Routes for AQ COMPANIES."""

from __future__ import annotations

import logging
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth_middleware import get_current_user, require_permission, require_role
from backend.database import get_db
from backend.models.base import generate_uuid
from backend.models.system import UserModel
from backend.services.audit_service import record_audit_event
from backend.services.auth_service import (
    create_user_session,
    generate_pairing_code,
    hash_password,
    redeem_pairing_code,
    revoke_session,
    verify_password,
    verify_signed_token,
)
from backend.services.rbac_service import (
    ROLE_ADMIN,
    ROLE_SUPERADMIN,
    SYSTEM_ROLES,
    get_role_permissions,
)

logger = logging.getLogger("aq_companies.routes.auth")

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=2)
    password: str = Field(..., min_length=4)
    device_id: Optional[str] = None
    device_name: Optional[str] = None


class UserCreateRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=6, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=160)
    email: Optional[str] = None
    role: str = Field(default="operations")


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


class PairingCodeRequest(BaseModel):
    role: str = Field(default="accounting")
    minutes_valid: int = Field(default=15, ge=1, le=120)


class PairDeviceRequest(BaseModel):
    code: str
    device_id: str
    device_name: str


@router.post("/login", summary="Authenticate user and obtain session token")
async def login(payload: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    """Authenticate credentials.
    
    If this is the very first startup and no users exist in the database,
    the provided credentials automatically initialize the primary Administrator.
    """
    clean_username = payload.username.strip().lower()

    # Check if any user exists in database
    count_res = await db.execute(select(UserModel))
    all_users = count_res.scalars().all()

    if len(all_users) == 0:
        # Bootstrap primary Administrator
        logger.info(f"Zero users found. Bootstrapping primary administrator '{clean_username}'...")
        hashed, salt = hash_password(payload.password)
        admin_user = UserModel(
            id=generate_uuid(),
            username=clean_username,
            full_name="System Administrator",
            role=ROLE_SUPERADMIN,
            password_hash=f"{hashed}:{salt}",
            is_active=True,
        )
        db.add(admin_user)
        await db.commit()
        await db.refresh(admin_user)
        target_user = admin_user
    else:
        # Find user
        res = await db.execute(select(UserModel).where(UserModel.username == clean_username))
        target_user = res.scalar_one_or_none()

        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password.",
            )

        if not target_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated. Please contact your administrator.",
            )

        # Verify password
        parts = target_user.password_hash.split(":")
        if len(parts) != 2:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Corrupt credential format.",
            )
        stored_hash, salt = parts[0], parts[1]

        if not verify_password(payload.password, stored_hash, salt):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password.",
            )

    # Issue session
    token = create_user_session(
        user_id=target_user.id,
        username=target_user.username,
        role=target_user.role,
        device_id=payload.device_id,
        device_name=payload.device_name,
    )

    # Audit login
    client_ip = request.client.host if request.client else None
    await record_audit_event(
        db=db,
        action="LOGIN_SUCCESS",
        entity_type="AUTH",
        user_id=target_user.id,
        username=target_user.username,
        ip_address=client_ip,
    )
    await db.commit()

    permissions = get_role_permissions(target_user.role)

    return {
        "success": True,
        "token": token,
        "user": {
            "id": target_user.id,
            "username": target_user.username,
            "full_name": target_user.full_name,
            "role": target_user.role,
            "email": target_user.email,
        },
        "permissions": permissions,
    }


@router.post("/logout", summary="Revoke current session")
async def logout(request: Request, current_user: UserModel = Depends(get_current_user)):
    auth_header = request.headers.get("authorization", "")
    token = auth_header.split()[1] if len(auth_header.split()) == 2 else ""
    payload = verify_signed_token(token)
    if payload and "jti" in payload:
        revoke_session(payload["jti"])

    return {"success": True, "message": "Logged out successfully"}


@router.get("/me", summary="Get authenticated user profile and permissions")
async def get_me(current_user: UserModel = Depends(get_current_user)):
    permissions = get_role_permissions(current_user.role)
    return {
        "success": True,
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "full_name": current_user.full_name,
            "role": current_user.role,
            "email": current_user.email,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        },
        "permissions": permissions,
    }


@router.get("/users", summary="List all user accounts")
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(require_role([ROLE_SUPERADMIN, ROLE_ADMIN])),
):
    result = await db.execute(select(UserModel).order_by(UserModel.created_at.desc()))
    users = result.scalars().all()
    return {
        "success": True,
        "total": len(users),
        "users": [
            {
                "id": u.id,
                "username": u.username,
                "full_name": u.full_name,
                "email": u.email,
                "role": u.role,
                "is_active": u.is_active,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
    }


@router.post("/users", status_code=status.HTTP_201_CREATED, summary="Create a new user account")
async def create_user(
    payload: UserCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(require_role([ROLE_SUPERADMIN, ROLE_ADMIN])),
):
    clean_username = payload.username.strip().lower()
    clean_role = payload.role.strip().lower()

    if clean_role not in SYSTEM_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {SYSTEM_ROLES}",
        )

    # Check for existing user
    existing = await db.execute(select(UserModel).where(UserModel.username == clean_username))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Username '{clean_username}' already exists.",
        )

    hashed, salt = hash_password(payload.password)
    new_user = UserModel(
        id=generate_uuid(),
        username=clean_username,
        full_name=payload.full_name.strip(),
        email=payload.email.strip() if payload.email else None,
        role=clean_role,
        password_hash=f"{hashed}:{salt}",
        is_active=True,
    )
    db.add(new_user)

    await record_audit_event(
        db=db,
        action="USER_CREATE",
        entity_type="USER",
        user_id=current_user.id,
        username=current_user.username,
        entity_id=new_user.id,
        new_values={"username": clean_username, "role": clean_role, "full_name": new_user.full_name},
    )
    await db.commit()
    await db.refresh(new_user)

    return {
        "success": True,
        "message": f"User '{clean_username}' created successfully.",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "full_name": new_user.full_name,
            "role": new_user.role,
        },
    }


@router.patch("/users/{user_id}", summary="Update user account details")
async def update_user(
    user_id: str,
    payload: UserUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(require_role([ROLE_SUPERADMIN, ROLE_ADMIN])),
):
    res = await db.execute(select(UserModel).where(UserModel.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    old_values = {"role": user.role, "is_active": user.is_active, "full_name": user.full_name}

    if payload.full_name is not None:
        user.full_name = payload.full_name.strip()
    if payload.email is not None:
        user.email = payload.email.strip()
    if payload.role is not None:
        clean_role = payload.role.strip().lower()
        if clean_role not in SYSTEM_ROLES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid role: {clean_role}")
        user.role = clean_role
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.password:
        hashed, salt = hash_password(payload.password)
        user.password_hash = f"{hashed}:{salt}"

    await record_audit_event(
        db=db,
        action="USER_UPDATE",
        entity_type="USER",
        user_id=current_user.id,
        username=current_user.username,
        entity_id=user.id,
        old_values=old_values,
        new_values={"role": user.role, "is_active": user.is_active, "full_name": user.full_name},
    )
    await db.commit()

    return {"success": True, "message": f"User '{user.username}' updated successfully"}


@router.post("/pairing-code", summary="Generate multi-PC enrollment code")
async def create_pairing_code(
    payload: PairingCodeRequest,
    current_user: UserModel = Depends(require_role([ROLE_SUPERADMIN, ROLE_ADMIN])),
):
    code_info = generate_pairing_code(role=payload.role, minutes_valid=payload.minutes_valid)
    return {"success": True, "pairing": code_info}


@router.post("/pair", summary="Redeem pairing code for companion device")
async def pair_device(payload: PairDeviceRequest):
    redeemed = redeem_pairing_code(payload.code, payload.device_id, payload.device_name)
    if not redeemed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired pairing code.",
        )
    return {"success": True, "paired": redeemed}
