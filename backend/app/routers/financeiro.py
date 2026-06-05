from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional
from uuid import UUID
from decimal import Decimal
from datetime import date

from app.database import get_db
from app.models.financeiro import LancamentoFinanceiro
from app.models.user import User
from app.schemas.financeiro import (
    LancamentoCreate, LancamentoUpdate,
    LancamentoResponse, LancamentoListResponse,
)
from app.dependencies import get_current_active_user, require_company_admin

router = APIRouter(prefix="/financeiro", tags=["Financeiro"])


def _serialize(l: LancamentoFinanceiro) -> LancamentoResponse:
    data = LancamentoResponse.model_validate(l)
    if l.obra:
        data.obra_name = l.obra.name
    return data


@router.get("", response_model=LancamentoListResponse)
async def list_lancamentos(
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=200),
    tipo: Optional[str] = None,
    status: Optional[str] = None,
    obra_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(LancamentoFinanceiro).options(
        selectinload(LancamentoFinanceiro.obra)
    ).where(LancamentoFinanceiro.company_id == current_user.company_id)

    if tipo:
        query = query.where(LancamentoFinanceiro.tipo == tipo)
    if status:
        query = query.where(LancamentoFinanceiro.status == status)
    if obra_id:
        query = query.where(LancamentoFinanceiro.obra_id == obra_id)

    # Totals across all (not just page)
    all_query = select(LancamentoFinanceiro).where(
        LancamentoFinanceiro.company_id == current_user.company_id
    )
    if tipo:
        all_query = all_query.where(LancamentoFinanceiro.tipo == tipo)
    if status:
        all_query = all_query.where(LancamentoFinanceiro.status == status)
    if obra_id:
        all_query = all_query.where(LancamentoFinanceiro.obra_id == obra_id)

    all_items = (await db.execute(all_query)).scalars().all()
    total_rec = sum(Decimal(str(i.value)) for i in all_items if i.tipo == "receita")
    total_desp = sum(Decimal(str(i.value)) for i in all_items if i.tipo == "despesa")

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    query = query.order_by(LancamentoFinanceiro.due_date.asc().nullslast(), LancamentoFinanceiro.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    items = (await db.execute(query)).scalars().all()

    return LancamentoListResponse(
        items=[_serialize(i) for i in items],
        total=total,
        page=page,
        per_page=per_page,
        total_receitas=total_rec,
        total_despesas=total_desp,
        saldo=total_rec - total_desp,
    )


@router.post("", response_model=LancamentoResponse, status_code=status.HTTP_201_CREATED)
async def create_lancamento(
    payload: LancamentoCreate,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    l = LancamentoFinanceiro(
        company_id=current_user.company_id,
        **payload.model_dump(),
    )
    db.add(l)
    await db.commit()
    await db.refresh(l)
    result = await db.execute(
        select(LancamentoFinanceiro).options(selectinload(LancamentoFinanceiro.obra))
        .where(LancamentoFinanceiro.id == l.id)
    )
    return _serialize(result.scalar_one())


@router.put("/{lancamento_id}", response_model=LancamentoResponse)
async def update_lancamento(
    lancamento_id: UUID,
    payload: LancamentoUpdate,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LancamentoFinanceiro).options(selectinload(LancamentoFinanceiro.obra))
        .where(LancamentoFinanceiro.id == lancamento_id, LancamentoFinanceiro.company_id == current_user.company_id)
    )
    l = result.scalar_one_or_none()
    if not l:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(l, field, value)

    await db.commit()
    await db.refresh(l)
    result = await db.execute(
        select(LancamentoFinanceiro).options(selectinload(LancamentoFinanceiro.obra))
        .where(LancamentoFinanceiro.id == l.id)
    )
    return _serialize(result.scalar_one())


@router.delete("/{lancamento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lancamento(
    lancamento_id: UUID,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    l = (await db.execute(
        select(LancamentoFinanceiro).where(
            LancamentoFinanceiro.id == lancamento_id,
            LancamentoFinanceiro.company_id == current_user.company_id,
        )
    )).scalar_one_or_none()
    if not l:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado")
    await db.delete(l)
    await db.commit()
