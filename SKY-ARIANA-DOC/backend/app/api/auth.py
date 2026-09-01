from __future__ import annotations

from datetime import datetime, timedelta
import hashlib
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_current_user, get_password_hash, get_session_id_from_request, verify_password
from app.database.session import get_db
from app.models.models import LoginActivity, User, UserSession, PasswordReset
from app.schemas.schemas import ChangePasswordRequest, PasswordResetConfirm, PasswordResetRequest, Token, UserOut
from app.services.access_control import get_security_settings, serialize_user, validate_password
from app.services.audit import request_metadata, write_audit

router = APIRouter(prefix="/auth", tags=["auth"])


def _client_context(request: Request) -> dict[str, str | None]:
    metadata = request_metadata(request)
    user_agent = metadata["user_agent"] or "Unknown device"
    lowered = user_agent.lower()
    browser = "Other"
    if "edg" in lowered:
        browser = "Microsoft Edge"
    elif "chrome" in lowered:
        browser = "Chrome"
    elif "firefox" in lowered:
        browser = "Firefox"
    elif "safari" in lowered:
        browser = "Safari"
    operating_system = "Other"
    if "windows" in lowered:
        operating_system = "Windows"
    elif "mac os" in lowered or "macintosh" in lowered:
        operating_system = "macOS"
    elif "android" in lowered:
        operating_system = "Android"
    elif "iphone" in lowered or "ipad" in lowered:
        operating_system = "iOS"
    elif "linux" in lowered:
        operating_system = "Linux"
    return {**metadata, "device": "Browser", "browser": browser, "operating_system": operating_system, "approximate_location": None}


def _record_login(db: Session, *, user: User | None, email: str, result: str, reason: str | None, request: Request) -> None:
    context = _client_context(request)
    db.add(LoginActivity(
        user_id=user.id if user else None,
        email_attempted=email,
        result=result,
        failure_reason=reason,
        ip_address=context["ip_address"],
        device=context["device"],
        browser=context["browser"],
        operating_system=context["operating_system"],
        approximate_location=context["approximate_location"],
    ))


@router.post("/login", response_model=Token)
def login(request: Request, db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    email_or_username = form_data.username.strip()
    normalized_email = email_or_username.lower()
    user = db.query(User).filter(or_(User.email.ilike(normalized_email), User.username.ilike(normalized_email))).first()
    security_settings = get_security_settings(db)
    now = datetime.utcnow()

    if user and user.locked_until and user.locked_until <= now:
        user.locked_until = None
        user.failed_login_attempts = 0
        user.status = "active" if user.is_active and not user.deleted_at else user.status

    if user and (user.deleted_at or not user.is_active or (user.status or "active") in {"suspended", "inactive"}):
        _record_login(db, user=user, email=normalized_email, result="Locked", reason="Account is not active", request=request)
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})

    if user and user.locked_until and user.locked_until > now:
        _record_login(db, user=user, email=normalized_email, result="Locked", reason="Account temporarily locked", request=request)
        db.commit()
        raise HTTPException(status_code=status.HTTP_423_LOCKED, detail="Account temporarily locked. Try again later.")

    if not user or not verify_password(form_data.password, user.password_hash):
        if user:
            user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
            result = "Failed"
            reason = "Invalid credentials"
            if user.failed_login_attempts >= security_settings.failed_login_limit:
                user.locked_until = now + timedelta(minutes=security_settings.lock_duration_minutes)
                user.status = "locked"
                result = "Locked"
                reason = "Too many failed attempts"
            _record_login(db, user=user, email=normalized_email, result=result, reason=reason, request=request)
        else:
            _record_login(db, user=None, email=normalized_email, result="Failed", reason="Invalid credentials", request=request)
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})

    context = _client_context(request)
    session_identifier = secrets.token_urlsafe(32)
    session_expires = now + timedelta(minutes=security_settings.session_timeout_minutes)
    if not security_settings.allow_multiple_sessions:
        db.query(UserSession).filter(UserSession.user_id == user.id, UserSession.revoked_at.is_(None)).update({UserSession.revoked_at: now, UserSession.revoked_by: user.id})
    db.add(UserSession(
        user_id=user.id,
        session_identifier=session_identifier,
        device=context["device"],
        browser=context["browser"],
        operating_system=context["operating_system"],
        ip_address=context["ip_address"],
        approximate_location=context["approximate_location"],
        created_at=now,
        last_active_at=now,
        expires_at=session_expires,
    ))
    user.failed_login_attempts = 0
    user.locked_until = None
    user.status = "active"
    user.last_login_at = now
    user.last_login_ip = context["ip_address"]
    _record_login(db, user=user, email=normalized_email, result="Successful", reason=None, request=request)
    write_audit(db, actor_user_id=user.id, target_user_id=user.id, action="login.successful", module="authentication", description="User signed in successfully.", request=request)
    db.commit()

    access_token = create_access_token(subject=user.id, expires_delta=timedelta(minutes=security_settings.session_timeout_minutes), session_id=session_identifier)
    return {"access_token": access_token, "token_type": "bearer", "user": serialize_user(db, user)}


@router.post("/refresh", response_model=Token)
def refresh_token(request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session_id = get_session_id_from_request(request)
    access_token = create_access_token(subject=current_user.id, session_id=session_id)
    return {"access_token": access_token, "token_type": "bearer", "user": serialize_user(db, current_user)}


@router.get("/me", response_model=UserOut)
def read_users_me(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return serialize_user(db, current_user)


@router.post("/logout")
def logout(request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    session_id = get_session_id_from_request(request)
    if session_id:
        session = db.query(UserSession).filter(UserSession.session_identifier == session_id, UserSession.user_id == current_user.id).first()
        if session and not session.revoked_at:
            session.revoked_at = datetime.utcnow()
            session.revoked_by = current_user.id
            write_audit(db, actor_user_id=current_user.id, target_user_id=current_user.id, action="session.revoked", module="security", description="Current session signed out.", request=request)
            db.commit()
    return {"message": "Signed out successfully."}


@router.post("/change-password")
def change_password(request: Request, payload: ChangePasswordRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=422, detail="New passwords do not match.")
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    security_settings = get_security_settings(db)
    errors = validate_password(payload.new_password, security_settings, payload.current_password)
    if errors:
        raise HTTPException(status_code=422, detail={"message": "Password does not meet the security policy.", "errors": errors})
    now = datetime.utcnow()
    current_user.password_hash = get_password_hash(payload.new_password)
    current_user.password_changed_at = now
    current_user.must_change_password = False
    session_id = get_session_id_from_request(request)
    if payload.revoke_other_sessions:
        query = db.query(UserSession).filter(UserSession.user_id == current_user.id, UserSession.revoked_at.is_(None))
        if session_id:
            query = query.filter(UserSession.session_identifier != session_id)
        query.update({UserSession.revoked_at: now, UserSession.revoked_by: current_user.id})
    write_audit(db, actor_user_id=current_user.id, target_user_id=current_user.id, action="password.changed", module="security", description="User changed their password; other sessions were revoked when requested.", request=request)
    db.commit()
    return {"message": "Password changed successfully."}


@router.post("/password-reset/request")
def request_password_reset(request: Request, payload: PasswordResetRequest, db: Session = Depends(get_db)):
    # Always return the same response so this endpoint cannot be used to
    # enumerate registered email addresses.
    user = db.query(User).filter(User.email.ilike(payload.email.strip().lower()), User.deleted_at.is_(None)).first()
    if user:
        raw_token = secrets.token_urlsafe(32)
        security_settings = get_security_settings(db)
        db.add(PasswordReset(user_id=user.id, token_hash=hashlib.sha256(raw_token.encode()).hexdigest(), expires_at=datetime.utcnow() + timedelta(minutes=security_settings.password_reset_expiration_minutes)))
        write_audit(db, actor_user_id=None, target_user_id=user.id, action="password.reset_requested", module="authentication", description="A password reset was requested.", request=request)
        # Delivery is intentionally delegated to the application's mail layer;
        # never include the reset token in this public response.
        db.commit()
    return {"message": "If the account exists, password reset instructions will be sent."}


@router.post("/password-reset/confirm")
def confirm_password_reset(payload: PasswordResetConfirm, request: Request, db: Session = Depends(get_db)):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=422, detail="New passwords do not match.")
    token_hash = hashlib.sha256(payload.token.encode()).hexdigest()
    reset = db.query(PasswordReset).filter(PasswordReset.token_hash == token_hash, PasswordReset.used_at.is_(None)).first()
    if not reset or reset.expires_at <= datetime.utcnow():
        raise HTTPException(status_code=400, detail="This password reset link is invalid or expired.")
    user = db.query(User).filter(User.id == reset.user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise HTTPException(status_code=400, detail="This password reset link is invalid or expired.")
    security_settings = get_security_settings(db)
    errors = validate_password(payload.new_password, security_settings)
    if errors:
        raise HTTPException(status_code=422, detail={"message": "Password does not meet the security policy.", "errors": errors})
    now = datetime.utcnow()
    user.password_hash = get_password_hash(payload.new_password)
    user.password_changed_at = now
    user.must_change_password = False
    user.failed_login_attempts = 0
    user.locked_until = None
    user.status = "active" if user.is_active else user.status
    reset.used_at = now
    db.query(UserSession).filter(UserSession.user_id == user.id, UserSession.revoked_at.is_(None)).update({UserSession.revoked_at: now, UserSession.revoked_by: user.id})
    write_audit(db, actor_user_id=None, target_user_id=user.id, action="password.reset_completed", module="authentication", description="A password reset link was used.", request=request)
    db.commit()
    return {"message": "Password reset successfully."}
