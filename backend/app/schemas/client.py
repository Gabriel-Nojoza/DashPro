from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime


class ClientCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    status: str = "ativo"
    notes: Optional[str] = None
    last_contact: Optional[datetime] = None
    next_contact: Optional[datetime] = None
    responsible: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None


class ClientUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    last_contact: Optional[datetime] = None
    next_contact: Optional[datetime] = None
    responsible: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None


class ClientResponse(BaseModel):
    id: UUID
    company_id: UUID
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    cpf_cnpj: Optional[str] = None
    status: str
    notes: Optional[str] = None
    last_contact: Optional[datetime] = None
    next_contact: Optional[datetime] = None
    responsible: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ClientListResponse(BaseModel):
    items: list[ClientResponse]
    total: int
    page: int
    per_page: int
