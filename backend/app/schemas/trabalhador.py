from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class TrabalhadorCreate(BaseModel):
    name: str
    cargo: str = "Pedreiro"
    cpf: Optional[str] = None
    phone: Optional[str] = None
    obra_id: Optional[UUID] = None
    status: str = "ativo"
    notes: Optional[str] = None


class TrabalhadorUpdate(BaseModel):
    name: Optional[str] = None
    cargo: Optional[str] = None
    cpf: Optional[str] = None
    phone: Optional[str] = None
    obra_id: Optional[UUID] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class TrabalhadorResponse(BaseModel):
    id: UUID
    company_id: UUID
    obra_id: Optional[UUID] = None
    obra_name: Optional[str] = None
    name: str
    cargo: str
    cpf: Optional[str] = None
    phone: Optional[str] = None
    status: str
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TrabalhadorListResponse(BaseModel):
    items: List[TrabalhadorResponse]
    total: int
    page: int
    per_page: int


class DocumentoResponse(BaseModel):
    id: UUID
    company_id: UUID
    entity_type: str
    entity_id: Optional[UUID] = None
    name: str
    category: Optional[str] = None
    file_url: str
    file_type: Optional[str] = None
    file_size: Optional[str] = None
    expires_at: Optional[str] = None
    uploaded_by_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
