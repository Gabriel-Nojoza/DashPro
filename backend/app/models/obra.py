import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Numeric, Integer, func, Date
from sqlalchemy.orm import relationship
from app.database import Base
from app.db_types import UUID
import enum


class ObraStatus(str, enum.Enum):
    planejamento = "planejamento"
    em_andamento = "em_andamento"
    concluida = "concluida"
    pausada = "pausada"
    cancelada = "cancelada"


class EtapaStatus(str, enum.Enum):
    pendente = "pendente"
    em_andamento = "em_andamento"
    concluida = "concluida"


class Obra(Base):
    __tablename__ = "obras"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    responsible_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    name = Column(String(255), nullable=False)
    client_name = Column(String(255))
    address = Column(Text)
    description = Column(Text)

    contract_value = Column(Numeric(14, 2), default=0)
    status = Column(String(50), default=ObraStatus.planejamento)

    start_date = Column(Date)
    end_date = Column(Date)
    actual_start_date = Column(Date)
    actual_end_date = Column(Date)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    etapas = relationship("EtapaObra", back_populates="obra", cascade="all, delete-orphan", order_by="EtapaObra.order")
    responsible = relationship("User", foreign_keys=[responsible_id])


class EtapaObra(Base):
    __tablename__ = "etapas_obra"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    obra_id = Column(UUID(as_uuid=True), ForeignKey("obras.id", ondelete="CASCADE"), nullable=False)

    name = Column(String(255), nullable=False)
    order = Column(Integer, default=0)
    progress = Column(Integer, default=0)  # 0-100
    status = Column(String(50), default=EtapaStatus.pendente)
    start_date = Column(Date)
    end_date = Column(Date)
    notes = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    obra = relationship("Obra", back_populates="etapas")
