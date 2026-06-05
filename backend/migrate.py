"""
Executa migrações pendentes no banco de dados.
Uso: python migrate.py
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.config import settings


async def run():
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES users(id) ON DELETE SET NULL"
        ))
        print("✓ Coluna supervisor_id adicionada (ou já existia).")

        await conn.execute(text(
            "ALTER TABLE companies ADD COLUMN IF NOT EXISTS ramo VARCHAR(50) DEFAULT 'comercio'"
        ))
        print("✓ Coluna ramo adicionada (ou já existia).")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
