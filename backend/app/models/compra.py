import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Numeric, Integer, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.db_types import UUID
import enum


class RequisicaoStatus(str, enum.Enum):
    pendente = "pendente"
    aprovada = "aprovada"
    comprada = "comprada"
    recebida = "recebida"
    cancelada = "cancelada"


class Requisicao(Base):
    __tablename__ = "requisicoes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    obra_id = Column(UUID(as_uuid=True), ForeignKey("obras.id", ondelete="CASCADE"), nullable=True)

    number = Column(String(50), nullable=False)
    status = Column(String(50), default=RequisicaoStatus.pendente)
    notes = Column(Text)

    requested_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    total = Column(Numeric(14, 2), default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    items = relationship("RequisicaoItem", back_populates="requisicao", cascade="all, delete-orphan")
    obra = relationship("Obra", foreign_keys=[obra_id])
    requested_by = relationship("User", foreign_keys=[requested_by_id])
    approved_by = relationship("User", foreign_keys=[approved_by_id])


class RequisicaoItem(Base):
    __tablename__ = "requisicao_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    requisicao_id = Column(UUID(as_uuid=True), ForeignKey("requisicoes.id", ondelete="CASCADE"), nullable=False)

    description = Column(String(255), nullable=False)
    unit = Column(String(20), default="un")
    quantity = Column(Numeric(12, 3), default=0)
    unit_price = Column(Numeric(12, 2), default=0)
    total = Column(Numeric(14, 2), default=0)
    notes = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    requisicao = relationship("Requisicao", back_populates="items")
