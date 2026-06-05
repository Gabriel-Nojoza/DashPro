from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional
from uuid import UUID
import uuid as uuid_lib

from app.database import get_db
from app.models.trabalhador import Trabalhador, Documento
from app.models.user import User
from app.schemas.trabalhador import (
    TrabalhadorCreate, TrabalhadorUpdate, TrabalhadorResponse, TrabalhadorListResponse,
    DocumentoResponse,
)
from app.dependencies import get_current_active_user, require_company_admin
from app.services import storage as storage_svc

router = APIRouter(prefix="/trabalhadores", tags=["Equipe de Obra"])


def _serialize(t: Trabalhador) -> TrabalhadorResponse:
    data = TrabalhadorResponse.model_validate(t)
    if t.obra:
        data.obra_name = t.obra.name
    return data


# ─── Trabalhadores ─────────────────────────────────────────────────────────────

@router.get("", response_model=TrabalhadorListResponse)
async def list_trabalhadores(
    page: int = Query(1, ge=1),
    per_page: int = Query(30, ge=1, le=200),
    obra_id: Optional[UUID] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Trabalhador).options(selectinload(Trabalhador.obra)) \
        .where(Trabalhador.company_id == current_user.company_id)

    if obra_id:
        query = query.where(Trabalhador.obra_id == obra_id)
    if status:
        query = query.where(Trabalhador.status == status)
    if search:
        query = query.where(Trabalhador.name.ilike(f"%{search}%"))

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    query = query.order_by(Trabalhador.name).offset((page - 1) * per_page).limit(per_page)
    items = (await db.execute(query)).scalars().all()

    return TrabalhadorListResponse(
        items=[_serialize(t) for t in items],
        total=total, page=page, per_page=per_page,
    )


@router.post("", response_model=TrabalhadorResponse, status_code=status.HTTP_201_CREATED)
async def create_trabalhador(
    payload: TrabalhadorCreate,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    t = Trabalhador(company_id=current_user.company_id, **payload.model_dump())
    db.add(t)
    await db.commit()
    await db.refresh(t)
    return _serialize(t)


@router.put("/{trab_id}", response_model=TrabalhadorResponse)
async def update_trabalhador(
    trab_id: UUID,
    payload: TrabalhadorUpdate,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    t = (await db.execute(
        select(Trabalhador).where(Trabalhador.id == trab_id, Trabalhador.company_id == current_user.company_id)
    )).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Trabalhador não encontrado")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(t, field, value)
    await db.commit()
    await db.refresh(t)
    return _serialize(t)


@router.delete("/{trab_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trabalhador(
    trab_id: UUID,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    t = (await db.execute(
        select(Trabalhador).where(Trabalhador.id == trab_id, Trabalhador.company_id == current_user.company_id)
    )).scalar_one_or_none()
    if not t:
        raise HTTPException(status_code=404, detail="Trabalhador não encontrado")
    await db.delete(t)
    await db.commit()


# ─── Documentos ────────────────────────────────────────────────────────────────

@router.get("/{trab_id}/documentos", response_model=list[DocumentoResponse])
async def list_documentos_trabalhador(
    trab_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    docs = (await db.execute(
        select(Documento).where(
            Documento.entity_type == "trabalhador",
            Documento.entity_id == trab_id,
            Documento.company_id == current_user.company_id,
        ).order_by(Documento.created_at.desc())
    )).scalars().all()
    return [DocumentoResponse.model_validate(d) for d in docs]


@router.post("/{trab_id}/documentos", response_model=DocumentoResponse, status_code=status.HTTP_201_CREATED)
async def upload_documento_trabalhador(
    trab_id: UUID,
    file: UploadFile = File(...),
    category: Optional[str] = Form(None),
    expires_at: Optional[str] = Form(None),
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    path = f"{current_user.company_id}/trabalhadores/{trab_id}/{uuid_lib.uuid4()}.{ext}"

    file_url = await storage_svc.upload_file(path, content, file.content_type or "application/octet-stream")
    size_kb = f"{round(len(content) / 1024, 1)} KB"

    doc = Documento(
        company_id=current_user.company_id,
        entity_type="trabalhador",
        entity_id=trab_id,
        name=file.filename,
        category=category,
        expires_at=expires_at,
        file_url=file_url,
        file_type=file.content_type,
        file_size=size_kb,
        storage_path=path,
        uploaded_by_id=current_user.id,
        uploaded_by_name=current_user.name,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    return DocumentoResponse.model_validate(doc)


@router.delete("/{trab_id}/documentos/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_documento(
    trab_id: UUID,
    doc_id: UUID,
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    doc = (await db.execute(
        select(Documento).where(Documento.id == doc_id, Documento.company_id == current_user.company_id)
    )).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    if doc.storage_path:
        await storage_svc.delete_file(doc.storage_path)
    await db.delete(doc)
    await db.commit()
