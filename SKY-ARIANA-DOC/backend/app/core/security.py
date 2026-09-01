from datetime import datetime, timedelta
from typing import Optional, Any
from jose import JWTError, jwt
import bcrypt
from fastapi.security import OAuth2PasswordBearer
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.config import settings
from app.database.session import get_db
from app.models.models import User, UserSession
from app.services.access_control import get_role_name, has_permission, normalize_role_name

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def create_access_token(subject: str | Any, expires_delta: Optional[timedelta] = None, session_id: str | None = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject)}
    if session_id:
        to_encode["sid"] = session_id
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt


def get_session_id_from_request(request: Request) -> str | None:
    """Read the opaque server-side session identifier from the bearer token."""
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.split(" ", 1)[1] if auth_header.startswith("Bearer ") else request.query_params.get("token")
    if not token:
        return None
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"]).get("sid")
    except JWTError:
        return None

def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
) -> User:
    token = None
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
    
    if not token:
        token = request.query_params.get("token")
        
    if not token:
        # Fallback to oauth2_scheme to trigger WWW-Authenticate headers
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise ValueError("Missing subject")
    except (JWTError, ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        user = db.query(User).filter(User.id == int(user_id)).first()
    except (TypeError, ValueError):
        user = None
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    now = datetime.utcnow()
    if not user.is_active or user.deleted_at or (user.status or "active") != "active":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is not active",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.locked_until and user.locked_until > now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is temporarily locked",
            headers={"WWW-Authenticate": "Bearer"},
        )

    session_identifier = payload.get("sid")
    if session_identifier:
        session = db.query(UserSession).filter(
            UserSession.session_identifier == session_identifier,
            UserSession.user_id == user.id,
        ).first()
        if session:
            if session.revoked_at is not None or session.expires_at <= now:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Session expired or revoked",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            session.last_active_at = now
            try:
                db.commit()
            except Exception:
                db.rollback()
    return user


def require_permission(permission_key: str):
    def permission_verifier(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        if not has_permission(db, current_user, permission_key):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return current_user
    return permission_verifier


def verify_role(required_roles: list[str]):
    def role_verifier(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
        current_role = get_role_name(db, current_user)
        normalized_roles = {normalize_role_name(role) for role in required_roles}
        if current_role != "Super Admin" and current_role not in normalized_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return current_user
    return role_verifier
