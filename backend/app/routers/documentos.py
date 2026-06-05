"""Documentos vinculados a obras."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from uuid import UUID
import uuid as uuid_lib

from app.database import get_db
from app.models.trabalhador import Documento
from app.models.user import User
from app.schemas.trabalhador import DocumentoResponse
from app.dependencies import get_current_active_user, require_company_admin
from app.services import storage as storage_svc

router = APIRouter(prefix="/documentos", tags=["Documentos"])


@router.get("", response_model=list[DocumentoResponse])
async def list_documentos(
    entity_type: Optional[str] = None,
    entity_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Documento).where(Documento.company_id == current_user.company_id)
    if entity_type:
        query = query.where(Documento.entity_type == entity_type)
    if entity_id:
        query = query.where(Documento.entity_id == entity_id)
    query = query.order_by(Documento.created_at.desc())
    docs = (await db.execute(query)).scalars().all()
    return [DocumentoResponse.model_validate(d) for d in docs]


@router.post("", response_model=DocumentoResponse, status_code=status.HTTP_201_CREATED)
async def upload_documento(
    entity_type: str,
    entity_id: UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(require_company_admin),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    path = f"{current_user.company_id}/{entity_type}/{entity_id}/{uuid_lib.uuid4()}.{ext}"

    file_url = await storage_svc.upload_file(path, content, file.content_type or "application/octet-stream")
    size_kb = f"{round(len(content) / 1024, 1)} KB"

    doc = Documento(
        company_id=current_user.company_id,
        entity_type=entity_type,
        entity_id=entity_id,
        name=file.filename,
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


@router.delete("/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_documento(
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
