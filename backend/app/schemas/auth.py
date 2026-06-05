from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "UserTokenData"


class UserTokenData(BaseModel):
    id: UUID
    name: str
    email: str
    role: str
    company_id: Optional[UUID] = None
    company_name: Optional[str] = None
    company_ramo: Optional[str] = "comercio"

    class Config:
        from_attributes = True


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


TokenResponse.model_rebuild()
