"""
Popula uma empresa com dados de demonstracao para o dashboard.

Uso:
  python seed_company_demo.py --company-slug fortalstoree
  python seed_company_demo.py --company-email contato@empresa.com
"""

import argparse
import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
import random

from sqlalchemy import select, func

from app.database import AsyncSessionLocal
from app.models.company import Company
from app.models.client import Client
from app.models.product import Product
from app.models.order import Order, OrderItem, OrderStatus
from app.models.user import User


def money(value: str) -> Decimal:
    return Decimal(value)


async def find_company(db, slug: str | None, email: str | None) -> Company | None:
    if slug:
        result = await db.execute(select(Company).where(Company.slug == slug))
        company = result.scalar_one_or_none()
        if company:
            return company
    if email:
        result = await db.execute(select(Company).where(Company.email == email))
        return result.scalar_one_or_none()
    return None


async def seed_company_demo(company_slug: str | None, company_email: str | None):
    async with AsyncSessionLocal() as db:
        company = await find_company(db, company_slug, company_email)
        if not company:
            raise SystemExit("Empresa nao encontrada.")

        user_result = await db.execute(
            select(User).where(User.company_id == company.id).order_by(User.created_at.asc())
        )
        user = user_result.scalars().first()
        if not user:
            raise SystemExit("A empresa precisa ter pelo menos um usuario para gerar os pedidos de demonstracao.")

        orders_count = (
            await db.execute(select(func.count(Order.id)).where(Order.company_id == company.id))
        ).scalar() or 0
        if orders_count > 0:
            raise SystemExit(
                f"A empresa {company.name} ja possui {orders_count} pedido(s). "
                "Nao vou duplicar os dados de demonstracao."
            )

        clients = [
            Client(
                company_id=company.id,
                name="Mercadinho Fortaleza",
                phone="85999990001",
                email="compras@mercadinhofortaleza.com",
                status="ativo",
                responsible="Ana Souza",
                city="Fortaleza",
                state="CE",
            ),
            Client(
                company_id=company.id,
                name="Loja Brasil Center",
                phone="85999990002",
                email="contato@brasilcenter.com",
                status="ativo",
                responsible="Carlos Melo",
                city="Fortaleza",
                state="CE",
            ),
            Client(
                company_id=company.id,
                name="Atacado do Bairro",
                phone="85999990003",
                email="financeiro@atacadodobairro.com",
                status="ativo",
                responsible="Juliana Costa",
                city="Caucaia",
                state="CE",
            ),
            Client(
                company_id=company.id,
                name="Boutique Nordeste",
                phone="85999990004",
                email="pedidos@boutiquenordeste.com",
                status="potencial",
                responsible="Marcia Lima",
                city="Maracanau",
                state="CE",
            ),
        ]
        db.add_all(clients)
        await db.flush()

        products = [
            Product(company_id=company.id, name="Camisa Brasileira Premium", sku="CAM-001", category="Camisas", unit="un", min_stock=8, cost_price=money("39.90"), sale_price=money("79.90"), current_stock=48, is_active=True),
            Product(company_id=company.id, name="Short Dry Fit Azul", sku="SHO-001", category="Shorts", unit="un", min_stock=6, cost_price=money("24.50"), sale_price=money("49.90"), current_stock=36, is_active=True),
            Product(company_id=company.id, name="Tenis Runner Pro", sku="TEN-001", category="Calcados", unit="un", min_stock=4, cost_price=money("110.00"), sale_price=money("189.90"), current_stock=18, is_active=True),
            Product(company_id=company.id, name="Mochila Sport", sku="MOC-001", category="Acessorios", unit="un", min_stock=3, cost_price=money("45.00"), sale_price=money("89.90"), current_stock=14, is_active=True),
            Product(company_id=company.id, name="Garrafa Termica 750ml", sku="GAR-001", category="Acessorios", unit="un", min_stock=10, cost_price=money("18.00"), sale_price=money("39.90"), current_stock=9, is_active=True),
        ]
        db.add_all(products)
        await db.flush()

        delivered_specs = [
            (2, clients[0], [(products[0], 3), (products[1], 2)], "pix"),
            (5, clients[1], [(products[2], 1), (products[3], 1)], "cartao_credito"),
            (8, clients[2], [(products[0], 2), (products[4], 4)], "pix"),
            (11, clients[0], [(products[1], 3), (products[3], 1)], "boleto"),
            (14, clients[1], [(products[0], 1), (products[2], 1), (products[4], 2)], "pix"),
            (18, clients[2], [(products[3], 2), (products[4], 3)], "transferencia"),
            (22, clients[0], [(products[2], 1), (products[1], 1)], "dinheiro"),
            (27, clients[1], [(products[0], 4)], "cartao_debito"),
        ]

        open_specs = [
            (clients[2], [(products[0], 2), (products[1], 1)], OrderStatus.aberto),
            (clients[0], [(products[3], 1), (products[4], 2)], OrderStatus.andamento),
        ]

        now = datetime.utcnow()
        order_index = 1

        def build_order_total(items_data):
            subtotal = Decimal("0")
            order_items = []
            for product, qty in items_data:
                quantity = Decimal(str(qty))
                total = product.sale_price * quantity
                subtotal += total
                order_items.append((product, quantity, total))
            return subtotal, order_items

        for days_ago, client, items_data, payment_method in delivered_specs:
            subtotal, built_items = build_order_total(items_data)
            delivered_at = now - timedelta(days=days_ago, hours=random.randint(1, 18))
            order = Order(
                company_id=company.id,
                client_id=client.id,
                user_id=user.id,
                order_number=f"{company.slug[:3].upper()}-{1000 + order_index}",
                status=OrderStatus.entregue,
                payment_method=payment_method,
                subtotal=subtotal,
                discount=Decimal("0"),
                total=subtotal,
                delivered_at=delivered_at,
                created_at=delivered_at,
                updated_at=delivered_at,
            )
            db.add(order)
            await db.flush()

            for product, quantity, total in built_items:
                db.add(
                    OrderItem(
                        order_id=order.id,
                        product_id=product.id,
                        quantity=quantity,
                        unit_price=product.sale_price,
                        discount=Decimal("0"),
                        total=total,
                    )
                )
            order_index += 1

        for client, items_data, status in open_specs:
            subtotal, built_items = build_order_total(items_data)
            order = Order(
                company_id=company.id,
                client_id=client.id,
                user_id=user.id,
                order_number=f"{company.slug[:3].upper()}-{1000 + order_index}",
                status=status,
                payment_method="pix",
                subtotal=subtotal,
                discount=Decimal("0"),
                total=subtotal,
                created_at=now - timedelta(days=random.randint(0, 3)),
                updated_at=now - timedelta(days=random.randint(0, 2)),
            )
            db.add(order)
            await db.flush()

            for product, quantity, total in built_items:
                db.add(
                    OrderItem(
                        order_id=order.id,
                        product_id=product.id,
                        quantity=quantity,
                        unit_price=product.sale_price,
                        discount=Decimal("0"),
                        total=total,
                    )
                )
            order_index += 1

        await db.commit()

        print(f"Dados de demonstracao criados para {company.name}.")
        print("Clientes:", len(clients))
        print("Produtos:", len(products))
        print("Pedidos entregues:", len(delivered_specs))
        print("Pedidos abertos:", len(open_specs))


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--company-slug", dest="company_slug")
    parser.add_argument("--company-email", dest="company_email")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(seed_company_demo(args.company_slug, args.company_email))
