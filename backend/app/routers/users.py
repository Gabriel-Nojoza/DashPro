from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from uuid import UUID

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserListResponse
from app.auth.security import hash_password
from app.dependencies import get_current_active_user, require_company_admin, require_super_admin

router = APIRouter(prefix="/users", tags=["Usuários"])


@router.get("", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=500),
    search: Optional[str] = None,
    company_id: Optional[UUID] = None,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(User).where(User.role != "super_admin")

    if current_user.role == "company_admin":
        query = query.where(User.company_id == current_user.company_id)
    elif current_user.role == "super_admin" and company_id:
        query = query.where(User.company_id == company_id)

    if search:
        query = query.where(
            User.name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    query = query.order_by(User.name).offset((page - 1) * per_page).limit(per_page)
    users = (await db.execute(query)).scalars().all()

    return UserListResponse(
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    if payload.role == "super_admin":
        raise HTTPException(status_code=403, detail="Não é possível criar super_admin pela API")

    existing = (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    if not payload.company_id:
        raise HTTPException(status_code=400, detail="Informe a empresa do cliente")

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role="company_admin",
        company_id=payload.company_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(User).where(User.id == user_id, User.role != "super_admin")
    if current_user.role == "company_admin":
        query = query.where(User.company_id == current_user.company_id)

    user = (await db.execute(query)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    payload: UserUpdate,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(User).where(User.id == user_id, User.role != "super_admin")
    if current_user.role == "company_admin":
        query = query.where(User.company_id == current_user.company_id)

    user = (await db.execute(query)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    if "password" in update_data:
        password = update_data.pop("password")
        if password:
            user.hashed_password = hash_password(password)
    for field, value in update_data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)
    return UserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Não é possível excluir seu próprio usuário")

    user = (await db.execute(
        select(User).where(User.id == user_id, User.role != "super_admin")
    )).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    await db.delete(user)
    await db.commit()
