"""
Script para popular o banco com dados iniciais.
Execute com: python seed.py
"""

import asyncio
import uuid

from dotenv import load_dotenv
from sqlalchemy import event
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.auth.security import hash_password
from app.config import settings
from app.database import Base
from app.models.company import Company
from app.models.plan import Plan
from app.models.product import Product
from app.models.user import User

load_dotenv()


engine_options = {
    "echo": True,
    "pool_pre_ping": True,
    "poolclass": NullPool,
}

if settings.is_sqlite:
    engine_options["connect_args"] = {}
else:
    engine_options["isolation_level"] = "AUTOCOMMIT"
    engine_options["connect_args"] = {
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        "command_timeout": 60,
        "server_settings": {
            "application_name": "dashpro_seed",
        },
    }


engine = create_async_engine(settings.DATABASE_URL, **engine_options)

if settings.is_sqlite:
    @event.listens_for(engine.sync_engine, "connect")
    def _configure_sqlite(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=MEMORY")
        cursor.execute("PRAGMA synchronous=OFF")
        cursor.close()

AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def insert_ignore(model, values, index_elements):
    if settings.is_sqlite:
        return sqlite_insert(model).values(**values).on_conflict_do_nothing(index_elements=index_elements)
    return postgres_insert(model).values(**values).on_conflict_do_nothing(index_elements=index_elements)


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        plans_data = [
            dict(id=uuid.uuid4(), name="Free", slug="free", price_monthly=0, max_users=2, max_clients=20, max_products=20, has_whatsapp=False, has_reports=True, has_api=False, is_active=True),
            dict(id=uuid.uuid4(), name="Starter", slug="starter", price_monthly=49.90, max_users=5, max_clients=200, max_products=200, has_whatsapp=True, has_reports=True, has_api=False, is_active=True),
            dict(id=uuid.uuid4(), name="Professional", slug="professional", price_monthly=99.90, max_users=15, max_clients=1000, max_products=1000, has_whatsapp=True, has_reports=True, has_api=True, is_active=True),
            dict(id=uuid.uuid4(), name="Enterprise", slug="enterprise", price_monthly=249.90, max_users=9999, max_clients=9999, max_products=9999, has_whatsapp=True, has_reports=True, has_api=True, is_active=True),
        ]
        for plan_data in plans_data:
            await db.execute(insert_ignore(Plan, plan_data, ["slug"]))

        super_admin_data = dict(
            id=uuid.uuid4(),
            name="Super Admin",
            email="admin@dashpro.com",
            hashed_password=hash_password("Admin@123"),
            role="super_admin",
        )
        await db.execute(insert_ignore(User, super_admin_data, ["email"]))

        company_data = dict(
            id=uuid.uuid4(),
            name="Empresa Demo",
            slug="empresa-demo",
            email="demo@empresa.com",
            phone="(11) 99999-9999",
            plan="professional",
            status="active",
        )
        await db.execute(insert_ignore(Company, company_data, ["slug"]))

        result = await db.execute(select(Company).where(Company.slug == "empresa-demo"))
        company = result.scalar_one()

        await db.execute(
            insert_ignore(
                User,
                dict(
                    id=uuid.uuid4(),
                    name="Admin Demo",
                    email="admin@empresa.com",
                    hashed_password=hash_password("Admin@123"),
                    role="company_admin",
                    company_id=company.id,
                ),
                ["email"],
            )
        )

        await db.execute(
            insert_ignore(
                User,
                dict(
                    id=uuid.uuid4(),
                    name="Funcionario Demo",
                    email="funcionario@empresa.com",
                    hashed_password=hash_password("Admin@123"),
                    role="employee",
                    company_id=company.id,
                ),
                ["email"],
            )
        )

        result = await db.execute(select(Product).where(Product.company_id == company.id).limit(1))
        if result.scalar() is None:
            products = [
                Product(company_id=company.id, name="Notebook Dell i7", sku="NBK-001", category="Eletronicos", unit="un", min_stock=2, cost_price=3500, sale_price=4999.90, current_stock=10),
                Product(company_id=company.id, name="Mouse Sem Fio Logitech", sku="MSE-001", category="Perifericos", unit="un", min_stock=5, cost_price=80, sale_price=149.90, current_stock=25),
                Product(company_id=company.id, name="Teclado Mecanico", sku="TEC-001", category="Perifericos", unit="un", min_stock=3, cost_price=120, sale_price=249.90, current_stock=1),
                Product(company_id=company.id, name='Monitor 24" Full HD', sku="MON-001", category="Eletronicos", unit="un", min_stock=2, cost_price=700, sale_price=1199.90, current_stock=8),
                Product(company_id=company.id, name="Cadeira Gamer Pro", sku="CAD-001", category="Moveis", unit="un", min_stock=1, cost_price=600, sale_price=1099.90, current_stock=4),
            ]
            for product in products:
                db.add(product)

        await db.commit()

    print("\nSeed concluido com sucesso!")
    print("\nCredenciais de acesso:")
    print("  Super Admin:    admin@dashpro.com    / Admin@123")
    print("  Company Admin:  admin@empresa.com    / Admin@123")
    print("  Funcionario:    funcionario@empresa.com / Admin@123")
    print("\nAcesse a API em: http://localhost:8000/docs")


if __name__ == "__main__":
    asyncio.run(seed())
