from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional
from uuid import UUID

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserListResponse
from app.auth.security import hash_password
from app.dependencies import get_current_active_user, require_company_admin, require_supervisor_or_admin

router = APIRouter(prefix="/users", tags=["Usuários"])


def _serialize_user(u: User) -> UserResponse:
    data = UserResponse.model_validate(u)
    if u.supervisor:
        data.supervisor_name = u.supervisor.name
    return data


@router.get("", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=500),
    search: Optional[str] = None,
    company_id: Optional[UUID] = None,
    current_user: User = Depends(require_supervisor_or_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(User).options(selectinload(User.supervisor))

    # Never show super_admin users in the list
    query = query.where(User.role != "super_admin")

    if current_user.role == "supervisor":
        query = query.where(User.supervisor_id == current_user.id)
    elif current_user.role == "company_admin":
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
    result = await db.execute(query)
    users = result.scalars().all()

    return UserListResponse(
        items=[_serialize_user(u) for u in users],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    current_user: User = Depends(require_supervisor_or_admin),
    db: AsyncSession = Depends(get_db),
):
    existing = (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")

    if current_user.role == "supervisor":
        # Supervisor can only create employees assigned to themselves
        if payload.role not in ("employee",):
            raise HTTPException(status_code=403, detail="Supervisor só pode criar funcionários")
        company_id = current_user.company_id
        supervisor_id = current_user.id
    elif current_user.role == "company_admin":
        if payload.role == "super_admin":
            raise HTTPException(status_code=403, detail="Não é possível criar super_admin")
        company_id = current_user.company_id
        supervisor_id = payload.supervisor_id
    else:
        # super_admin
        company_id = payload.company_id
        if payload.role != "super_admin" and not company_id:
            raise HTTPException(status_code=400, detail="Informe a empresa para este usuário")
        supervisor_id = payload.supervisor_id

    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        company_id=company_id,
        supervisor_id=supervisor_id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    result = await db.execute(
        select(User).options(selectinload(User.supervisor)).where(User.id == user.id)
    )
    user = result.scalar_one()
    return _serialize_user(user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    current_user: User = Depends(require_supervisor_or_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(User).options(selectinload(User.supervisor)).where(User.id == user_id)
    if current_user.role == "supervisor":
        query = query.where(User.supervisor_id == current_user.id)
    elif current_user.role == "company_admin":
        query = query.where(User.company_id == current_user.company_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return _serialize_user(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    payload: UserUpdate,
    current_user: User = Depends(require_supervisor_or_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(User).options(selectinload(User.supervisor)).where(User.id == user_id)
    if current_user.role == "supervisor":
        query = query.where(User.supervisor_id == current_user.id)
    elif current_user.role == "company_admin":
        query = query.where(User.company_id == current_user.company_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if current_user.role == "supervisor" and payload.role and payload.role != "employee":
        raise HTTPException(status_code=403, detail="Supervisor não pode alterar o perfil")

    update_data = payload.model_dump(exclude_unset=True)
    if "password" in update_data:
        password = update_data.pop("password")
        if password:
            user.hashed_password = hash_password(password)
    for field, value in update_data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)

    result = await db.execute(
        select(User).options(selectinload(User.supervisor)).where(User.id == user.id)
    )
    user = result.scalar_one()
    return _serialize_user(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    current_user: User = Depends(require_supervisor_or_admin),
    db: AsyncSession = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Não é possível excluir seu próprio usuário")

    query = select(User).where(User.id == user_id)
    if current_user.role == "supervisor":
        query = query.where(User.supervisor_id == current_user.id)
    elif current_user.role == "company_admin":
        query = query.where(User.company_id == current_user.company_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    await db.delete(user)
    await db.commit()
