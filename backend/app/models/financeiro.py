import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Numeric, func, Date
from sqlalchemy.orm import relationship
from app.database import Base
from app.db_types import UUID
import enum


class LancamentoTipo(str, enum.Enum):
    receita = "receita"
    despesa = "despesa"


class LancamentoStatus(str, enum.Enum):
    pendente = "pendente"
    pago = "pago"
    vencido = "vencido"
    cancelado = "cancelado"


CATEGORIAS_RECEITA = ["medicao", "adiantamento", "reajuste", "outros"]
CATEGORIAS_DESPESA = ["material", "mao_de_obra", "equipamento", "subempreiteiro", "administrativo", "imposto", "outros"]


class LancamentoFinanceiro(Base):
    __tablename__ = "lancamentos_financeiros"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    obra_id = Column(UUID(as_uuid=True), ForeignKey("obras.id", ondelete="SET NULL"), nullable=True)

    tipo = Column(String(20), nullable=False)          # receita | despesa
    categoria = Column(String(50), nullable=False)
    description = Column(String(255), nullable=False)
    value = Column(Numeric(14, 2), nullable=False)
    status = Column(String(20), default=LancamentoStatus.pendente)

    due_date = Column(Date, nullable=True)
    paid_date = Column(Date, nullable=True)
    notes = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    obra = relationship("Obra", foreign_keys=[obra_id])
