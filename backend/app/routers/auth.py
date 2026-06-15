from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta

from app.database import get_db
from app.models.user import User
from app.models.log import Log
from app.schemas.auth import LoginRequest, TokenResponse, UserTokenData, ChangePasswordRequest
from app.auth.security import verify_password, hash_password, create_access_token
from app.dependencies import get_current_active_user
from app.config import settings
from app.limiter import limiter

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(payload: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User)
        .options(selectinload(User.company))
        .where(User.email == payload.email)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Usuário inativo")

    token_data = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "company_id": str(user.company_id) if user.company_id else None,
    }
    access_token = create_access_token(token_data)

    await db.execute(
        update(User).where(User.id == user.id).values(last_login=datetime.utcnow())
    )

    log = Log(
        company_id=user.company_id,
        user_id=user.id,
        action="login",
        entity="user",
        entity_id=str(user.id),
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    db.add(log)
    await db.commit()

    company_name = None
    company_ramo = "comercio"
    company_features = None
    if user.company:
        company_name = user.company.name
        company_ramo = user.company.ramo or "comercio"
        company_features = (user.company.settings or {}).get("features")

    return TokenResponse(
        access_token=access_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserTokenData(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            company_id=user.company_id,
            company_name=company_name,
            company_ramo=company_ramo,
            company_features=company_features,
        ),
    )


@router.get("/me", response_model=UserTokenData)
async def get_me(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from app.models.company import Company
    company_name = None
    company_ramo = "comercio"
    company_features = None
    if current_user.company_id:
        result = await db.execute(select(Company).where(Company.id == current_user.company_id))
        company = result.scalar_one_or_none()
        if company:
            company_name = company.name
            company_ramo = company.ramo or "comercio"
            company_features = (company.settings or {}).get("features")
    return UserTokenData(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        company_id=current_user.company_id,
        company_name=company_name,
        company_ramo=company_ramo,
        company_features=company_features,
    )


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")

    await db.execute(
        update(User)
        .where(User.id == current_user.id)
        .values(hashed_password=hash_password(payload.new_password))
    )
    await db.commit()
    return {"message": "Senha alterada com sucesso"}


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_active_user)):
    return {"message": "Logout realizado com sucesso"}
