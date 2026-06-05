from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional
from uuid import UUID

from app.database import get_db
from app.models.obra import Obra, EtapaObra
from app.models.user import User
from app.schemas.obra import (
    ObraCreate, ObraUpdate, ObraResponse, ObraListResponse,
    EtapaCreate, EtapaUpdate, EtapaResponse,
)
from app.dependencies import get_current_active_user, require_company_admin

router = APIRouter(prefix="/obras", tags=["Obras"])


def _calc_progress(etapas) -> int:
    if not etapas:
        return 0
    return round(sum(e.progress for e in etapas) / len(etapas))


def _serialize(obra: Obra) -> ObraResponse:
    data = ObraResponse.model_validate(obra)
    data.progress = _calc_progress(obra.etapas)
    if obra.responsible:
        data.responsible_name = obra.responsible.name
    return data


@router.get("", response_model=ObraListResponse)
async def list_obras(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Obra).options(
        selectinload(Obra.etapas),
        selectinload(Obra.responsible),
    ).where(Obra.company_id == current_user.company_id)

    if status:
        query = query.where(Obra.status == status)
    if search:
        query = query.where(Obra.name.ilike(f"%{search}%") | Obra.client_name.ilike(f"%{search}%"))

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    query = query.order_by(Obra.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    obras = (await db.execute(query)).scalars().all()

    return ObraListResponse(
        items=[_serialize(o) for o in obras],
        total=total, page=page, per_page=per_page,
    )


@router.post("", response_model=ObraResponse, status_code=status.HTTP_201_CREATED)
async def create_obra(
    payload: ObraCreate,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    obra = Obra(company_id=current_user.company_id, **payload.model_dump())
    db.add(obra)
    await db.commit()
    await db.refresh(obra)
    result = await db.execute(
        select(Obra).options(selectinload(Obra.etapas), selectinload(Obra.responsible))
        .where(Obra.id == obra.id)
    )
    return _serialize(result.scalar_one())


@router.get("/{obra_id}", response_model=ObraResponse)
async def get_obra(
    obra_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Obra).options(selectinload(Obra.etapas), selectinload(Obra.responsible))
        .where(Obra.id == obra_id, Obra.company_id == current_user.company_id)
    )
    obra = result.scalar_one_or_none()
    if not obra:
        raise HTTPException(status_code=404, detail="Obra não encontrada")
    return _serialize(obra)


@router.put("/{obra_id}", response_model=ObraResponse)
async def update_obra(
    obra_id: UUID,
    payload: ObraUpdate,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Obra).options(selectinload(Obra.etapas), selectinload(Obra.responsible))
        .where(Obra.id == obra_id, Obra.company_id == current_user.company_id)
    )
    obra = result.scalar_one_or_none()
    if not obra:
        raise HTTPException(status_code=404, detail="Obra não encontrada")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(obra, field, value)

    await db.commit()
    await db.refresh(obra)
    result = await db.execute(
        select(Obra).options(selectinload(Obra.etapas), selectinload(Obra.responsible))
        .where(Obra.id == obra.id)
    )
    return _serialize(result.scalar_one())


@router.delete("/{obra_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_obra(
    obra_id: UUID,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Obra).where(Obra.id == obra_id, Obra.company_id == current_user.company_id)
    )
    obra = result.scalar_one_or_none()
    if not obra:
        raise HTTPException(status_code=404, detail="Obra não encontrada")
    await db.delete(obra)
    await db.commit()


# ─── Etapas ──────────────────────────────────────────────────────────────────

@router.post("/{obra_id}/etapas", response_model=EtapaResponse, status_code=status.HTTP_201_CREATED)
async def create_etapa(
    obra_id: UUID,
    payload: EtapaCreate,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    obra = (await db.execute(
        select(Obra).where(Obra.id == obra_id, Obra.company_id == current_user.company_id)
    )).scalar_one_or_none()
    if not obra:
        raise HTTPException(status_code=404, detail="Obra não encontrada")

    etapa = EtapaObra(obra_id=obra_id, **payload.model_dump())
    db.add(etapa)
    await db.commit()
    await db.refresh(etapa)
    return EtapaResponse.model_validate(etapa)


@router.put("/{obra_id}/etapas/{etapa_id}", response_model=EtapaResponse)
async def update_etapa(
    obra_id: UUID,
    etapa_id: UUID,
    payload: EtapaUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    etapa = (await db.execute(
        select(EtapaObra).where(EtapaObra.id == etapa_id, EtapaObra.obra_id == obra_id)
    )).scalar_one_or_none()
    if not etapa:
        raise HTTPException(status_code=404, detail="Etapa não encontrada")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(etapa, field, value)

    await db.commit()
    await db.refresh(etapa)
    return EtapaResponse.model_validate(etapa)


@router.delete("/{obra_id}/etapas/{etapa_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_etapa(
    obra_id: UUID,
    etapa_id: UUID,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    etapa = (await db.execute(
        select(EtapaObra).where(EtapaObra.id == etapa_id, EtapaObra.obra_id == obra_id)
    )).scalar_one_or_none()
    if not etapa:
        raise HTTPException(status_code=404, detail="Etapa não encontrada")
    await db.delete(etapa)
    await db.commit()
