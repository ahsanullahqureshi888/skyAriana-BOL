"""FastAPI Security Dependencies for Role-Based Access Control (RBAC).

Provides:
- get_current_user: verifies Bearer token, session validity, and user state.
- require_permission(permission_key): blocks requests lacking the specified permission.
- require_role(roles): blocks requests from unlisted roles.
"""

from __future__ import annotations

import logging
from typing import Callable, List, Optional

from fastapi import Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.models.system import UserModel
from backend.services.auth_service import read_sessions, verify_signed_token
from backend.services.rbac_service import check_permission

logger = logging.getLogger("aq_companies.security")


async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> UserModel:
    """Extract and validate Bearer token, ensuring active session and user account."""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing. Please provide 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization format. Format must be 'Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = parts[1]
    payload = verify_signed_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session token invalid or expired. Please re-authenticate.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_id = payload.get("jti")
    user_id = payload.get("sub")

    # Verify session is still active in session store
    sessions = read_sessions()
    session_data = sessions.get(token_id)
    if not session_data or not session_data.get("active", True):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been revoked or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Fetch user from database
    result = await db.execute(select(UserModel).where(UserModel.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        # Fallback by username if ID changed during migration
        username = payload.get("username")
        result = await db.execute(select(UserModel).where(UserModel.username == username))
        user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account associated with this session no longer exists.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated. Contact your administrator.",
        )

    return user


async def get_optional_user(
    request: Request,
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
) -> Optional[UserModel]:
    """Soft authentication for endpoints where auth is optional."""
    if not authorization:
        return None
    try:
        return await get_current_user(request, authorization, db)
    except HTTPException:
        return None


def require_permission(permission_key: str) -> Callable:
    """Dependency factory enforcing that the authenticated user possesses the permission."""
    async def _dependency(current_user: UserModel = Depends(get_current_user)) -> UserModel:
        if not check_permission(current_user.role, permission_key):
            logger.warning(
                f"Access denied for user '{current_user.username}' (role: {current_user.role}). "
                f"Required permission: '{permission_key}'."
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires '{permission_key}' permission.",
            )
        return current_user

    return _dependency


def require_role(allowed_roles: List[str]) -> Callable:
    """Dependency factory enforcing that the authenticated user has one of the allowed roles."""
    roles_lower = [r.lower() for r in allowed_roles]

    async def _dependency(current_user: UserModel = Depends(get_current_user)) -> UserModel:
        if current_user.role.lower() not in roles_lower and current_user.role.lower() != "superadmin":
            logger.warning(
                f"Access denied for user '{current_user.username}' (role: {current_user.role}). "
                f"Allowed roles: {allowed_roles}."
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of {allowed_roles} roles.",
            )
        return current_user

    return _dependency
