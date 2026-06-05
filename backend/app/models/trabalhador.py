import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.db_types import UUID


CARGOS = [
    "Mestre de Obras",
    "Pedreiro",
    "Servente",
    "Eletricista",
    "Encanador",
    "Carpinteiro",
    "Armador",
    "Pintor",
    "Azulejista",
    "Gesseiro",
    "Soldador",
    "Operador de Máquinas",
    "Motorista",
    "Vigia",
    "Outro",
]


class Trabalhador(Base):
    __tablename__ = "trabalhadores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    obra_id = Column(UUID(as_uuid=True), ForeignKey("obras.id", ondelete="SET NULL"), nullable=True)

    name = Column(String(255), nullable=False)
    cpf = Column(String(20))
    phone = Column(String(20))
    cargo = Column(String(100), nullable=False, default="Pedreiro")
    status = Column(String(20), default="ativo")  # ativo, afastado, inativo
    notes = Column(Text)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    obra = relationship("Obra", foreign_keys=[obra_id])
    documentos = relationship("Documento", back_populates="trabalhador",
                              primaryjoin="and_(Documento.entity_type=='trabalhador', "
                                          "foreign(Documento.entity_id)==Trabalhador.id)",
                              viewonly=True)


class Documento(Base):
    __tablename__ = "documentos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)

    entity_type = Column(String(50), nullable=False)  # trabalhador | obra | empresa
    entity_id = Column(UUID(as_uuid=True), nullable=True)

    name = Column(String(255), nullable=False)
    category = Column(String(100))          # aso, ctps, nr18, ficha_epi, etc.
    file_url = Column(Text, nullable=False)
    file_type = Column(String(100))
    file_size = Column(String(20))
    storage_path = Column(Text)
    expires_at = Column(String(20))         # data de validade (string YYYY-MM-DD)

    uploaded_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    uploaded_by_name = Column(String(255))

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    trabalhador = relationship(
        "Trabalhador",
        primaryjoin="and_(Documento.entity_type=='trabalhador', "
                    "foreign(Documento.entity_id)==Trabalhador.id)",
        viewonly=True,
    )
