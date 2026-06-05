"""
Remove todos os dados fictícios de uma empresa (produtos, estoque, pedidos, clientes).
Mantém a empresa e os usuários intactos.

Uso:
  python clear_company_data.py                        # lista as empresas
  python clear_company_data.py --company "Empresa Demo"
  python clear_company_data.py --all                  # limpa todas as empresas
"""
import asyncio
import argparse
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select, delete
from sqlalchemy.pool import NullPool
from app.config import settings
from app.models.company import Company
from app.models.client import Client
from app.models.product import Product
from app.models.order import Order, OrderItem
from app.models.stock import StockMovement

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    poolclass=NullPool,
    connect_args={"statement_cache_size": 0, "prepared_statement_cache_size": 0},
)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def clear_company(db: AsyncSession, company: Company):
    print(f"\n🏢 Limpando: {company.name}")

    # 1. Order items (depende de orders e products)
    order_ids = (await db.execute(
        select(Order.id).where(Order.company_id == company.id)
    )).scalars().all()

    if order_ids:
        deleted = (await db.execute(
            delete(OrderItem).where(OrderItem.order_id.in_(order_ids))
        )).rowcount
        print(f"   ✓ {deleted} itens de pedido removidos")

    # 2. Stock movements
    deleted = (await db.execute(
        delete(StockMovement).where(StockMovement.company_id == company.id)
    )).rowcount
    print(f"   ✓ {deleted} movimentos de estoque removidos")

    # 3. Orders
    deleted = (await db.execute(
        delete(Order).where(Order.company_id == company.id)
    )).rowcount
    print(f"   ✓ {deleted} pedidos removidos")

    # 4. Clients
    deleted = (await db.execute(
        delete(Client).where(Client.company_id == company.id)
    )).rowcount
    print(f"   ✓ {deleted} clientes removidos")

    # 5. Products
    deleted = (await db.execute(
        delete(Product).where(Product.company_id == company.id)
    )).rowcount
    print(f"   ✓ {deleted} produtos removidos")

    await db.commit()
    print(f"   ✅ Concluído!")


async def run(company_name: str = None, all_companies: bool = False):
    async with SessionLocal() as db:
        result = await db.execute(select(Company).order_by(Company.name))
        companies = result.scalars().all()

        if not companies:
            print("Nenhuma empresa encontrada.")
            return

        if not company_name and not all_companies:
            print("\nEmpresas disponíveis:")
            for c in companies:
                print(f"  - {c.name}")
            print("\nUso:")
            print('  python clear_company_data.py --company "Nome da Empresa"')
            print("  python clear_company_data.py --all")
            return

        targets = companies if all_companies else [
            c for c in companies if c.name.lower() == company_name.lower()
        ]

        if not targets:
            print(f'Empresa "{company_name}" não encontrada.')
            return

        for company in targets:
            await clear_company(db, company)

    await engine.dispose()
    print("\nDone.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--company", help="Nome da empresa para limpar")
    parser.add_argument("--all", action="store_true", help="Limpa todas as empresas")
    args = parser.parse_args()
    asyncio.run(run(args.company, args.all))
