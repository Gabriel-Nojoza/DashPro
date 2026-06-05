from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional
from uuid import UUID
from decimal import Decimal

from app.database import get_db
from app.models.orcamento import Orcamento, OrcamentoItem
from app.models.obra import Obra
from app.models.user import User
from app.schemas.orcamento import (
    OrcamentoCreate, OrcamentoUpdate, OrcamentoResponse, OrcamentoListResponse,
    OrcamentoItemCreate, OrcamentoItemUpdate, OrcamentoItemResponse,
)
from app.dependencies import get_current_active_user, require_company_admin

router = APIRouter(prefix="/orcamentos", tags=["Orçamentos"])


def _serialize(o: Orcamento) -> OrcamentoResponse:
    data = OrcamentoResponse.model_validate(o)
    if o.obra:
        data.obra_name = o.obra.name
    return data


@router.get("", response_model=OrcamentoListResponse)
async def list_orcamentos(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    obra_id: Optional[UUID] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Orcamento).options(
        selectinload(Orcamento.items),
        selectinload(Orcamento.obra),
    ).where(Orcamento.company_id == current_user.company_id)

    if obra_id:
        query = query.where(Orcamento.obra_id == obra_id)
    if status:
        query = query.where(Orcamento.status == status)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    query = query.order_by(Orcamento.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    orcamentos = (await db.execute(query)).scalars().all()

    return OrcamentoListResponse(
        items=[_serialize(o) for o in orcamentos],
        total=total, page=page, per_page=per_page,
    )


@router.post("", response_model=OrcamentoResponse, status_code=status.HTTP_201_CREATED)
async def create_orcamento(
    payload: OrcamentoCreate,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    obra = (await db.execute(
        select(Obra).where(Obra.id == payload.obra_id, Obra.company_id == current_user.company_id)
    )).scalar_one_or_none()
    if not obra:
        raise HTTPException(status_code=404, detail="Obra não encontrada")

    orc = Orcamento(company_id=current_user.company_id, **payload.model_dump())
    db.add(orc)
    await db.commit()
    await db.refresh(orc)

    result = await db.execute(
        select(Orcamento).options(selectinload(Orcamento.items), selectinload(Orcamento.obra))
        .where(Orcamento.id == orc.id)
    )
    return _serialize(result.scalar_one())


@router.get("/{orc_id}", response_model=OrcamentoResponse)
async def get_orcamento(
    orc_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Orcamento).options(selectinload(Orcamento.items), selectinload(Orcamento.obra))
        .where(Orcamento.id == orc_id, Orcamento.company_id == current_user.company_id)
    )
    orc = result.scalar_one_or_none()
    if not orc:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    return _serialize(orc)


@router.put("/{orc_id}", response_model=OrcamentoResponse)
async def update_orcamento(
    orc_id: UUID,
    payload: OrcamentoUpdate,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Orcamento).options(selectinload(Orcamento.items), selectinload(Orcamento.obra))
        .where(Orcamento.id == orc_id, Orcamento.company_id == current_user.company_id)
    )
    orc = result.scalar_one_or_none()
    if not orc:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(orc, field, value)

    await db.commit()
    await db.refresh(orc)
    result = await db.execute(
        select(Orcamento).options(selectinload(Orcamento.items), selectinload(Orcamento.obra))
        .where(Orcamento.id == orc.id)
    )
    return _serialize(result.scalar_one())


@router.delete("/{orc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_orcamento(
    orc_id: UUID,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    orc = (await db.execute(
        select(Orcamento).where(Orcamento.id == orc_id, Orcamento.company_id == current_user.company_id)
    )).scalar_one_or_none()
    if not orc:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    await db.delete(orc)
    await db.commit()


# ─── Items ────────────────────────────────────────────────────────────────────

async def _recalc_total(db: AsyncSession, orc_id: UUID):
    items = (await db.execute(
        select(OrcamentoItem).where(OrcamentoItem.orcamento_id == orc_id)
    )).scalars().all()
    total_prev = sum(i.total_previsto for i in items)
    total_real = sum(i.total_real for i in items)
    await db.execute(
        select(Orcamento).where(Orcamento.id == orc_id)
    )
    orc = (await db.execute(select(Orcamento).where(Orcamento.id == orc_id))).scalar_one()
    orc.total_previsto = total_prev
    orc.total_real = total_real


@router.post("/{orc_id}/items", response_model=OrcamentoItemResponse, status_code=status.HTTP_201_CREATED)
async def add_item(
    orc_id: UUID,
    payload: OrcamentoItemCreate,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    orc = (await db.execute(
        select(Orcamento).where(Orcamento.id == orc_id, Orcamento.company_id == current_user.company_id)
    )).scalar_one_or_none()
    if not orc:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")

    total_prev = Decimal(str(payload.quantity)) * Decimal(str(payload.unit_price))
    item = OrcamentoItem(
        orcamento_id=orc_id,
        description=payload.description,
        unit=payload.unit,
        order=payload.order,
        quantity=payload.quantity,
        unit_price=payload.unit_price,
        total_previsto=total_prev,
        total_real=payload.total_real,
    )
    db.add(item)
    await db.flush()
    await _recalc_total(db, orc_id)
    await db.commit()
    await db.refresh(item)
    return OrcamentoItemResponse.model_validate(item)


@router.put("/{orc_id}/items/{item_id}", response_model=OrcamentoItemResponse)
async def update_item(
    orc_id: UUID,
    item_id: UUID,
    payload: OrcamentoItemUpdate,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    item = (await db.execute(
        select(OrcamentoItem).where(OrcamentoItem.id == item_id, OrcamentoItem.orcamento_id == orc_id)
    )).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)

    qty = Decimal(str(item.quantity))
    price = Decimal(str(item.unit_price))
    item.total_previsto = qty * price

    await _recalc_total(db, orc_id)
    await db.commit()
    await db.refresh(item)
    return OrcamentoItemResponse.model_validate(item)


@router.delete("/{orc_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    orc_id: UUID,
    item_id: UUID,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    item = (await db.execute(
        select(OrcamentoItem).where(OrcamentoItem.id == item_id, OrcamentoItem.orcamento_id == orc_id)
    )).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item não encontrado")
    await db.delete(item)
    await _recalc_total(db, orc_id)
    await db.commit()
