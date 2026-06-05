import uuid
from sqlalchemy import Column, String, Boolean, Text, DateTime, Enum, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.db_types import UUID, JSONB
import enum


class PlanType(str, enum.Enum):
    free = "free"
    starter = "starter"
    professional = "professional"
    enterprise = "enterprise"


class CompanyStatus(str, enum.Enum):
    active = "active"
    suspended = "suspended"
    cancelled = "cancelled"
    trial = "trial"


class CompanyRamo(str, enum.Enum):
    comercio = "comercio"
    construcao = "construcao"
    servicos = "servicos"


class Company(Base):
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(20))
    cnpj = Column(String(20))
    address = Column(Text)
    logo_url = Column(Text)
    plan = Column(String(50), default=PlanType.free)
    status = Column(String(50), default=CompanyStatus.trial)
    ramo = Column(String(50), default=CompanyRamo.comercio)
    trial_ends_at = Column(DateTime(timezone=True))
    settings = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    users = relationship("User", back_populates="company", lazy="selectin")
    clients = relationship("Client", back_populates="company")
    products = relationship("Product", back_populates="company")
    orders = relationship("Order", back_populates="company")
    whatsapp_settings = relationship("WhatsappSettings", back_populates="company", uselist=False)
