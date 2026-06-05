import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Numeric, Integer, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.db_types import UUID
import enum


class OrcamentoStatus(str, enum.Enum):
    rascunho = "rascunho"
    aprovado = "aprovado"
    em_execucao = "em_execucao"
    concluido = "concluido"
    cancelado = "cancelado"


class Orcamento(Base):
    __tablename__ = "orcamentos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    obra_id = Column(UUID(as_uuid=True), ForeignKey("obras.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(String(50), default=OrcamentoStatus.rascunho)

    total_previsto = Column(Numeric(14, 2), default=0)
    total_real = Column(Numeric(14, 2), default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    items = relationship("OrcamentoItem", back_populates="orcamento", cascade="all, delete-orphan", order_by="OrcamentoItem.order")
    obra = relationship("Obra", foreign_keys=[obra_id])


class OrcamentoItem(Base):
    __tablename__ = "orcamento_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    orcamento_id = Column(UUID(as_uuid=True), ForeignKey("orcamentos.id", ondelete="CASCADE"), nullable=False)

    description = Column(String(255), nullable=False)
    unit = Column(String(20), default="un")   # m², m³, kg, un, vb, etc.
    order = Column(Integer, default=0)

    quantity = Column(Numeric(12, 3), default=0)
    unit_price = Column(Numeric(12, 2), default=0)
    total_previsto = Column(Numeric(14, 2), default=0)
    total_real = Column(Numeric(14, 2), default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    orcamento = relationship("Orcamento", back_populates="items")
