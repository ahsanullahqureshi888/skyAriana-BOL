from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database import get_db
from backend.models import User
from backend.services.auth import hash_password
from backend.services.crud import serialize_record

router = APIRouter(tags=["users"])


@router.get("")
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return {"success": True, "data": [serialize_record(user) for user in users], "source": "python-fastapi"}


@router.post("")
async def create_user(body: dict, db: AsyncSession = Depends(get_db)):
    username = str(body.get("username") or "").strip()
    password = str(body.get("password") or "admin").strip()
    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
    result = await db.execute(select(User).where(User.username == username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Username already exists")
    user = User(
        username=username,
        display_name=str(body.get("display_name") or username),
        role=str(body.get("role") or "user"),
        password_hash=hash_password(password),
        is_active=1 if body.get("is_active", True) else 0,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return {"success": True, "data": serialize_record(user), "source": "python-fastapi"}


@router.put("/{user_id}")
async def update_user(user_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    for key in ("display_name", "role"):
        if key in body:
            setattr(user, key, str(body.get(key) or ""))
    if "is_active" in body:
        user.is_active = 1 if body.get("is_active") else 0
    if body.get("password"):
        user.password_hash = hash_password(str(body["password"]))
    await db.commit()
    await db.refresh(user)
    return {"success": True, "data": serialize_record(user), "source": "python-fastapi"}


@router.delete("/{user_id}")
async def delete_user(user_id: str, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()
    return {"success": True, "data": {"id": user_id}, "source": "python-fastapi"}

