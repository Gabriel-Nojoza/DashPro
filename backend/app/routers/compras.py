from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional
from uuid import UUID
from decimal import Decimal

from app.database import get_db
from app.models.compra import Requisicao, RequisicaoItem
from app.models.user import User
from app.schemas.compra import (
    RequisicaoCreate, RequisicaoUpdate, RequisicaoResponse, RequisicaoListResponse,
    RequisicaoItemCreate, RequisicaoItemUpdate, RequisicaoItemResponse,
)
from app.dependencies import get_current_active_user, require_company_admin

router = APIRouter(prefix="/compras", tags=["Compras"])


def _serialize(r: Requisicao) -> RequisicaoResponse:
    data = RequisicaoResponse.model_validate(r)
    if r.obra:
        data.obra_name = r.obra.name
    if r.requested_by:
        data.requested_by_name = r.requested_by.name
    if r.approved_by:
        data.approved_by_name = r.approved_by.name
    return data


async def _next_number(db: AsyncSession, company_id: UUID) -> str:
    count = (await db.execute(
        select(func.count()).where(Requisicao.company_id == company_id)
    )).scalar() or 0
    return f"REQ-{str(count + 1).zfill(4)}"


def _recalc(items) -> Decimal:
    return sum(Decimal(str(i.total)) for i in items)


@router.get("", response_model=RequisicaoListResponse)
async def list_requisicoes(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    obra_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Requisicao).options(
        selectinload(Requisicao.items),
        selectinload(Requisicao.obra),
        selectinload(Requisicao.requested_by),
        selectinload(Requisicao.approved_by),
    ).where(Requisicao.company_id == current_user.company_id)

    if status:
        query = query.where(Requisicao.status == status)
    if obra_id:
        query = query.where(Requisicao.obra_id == obra_id)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    query = query.order_by(Requisicao.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    reqs = (await db.execute(query)).scalars().all()

    return RequisicaoListResponse(
        items=[_serialize(r) for r in reqs],
        total=total, page=page, per_page=per_page,
    )


@router.post("", response_model=RequisicaoResponse, status_code=status.HTTP_201_CREATED)
async def create_requisicao(
    payload: RequisicaoCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    number = await _next_number(db, current_user.company_id)
    req = Requisicao(
        company_id=current_user.company_id,
        obra_id=payload.obra_id,
        number=number,
        notes=payload.notes,
        requested_by_id=current_user.id,
    )
    db.add(req)
    await db.flush()

    total = Decimal("0")
    for i, item_data in enumerate(payload.items):
        item_total = Decimal(str(item_data.quantity)) * Decimal(str(item_data.unit_price))
        item = RequisicaoItem(
            requisicao_id=req.id,
            description=item_data.description,
            unit=item_data.unit,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            total=item_total,
            notes=item_data.notes,
        )
        db.add(item)
        total += item_total

    req.total = total
    await db.commit()
    await db.refresh(req)

    result = await db.execute(
        select(Requisicao).options(
            selectinload(Requisicao.items),
            selectinload(Requisicao.obra),
            selectinload(Requisicao.requested_by),
            selectinload(Requisicao.approved_by),
        ).where(Requisicao.id == req.id)
    )
    return _serialize(result.scalar_one())


@router.get("/{req_id}", response_model=RequisicaoResponse)
async def get_requisicao(
    req_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Requisicao).options(
            selectinload(Requisicao.items),
            selectinload(Requisicao.obra),
            selectinload(Requisicao.requested_by),
            selectinload(Requisicao.approved_by),
        ).where(Requisicao.id == req_id, Requisicao.company_id == current_user.company_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Requisição não encontrada")
    return _serialize(req)


@router.patch("/{req_id}/status", response_model=RequisicaoResponse)
async def update_status(
    req_id: UUID,
    payload: RequisicaoUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Requisicao).options(
            selectinload(Requisicao.items),
            selectinload(Requisicao.obra),
            selectinload(Requisicao.requested_by),
            selectinload(Requisicao.approved_by),
        ).where(Requisicao.id == req_id, Requisicao.company_id == current_user.company_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Requisição não encontrada")

    if payload.status:
        req.status = payload.status
        if payload.status == "aprovada" and not req.approved_by_id:
            req.approved_by_id = current_user.id
    if payload.notes is not None:
        req.notes = payload.notes

    await db.commit()
    await db.refresh(req)
    result = await db.execute(
        select(Requisicao).options(
            selectinload(Requisicao.items),
            selectinload(Requisicao.obra),
            selectinload(Requisicao.requested_by),
            selectinload(Requisicao.approved_by),
        ).where(Requisicao.id == req.id)
    )
    return _serialize(result.scalar_one())


@router.delete("/{req_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_requisicao(
    req_id: UUID,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    req = (await db.execute(
        select(Requisicao).where(Requisicao.id == req_id, Requisicao.company_id == current_user.company_id)
    )).scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Requisição não encontrada")
    await db.delete(req)
    await db.commit()


@router.post("/{req_id}/items", response_model=RequisicaoItemResponse, status_code=status.HTTP_201_CREATED)
async def add_item(
    req_id: UUID,
    payload: RequisicaoItemCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    req = (await db.execute(
        select(Requisicao).where(Requisicao.id == req_id, Requisicao.company_id == current_user.company_id)
    )).scalar_one_or_none()
    if not req:
        raise HTTPException(status_code=404, detail="Requisição não encontrada")

    item_total = Decimal(str(payload.quantity)) * Decimal(str(payload.unit_price))
    item = RequisicaoItem(
        requisicao_id=req_id,
        description=payload.description,
        unit=payload.unit,
        quantity=payload.quantity,
        unit_price=payload.unit_price,
        total=item_total,
        notes=payload.notes,
    )
    db.add(item)
    await db.flush()

    all_items = (await db.execute(
        select(RequisicaoItem).where(RequisicaoItem.requisicao_id == req_id)
    )).scalars().all()
    req.total = _recalc(all_items)

    await db.commit()
    await db.refresh(item)
    return RequisicaoItemResponse.model_validate(item)


@router.delete("/{req_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    req_id: UUID,
    item_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    item = (await db.execute(
        select(RequisicaoItem).where(RequisicaoItem.id == item_id, RequisicaoItem.requisicao_id == req_id)
    )).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    await db.delete(item)
    await db.flush()

    req = (await db.execute(select(Requisicao).where(Requisicao.id == req_id))).scalar_one()
    all_items = (await db.execute(
        select(RequisicaoItem).where(RequisicaoItem.requisicao_id == req_id)
    )).scalars().all()
    req.total = _recalc(all_items)
    await db.commit()
