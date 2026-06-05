import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.db_types import UUID
import enum


class ClientStatus(str, enum.Enum):
    active = "ativo"
    potential = "potencial"
    inactive = "inativo"


class Client(Base):
    __tablename__ = "clients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    phone = Column(String(30))
    email = Column(String(255))
    cpf_cnpj = Column(String(20))
    status = Column(String(50), default=ClientStatus.active)
    notes = Column(Text)
    last_contact = Column(DateTime(timezone=True))
    next_contact = Column(DateTime(timezone=True))
    responsible = Column(String(255))
    address = Column(Text)
    city = Column(String(100))
    state = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company = relationship("Company", back_populates="clients")
    orders = relationship("Order", back_populates="client")
