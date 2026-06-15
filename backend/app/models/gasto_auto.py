import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Numeric, Date, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.db_types import UUID


class GastoAuto(Base):
    __tablename__ = "gastos_auto"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    veiculo_id = Column(UUID(as_uuid=True), ForeignKey("veiculos.id", ondelete="SET NULL"), nullable=True, index=True)

    tipo = Column(String(10), nullable=False)          # entrada | saida
    categoria = Column(String(50), nullable=False)      # mecanico, pecas, pintura, documentacao, combustivel, seguro, venda, outros
    descricao = Column(String(255), nullable=False)
    valor = Column(Numeric(12, 2), nullable=False)
    data = Column(Date, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    company = relationship("Company", backref="gastos_auto")
    veiculo = relationship("Veiculo", backref="gastos")
