from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from uuid import UUID

from app.database import get_db
from app.models.veiculo import Veiculo
from app.models.user import User
from app.schemas.veiculo import VeiculoCreate, VeiculoUpdate, VeiculoResponse, VeiculoListResponse
from app.dependencies import get_current_active_user, require_company_admin
from app.services.storage import upload_vehicle_photo, delete_vehicle_photo

router = APIRouter(prefix="/veiculos", tags=["Veículos"])


def _company_id(current_user: User) -> UUID:
    if current_user.role == "super_admin":
        raise HTTPException(status_code=400, detail="super_admin não possui empresa")
    return current_user.company_id


@router.get("", response_model=VeiculoListResponse)
async def list_veiculos(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=200),
    status: Optional[str] = None,
    tipo: Optional[str] = None,
    search: Optional[str] = None,
    include_sold: bool = Query(False),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    company_id = _company_id(current_user)
    query = select(Veiculo).where(Veiculo.company_id == company_id, Veiculo.is_active == True)

    if status:
        query = query.where(Veiculo.status == status)
    elif not include_sold:
        query = query.where(Veiculo.status != "vendido")
    if tipo:
        query = query.where(Veiculo.tipo == tipo)
    if search:
        term = f"%{search}%"
        query = query.where(
            Veiculo.marca.ilike(term) | Veiculo.modelo.ilike(term) | Veiculo.placa.ilike(term)
        )

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    query = query.order_by(Veiculo.created_at.desc()).offset((page - 1) * per_page).limit(per_page)
    items = (await db.execute(query)).scalars().all()

    return VeiculoListResponse(items=items, total=total, page=page, per_page=per_page)


@router.post("", response_model=VeiculoResponse, status_code=status.HTTP_201_CREATED)
async def create_veiculo(
    payload: VeiculoCreate,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    company_id = _company_id(current_user)
    veiculo = Veiculo(**payload.model_dump(), company_id=company_id)
    db.add(veiculo)
    await db.commit()
    await db.refresh(veiculo)
    return veiculo


@router.get("/{veiculo_id}", response_model=VeiculoResponse)
async def get_veiculo(
    veiculo_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    company_id = _company_id(current_user)
    v = (await db.execute(
        select(Veiculo).where(Veiculo.id == veiculo_id, Veiculo.company_id == company_id)
    )).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")
    return v


@router.put("/{veiculo_id}", response_model=VeiculoResponse)
async def update_veiculo(
    veiculo_id: UUID,
    payload: VeiculoUpdate,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    company_id = _company_id(current_user)
    v = (await db.execute(
        select(Veiculo).where(Veiculo.id == veiculo_id, Veiculo.company_id == company_id)
    )).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(v, field, value)

    await db.commit()
    await db.refresh(v)
    return v


@router.delete("/{veiculo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_veiculo(
    veiculo_id: UUID,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    company_id = _company_id(current_user)
    v = (await db.execute(
        select(Veiculo).where(Veiculo.id == veiculo_id, Veiculo.company_id == company_id)
    )).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")

    await db.delete(v)
    await db.commit()


@router.post("/{veiculo_id}/fotos", response_model=VeiculoResponse)
async def upload_foto(
    veiculo_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    company_id = _company_id(current_user)
    v = (await db.execute(
        select(Veiculo).where(Veiculo.id == veiculo_id, Veiculo.company_id == company_id)
    )).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")

    content = await file.read()
    url = await upload_vehicle_photo(
        str(company_id), str(veiculo_id),
        content, file.content_type or "image/jpeg", file.filename or "foto.jpg"
    )

    v.fotos = list(v.fotos or []) + [url]
    await db.commit()
    await db.refresh(v)
    return VeiculoResponse.model_validate(v)


@router.delete("/{veiculo_id}/fotos/{foto_index}", response_model=VeiculoResponse)
async def delete_foto(
    veiculo_id: UUID,
    foto_index: int,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    company_id = _company_id(current_user)
    v = (await db.execute(
        select(Veiculo).where(Veiculo.id == veiculo_id, Veiculo.company_id == company_id)
    )).scalar_one_or_none()
    if not v:
        raise HTTPException(status_code=404, detail="Veículo não encontrado")

    fotos = list(v.fotos or [])
    if foto_index < 0 or foto_index >= len(fotos):
        raise HTTPException(status_code=404, detail="Foto não encontrada")

    url = fotos.pop(foto_index)
    try:
        await delete_vehicle_photo(url)
    except Exception:
        pass

    v.fotos = fotos
    await db.commit()
    await db.refresh(v)
    return VeiculoResponse.model_validate(v)
