import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Numeric, Integer, Boolean, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.db_types import UUID, JSONB


class Veiculo(Base):
    __tablename__ = "veiculos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)

    marca = Column(String(100), nullable=False)
    modelo = Column(String(100), nullable=False)
    ano_fabricacao = Column(Integer, nullable=False)
    ano_modelo = Column(Integer, nullable=False)
    cor = Column(String(50))
    km = Column(Integer, default=0)
    placa = Column(String(20))
    combustivel = Column(String(30), default="flex")   # flex, gasolina, etanol, diesel, eletrico, hibrido
    transmissao = Column(String(20), default="manual")  # manual, automatico, cvt
    tipo = Column(String(30), default="hatch")          # hatch, sedan, suv, pickup, van, caminhao, moto, outro

    preco_custo = Column(Numeric(12, 2), default=0)
    preco_venda = Column(Numeric(12, 2), nullable=False)

    status = Column(String(20), default="disponivel")   # disponivel, reservado, vendido
    descricao = Column(Text)
    fotos = Column(JSONB, default=list)
    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    company = relationship("Company", backref="veiculos")
