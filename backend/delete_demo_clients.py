"""
Remove os clientes fictícios inseridos pelo seed.
Execute com: python delete_demo_clients.py
"""
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select, delete as sa_delete
from app.models.client import Client
from app.models.company import Company

DATABASE_URL = os.getenv("DATABASE_URL", "")
for prefix in ("postgresql://", "postgres://"):
    if DATABASE_URL.startswith(prefix):
        DATABASE_URL = "postgresql+asyncpg://" + DATABASE_URL[len(prefix):]
        break

from sqlalchemy.pool import NullPool
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    poolclass=NullPool,
    isolation_level="AUTOCOMMIT",
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    },
)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

DEMO_NAMES = {"João Silva", "Maria Souza", "Carlos Ferreira", "Ana Costa", "Pedro Alves"}


async def run():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Client).where(Client.name.in_(DEMO_NAMES))
        )
        clients = result.scalars().all()

        if not clients:
            print("Nenhum cliente fictício encontrado.")
            return

        for c in clients:
            print(f"  Removendo: {c.name} ({c.email})")
            await db.delete(c)

        await db.commit()
        print(f"\n{len(clients)} cliente(s) removido(s) com sucesso.")


if __name__ == "__main__":
    asyncio.run(run())
