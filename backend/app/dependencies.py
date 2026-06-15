from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError
from typing import Optional
from uuid import UUID

from app.database import get_db
from app.auth.security import decode_token
from app.models.user import User
from app.schemas.auth import UserTokenData

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido ou expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(credentials.credentials)
        user_id: str = payload.get("sub")
        if not user_id:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == UUID(user_id), User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise credentials_exception
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Usuário inativo")
    return current_user


def require_roles(*roles: str):
    async def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissão insuficiente para esta operação",
            )
        return current_user
    return role_checker


require_super_admin = require_roles("super_admin")
require_company_admin = require_roles("super_admin", "company_admin")
require_supervisor_or_admin = require_roles("super_admin", "company_admin")
require_any = require_roles("super_admin", "company_admin")


def get_company_id(current_user: User = Depends(get_current_active_user)) -> Optional[UUID]:
    if current_user.role == "super_admin":
        return None
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Usuário sem empresa associada")
    return current_user.company_id
