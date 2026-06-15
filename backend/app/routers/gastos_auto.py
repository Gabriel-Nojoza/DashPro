from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from uuid import UUID
from decimal import Decimal

from app.database import get_db
from app.models.gasto_auto import GastoAuto
from app.models.veiculo import Veiculo
from app.models.user import User
from app.schemas.gasto_auto import GastoAutoCreate, GastoAutoUpdate, GastoAutoResponse, GastoAutoListResponse
from app.dependencies import get_current_active_user, require_company_admin

router = APIRouter(prefix="/gastos-auto", tags=["Financeiro Auto"])


def _company_id(current_user: User) -> UUID:
    if current_user.role == "super_admin":
        raise HTTPException(status_code=400, detail="super_admin não possui empresa")
    return current_user.company_id


def _serialize(g: GastoAuto, veiculo: Veiculo | None = None) -> GastoAutoResponse:
    data = GastoAutoResponse.model_validate(g)
    if veiculo:
        data.veiculo_nome = f"{veiculo.marca} {veiculo.modelo} {g.veiculo.ano_modelo}" if g.veiculo else None
    elif g.veiculo:
        data.veiculo_nome = f"{g.veiculo.marca} {g.veiculo.modelo} {g.veiculo.ano_modelo}"
    return data


@router.get("", response_model=GastoAutoListResponse)
async def list_gastos(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=200),
    tipo: Optional[str] = None,
    categoria: Optional[str] = None,
    veiculo_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    company_id = _company_id(current_user)
    base = select(GastoAuto).where(GastoAuto.company_id == company_id)

    if tipo:
        base = base.where(GastoAuto.tipo == tipo)
    if categoria:
        base = base.where(GastoAuto.categoria == categoria)
    if veiculo_id:
        base = base.where(GastoAuto.veiculo_id == veiculo_id)

    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar()

    # Totais do filtro atual
    tot_q = select(
        func.coalesce(func.sum(GastoAuto.valor).filter(GastoAuto.tipo == "entrada"), 0),
        func.coalesce(func.sum(GastoAuto.valor).filter(GastoAuto.tipo == "saida"), 0),
    ).where(GastoAuto.company_id == company_id)
    if tipo:
        tot_q = tot_q.where(GastoAuto.tipo == tipo)
    if categoria:
        tot_q = tot_q.where(GastoAuto.categoria == categoria)
    if veiculo_id:
        tot_q = tot_q.where(GastoAuto.veiculo_id == veiculo_id)

    row = (await db.execute(tot_q)).one()
    total_entradas = Decimal(str(row[0]))
    total_saidas = Decimal(str(row[1]))

    query = base.order_by(GastoAuto.data.desc()).offset((page - 1) * per_page).limit(per_page)
    items = (await db.execute(query)).scalars().all()

    return GastoAutoListResponse(
        items=[_serialize(g) for g in items],
        total=total,
        page=page,
        per_page=per_page,
        total_entradas=total_entradas,
        total_saidas=total_saidas,
        saldo=total_entradas - total_saidas,
    )


@router.post("", response_model=GastoAutoResponse, status_code=status.HTTP_201_CREATED)
async def create_gasto(
    payload: GastoAutoCreate,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    company_id = _company_id(current_user)
    gasto = GastoAuto(**payload.model_dump(), company_id=company_id)
    db.add(gasto)
    await db.commit()
    await db.refresh(gasto)
    return _serialize(gasto)


@router.put("/{gasto_id}", response_model=GastoAutoResponse)
async def update_gasto(
    gasto_id: UUID,
    payload: GastoAutoUpdate,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    company_id = _company_id(current_user)
    g = (await db.execute(
        select(GastoAuto).where(GastoAuto.id == gasto_id, GastoAuto.company_id == company_id)
    )).scalar_one_or_none()
    if not g:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(g, field, value)

    await db.commit()
    await db.refresh(g)
    return _serialize(g)


@router.delete("/{gasto_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_gasto(
    gasto_id: UUID,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    company_id = _company_id(current_user)
    g = (await db.execute(
        select(GastoAuto).where(GastoAuto.id == gasto_id, GastoAuto.company_id == company_id)
    )).scalar_one_or_none()
    if not g:
        raise HTTPException(status_code=404, detail="Lançamento não encontrado")

    await db.delete(g)
    await db.commit()
