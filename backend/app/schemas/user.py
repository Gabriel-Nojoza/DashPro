from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "company_admin"
    company_id: Optional[UUID] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    avatar_url: Optional[str] = None


class UserResponse(BaseModel):
    id: UUID
    name: str
    email: str
    role: str
    company_id: Optional[UUID] = None
    is_active: bool
    avatar_url: Optional[str] = None
    last_login: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    items: list[UserResponse]
    total: int
    page: int
    per_page: int
