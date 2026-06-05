from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.message import MessageUsage, MessageCredit
from app.models.company import Company
from app.models.plan import Plan

PLAN_LIMITS = {
    "conecta":      {"max_messages": 500,   "extra_msg_price": Decimal("0.25")},
    "gestao":       {"max_messages": 1500,  "extra_msg_price": Decimal("0.20")},
    "automacao":    {"max_messages": 3000,  "extra_msg_price": Decimal("0.18")},
    "inteligencia": {"max_messages": 10000, "extra_msg_price": Decimal("0.00")},
}


async def _get_or_create_usage(company_id: UUID, db: AsyncSession) -> MessageUsage:
    now = datetime.now(timezone.utc)
    year, month = now.year, now.month

    result = await db.execute(
        select(MessageUsage).where(
            MessageUsage.company_id == company_id,
            MessageUsage.year == year,
            MessageUsage.month == month,
        )
    )
    usage = result.scalar_one_or_none()

    if not usage:
        company = (await db.execute(select(Company).where(Company.id == company_id))).scalar_one_or_none()
        plan_cfg = PLAN_LIMITS.get(company.plan if company else "conecta", PLAN_LIMITS["conecta"])

        usage = MessageUsage(
            company_id=company_id,
            year=year,
            month=month,
            count=0,
            extra_credits=0,
            plan_limit=plan_cfg["max_messages"],
            extra_msg_price=plan_cfg["extra_msg_price"],
        )
        db.add(usage)
        await db.flush()

    return usage


async def increment_message(company_id: UUID, db: AsyncSession) -> dict:
    """
    Increment message count for the current month.
    Returns status dict with usage info and notification flags.
    """
    usage = await _get_or_create_usage(company_id, db)
    usage.count += 1

    notify_80 = False
    notify_100 = False

    pct = usage.pct_used
    if pct >= 100 and not usage.notified_100:
        usage.notified_100 = True
        notify_100 = True
    elif pct >= 80 and not usage.notified_80:
        usage.notified_80 = True
        notify_80 = True

    await db.commit()
    await db.refresh(usage)

    return {
        "count": usage.count,
        "total_limit": usage.total_limit,
        "remaining": usage.remaining,
        "pct_used": usage.pct_used,
        "is_over_limit": usage.is_over_limit,
        "notify_80": notify_80,
        "notify_100": notify_100,
        "extra_cost": usage.extra_cost,
    }


async def get_usage(company_id: UUID, db: AsyncSession) -> dict:
    usage = await _get_or_create_usage(company_id, db)
    await db.commit()
    return _usage_to_dict(usage)


async def get_all_usage(db: AsyncSession) -> list[dict]:
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(MessageUsage).where(
            MessageUsage.year == now.year,
            MessageUsage.month == now.month,
        )
    )
    return [_usage_to_dict(u) for u in result.scalars().all()]


async def add_credits(
    company_id: UUID,
    amount: int,
    reason: str,
    added_by_id: UUID,
    db: AsyncSession,
) -> dict:
    usage = await _get_or_create_usage(company_id, db)
    price = usage.extra_msg_price
    total = price * amount

    credit = MessageCredit(
        company_id=company_id,
        usage_id=usage.id,
        amount=amount,
        price_per_msg=price,
        total_value=total,
        reason=reason,
        added_by_id=added_by_id,
    )
    db.add(credit)
    usage.extra_credits += amount
    usage.notified_100 = False

    await db.commit()
    await db.refresh(usage)
    return _usage_to_dict(usage)


def _usage_to_dict(usage: MessageUsage) -> dict:
    return {
        "id": str(usage.id),
        "company_id": str(usage.company_id),
        "year": usage.year,
        "month": usage.month,
        "count": usage.count,
        "plan_limit": usage.plan_limit,
        "extra_credits": usage.extra_credits,
        "total_limit": usage.total_limit,
        "remaining": usage.remaining,
        "pct_used": usage.pct_used,
        "is_over_limit": usage.is_over_limit,
        "extra_msgs_used": usage.extra_msgs_used,
        "extra_cost": round(usage.extra_cost, 2),
        "extra_msg_price": float(usage.extra_msg_price),
        "notified_80": usage.notified_80,
        "notified_100": usage.notified_100,
    }
