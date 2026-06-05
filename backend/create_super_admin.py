"""
Cria ou promove um usuário para super_admin.

Uso:
  python create_super_admin.py --email admin@dashpro.com --password Admin@123 --name "Super Admin"
"""
import argparse
import asyncio
import os

from dotenv import load_dotenv
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.auth.security import hash_password
from app.config import settings
from app.database import Base
from app.models.user import User

load_dotenv()


def parse_args():
    parser = argparse.ArgumentParser(description="Cria ou promove um usuário para super_admin.")
    parser.add_argument("--name", default="Super Admin", help="Nome do usuário admin")
    parser.add_argument("--email", required=True, help="Email do usuário admin")
    parser.add_argument("--password", required=True, help="Senha do usuário admin")
    return parser.parse_args()


async def create_or_update_super_admin(name: str, email: str, password: str):
    database_url = settings.DATABASE_URL
    if not database_url:
      raise RuntimeError("DATABASE_URL não encontrada no .env")

    engine = create_async_engine(database_url, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user:
            user.name = name
            user.hashed_password = hash_password(password)
            user.role = "super_admin"
            user.company_id = None
            user.is_active = True
            action = "atualizado"
        else:
            user = User(
                name=name,
                email=email,
                hashed_password=hash_password(password),
                role="super_admin",
                company_id=None,
                is_active=True,
            )
            db.add(user)
            action = "criado"

        await db.commit()

    await engine.dispose()
    return action


async def main():
    args = parse_args()
    action = await create_or_update_super_admin(args.name, args.email, args.password)
    print(f"Super admin {action} com sucesso.")
    print(f"Email: {args.email}")


if __name__ == "__main__":
    asyncio.run(main())
