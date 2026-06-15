from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional
from uuid import UUID

from app.database import get_db
from app.models.client import Client
from app.models.user import User
from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse, ClientListResponse
from app.dependencies import get_current_active_user, require_company_admin, get_company_id
from app.services.plan_limits import check_client_limit

router = APIRouter(prefix="/clients", tags=["Clientes"])


@router.get("", response_model=ClientListResponse)
async def list_clients(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    company_id = current_user.company_id
    if not company_id and current_user.role != "super_admin":
        return ClientListResponse(items=[], total=0, page=page, per_page=per_page)

    query = select(Client)
    if company_id:
        query = query.where(Client.company_id == company_id)
    if search:
        query = query.where(
            or_(
                Client.name.ilike(f"%{search}%"),
                Client.email.ilike(f"%{search}%"),
                Client.phone.ilike(f"%{search}%"),
            )
        )
    if status:
        query = query.where(Client.status == status)

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.order_by(Client.name).offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    clients = result.scalars().all()

    return ClientListResponse(
        items=[ClientResponse.model_validate(c) for c in clients],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    payload: ClientCreate,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Empresa não identificada")

    await check_client_limit(current_user.company_id, db)

    client = Client(**payload.model_dump(), company_id=current_user.company_id)
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return ClientResponse.model_validate(client)


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Client).where(Client.id == client_id)
    if current_user.company_id:
        query = query.where(Client.company_id == current_user.company_id)
    result = await db.execute(query)
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return ClientResponse.model_validate(client)


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: UUID,
    payload: ClientUpdate,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(Client).where(Client.id == client_id)
    if current_user.company_id:
        query = query.where(Client.company_id == current_user.company_id)
    result = await db.execute(query)
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(client, field, value)

    await db.commit()
    await db.refresh(client)
    return ClientResponse.model_validate(client)


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: UUID,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(Client).where(Client.id == client_id)
    if current_user.company_id:
        query = query.where(Client.company_id == current_user.company_id)
    result = await db.execute(query)
    client = result.scalar_one_or_none()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    await db.delete(client)
    await db.commit()
