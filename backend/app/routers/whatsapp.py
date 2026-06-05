from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_any, require_super_admin, get_current_active_user
from app.models.company import Company
from app.models.user import User
from app.models.whatsapp import WhatsappSettings
from app.services import message_usage as usage_svc
from app.schemas.whatsapp import (
    WhatsappAdminCompanyStatus,
    WhatsappAdminOverviewResponse,
    WhatsappAdminOverviewSummary,
    WhatsappBotContactsResponse,
    WhatsappBotGroupsResponse,
    WhatsappBotQrResponse,
    WhatsappBotStatusResponse,
    WhatsappMessageRequest,
    WhatsappSettingsResponse,
    WhatsappSettingsUpdate,
)
from app.services import whatsapp as wa_service

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])


def _require_company_scope(current_user: User) -> UUID:
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Usuario sem empresa vinculada")
    return current_user.company_id


def _get_whatsapp_target(settings: WhatsappSettings | None) -> str | None:
    if not settings:
        return None
    return settings.group_id or settings.phone_number


async def _get_or_create_settings(company_id: UUID, db: AsyncSession) -> WhatsappSettings:
    result = await db.execute(
        select(WhatsappSettings).where(WhatsappSettings.company_id == company_id)
    )
    settings = result.scalar_one_or_none()
    if not settings:
        settings = WhatsappSettings(company_id=company_id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


def _build_company_bot_status(
    company: Company,
    settings: WhatsappSettings | None,
    bot_status: dict,
    joined_groups: dict[str, dict],
) -> WhatsappAdminCompanyStatus:
    group_info = joined_groups.get(settings.group_id) if settings and settings.group_id else None

    if not settings:
        company_bot_status = "unconfigured"
        company_bot_message = "Sem configuracao de WhatsApp"
    elif not settings.is_active:
        company_bot_status = "inactive"
        company_bot_message = "Integracao desativada para esta empresa"
    elif not settings.group_id and not settings.phone_number:
        company_bot_status = "unconfigured"
        company_bot_message = "Sem destino configurado"
    elif not bot_status.get("reachable"):
        company_bot_status = "attention"
        company_bot_message = "Bot indisponivel"
    elif not bot_status.get("connected"):
        company_bot_status = "attention"
        company_bot_message = "Bot desconectado do WhatsApp"
    elif settings.group_id and not group_info:
        company_bot_status = "attention"
        company_bot_message = "Bot nao esta no grupo configurado"
    elif settings.group_id:
        company_bot_status = "online"
        company_bot_message = f"Ativo no grupo {group_info.get('subject') or settings.group_id}"
    else:
        company_bot_status = "online"
        company_bot_message = "Ativo para envio ao numero configurado"

    return WhatsappAdminCompanyStatus(
        company_id=company.id,
        company_name=company.name,
        company_slug=company.slug,
        company_status=company.status,
        plan=company.plan,
        whatsapp_active=bool(settings.is_active) if settings else False,
        phone_number=settings.phone_number if settings else None,
        group_id=settings.group_id if settings else None,
        send_daily_report=bool(settings.send_daily_report) if settings else False,
        send_low_stock_alert=bool(settings.send_low_stock_alert) if settings else False,
        send_order_delivered=bool(settings.send_order_delivered) if settings else False,
        bot_connected=bool(bot_status.get("connected")),
        bot_group_found=bool(group_info),
        bot_group_name=group_info.get("subject") if group_info else None,
        bot_status=company_bot_status,
        bot_message=company_bot_message,
    )


@router.get("/admin/overview", response_model=WhatsappAdminOverviewResponse)
async def get_admin_overview(
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Company, WhatsappSettings)
        .outerjoin(WhatsappSettings, WhatsappSettings.company_id == Company.id)
        .order_by(Company.name)
    )
    rows = result.all()

    bot_status = wa_service.check_pdf_bot_status()
    joined_groups = {
        group.get("id"): group
        for group in bot_status.get("joined_groups", [])
        if isinstance(group, dict) and group.get("id")
    }

    companies: list[WhatsappAdminCompanyStatus] = []
    summary = {
        "total_companies": 0,
        "online_companies": 0,
        "attention_companies": 0,
        "inactive_companies": 0,
        "unconfigured_companies": 0,
    }

    for company, settings in rows:
        company_status = _build_company_bot_status(company, settings, bot_status, joined_groups)
        companies.append(company_status)
        summary["total_companies"] += 1
        if company_status.bot_status == "online":
            summary["online_companies"] += 1
        elif company_status.bot_status == "inactive":
            summary["inactive_companies"] += 1
        elif company_status.bot_status == "unconfigured":
            summary["unconfigured_companies"] += 1
        else:
            summary["attention_companies"] += 1

    raw_data = bot_status.get("data") or {}
    return WhatsappAdminOverviewResponse(
        bot_reachable=bool(bot_status.get("reachable")),
        bot_connected=bool(bot_status.get("connected")),
        bot_message=bot_status.get("message") or "Bot PDF indisponivel",
        bot_checked_at=datetime.now(timezone.utc),
        configured_groups=len(bot_status.get("configured_groups", [])),
        joined_groups=len(joined_groups),
        uptime_seconds=raw_data.get("uptimeSeconds"),
        last_connected_at=raw_data.get("lastConnectedAt"),
        last_disconnected_at=raw_data.get("lastDisconnectedAt"),
        summary=WhatsappAdminOverviewSummary(**summary),
        companies=companies,
    )


@router.get("/settings", response_model=WhatsappSettingsResponse)
async def get_settings(
    current_user: User = Depends(require_any),
    db: AsyncSession = Depends(get_db),
):
    settings = await _get_or_create_settings(_require_company_scope(current_user), db)
    return WhatsappSettingsResponse.model_validate(settings)


@router.put("/settings", response_model=WhatsappSettingsResponse)
async def update_settings(
    payload: WhatsappSettingsUpdate,
    current_user: User = Depends(require_any),
    db: AsyncSession = Depends(get_db),
):
    settings = await _get_or_create_settings(_require_company_scope(current_user), db)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(settings, field, value)
    await db.commit()
    await db.refresh(settings)
    return WhatsappSettingsResponse.model_validate(settings)


@router.get("/bot/status", response_model=WhatsappBotStatusResponse)
async def get_bot_status(current_user: User = Depends(require_any)):
    bot_status = wa_service.check_pdf_bot_status()
    return WhatsappBotStatusResponse(
        reachable=bot_status.get("reachable", False),
        connected=bot_status.get("connected", False),
        state=bot_status.get("state"),
        message=bot_status.get("message") or "Bot PDF indisponivel",
        qr_available=bot_status.get("qr_available", False),
        qr_code=bot_status.get("qr_code"),
        qr_ascii=bot_status.get("qr_ascii"),
        last_qr_at=bot_status.get("data", {}).get("lastQrAt") if isinstance(bot_status.get("data"), dict) else None,
        contact_count=bot_status.get("contact_count", 0),
    )


@router.get("/bot/qr", response_model=WhatsappBotQrResponse)
async def get_bot_qr(current_user: User = Depends(require_any)):
    bot_qr = wa_service.get_pdf_bot_qr()
    return WhatsappBotQrResponse(
        reachable=bot_qr.get("reachable", False),
        connected=bot_qr.get("connected", False),
        state=bot_qr.get("state"),
        available=bot_qr.get("available", False),
        message=bot_qr.get("message") or "QR indisponivel no momento",
        qr_code=bot_qr.get("qr_code"),
        qr_ascii=bot_qr.get("qr_ascii"),
        last_qr_at=bot_qr.get("last_qr_at"),
    )


@router.get("/bot/groups", response_model=WhatsappBotGroupsResponse)
async def get_bot_groups(current_user: User = Depends(require_any)):
    groups = wa_service.get_pdf_bot_groups()
    return WhatsappBotGroupsResponse(
        reachable=groups.get("reachable", False),
        connected=groups.get("connected", False),
        count=groups.get("count", 0),
        items=groups.get("items", []),
    )


@router.get("/bot/contacts", response_model=WhatsappBotContactsResponse)
async def get_bot_contacts(
    search: str | None = Query(None, min_length=1),
    current_user: User = Depends(require_any),
):
    contacts = wa_service.get_pdf_bot_contacts(search=search)
    return WhatsappBotContactsResponse(
        reachable=contacts.get("reachable", False),
        connected=contacts.get("connected", False),
        count=contacts.get("count", 0),
        items=contacts.get("items", []),
    )


@router.post("/test")
async def test_connection(
    current_user: User = Depends(require_any),
    db: AsyncSession = Depends(get_db),
):
    settings = await _get_or_create_settings(_require_company_scope(current_user), db)
    target = _get_whatsapp_target(settings)
    if not target:
        raise HTTPException(status_code=400, detail="Numero ou grupo de destino nao configurado")

    success = wa_service.send_pdf_bot_message(target, "Teste de conexao - DashPro Business")
    if not success:
        raise HTTPException(status_code=503, detail="Falha ao enviar mensagem de teste")

    return {"message": "Mensagem de teste enviada com sucesso"}


@router.post("/status")
async def check_status(current_user: User = Depends(require_any)):
    bot_status = wa_service.check_pdf_bot_status()
    return {
        "connected": bot_status.get("connected", False),
        "message": bot_status.get("message") or "Bot indisponivel",
        "state": bot_status.get("state"),
        "reachable": bot_status.get("reachable", False),
        "qrAvailable": bot_status.get("qr_available", False),
    }


@router.post("/send")
async def send_message(
    payload: WhatsappMessageRequest,
    current_user: User = Depends(require_any),
    db: AsyncSession = Depends(get_db),
):
    company_id = _require_company_scope(current_user)
    settings = await _get_or_create_settings(company_id, db)
    if not settings.is_active:
        raise HTTPException(status_code=400, detail="WhatsApp nao configurado ou inativo")

    info = await usage_svc.increment_message(company_id, db)
    success = wa_service.send_pdf_bot_message(payload.phone, payload.message)
    if not success:
        raise HTTPException(status_code=503, detail="Falha ao enviar mensagem")

    response = {"message": "Mensagem enviada com sucesso", "usage": info}
    if info["notify_100"]:
        response["alert"] = "limite_atingido"
    elif info["notify_80"]:
        response["alert"] = "limite_80"
    return response


# ─── Usage & Credits ─────────────────────────────────────────────────────────

@router.get("/usage/me")
async def get_my_usage(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.company_id:
        raise HTTPException(status_code=400, detail="Sem empresa vinculada")
    return await usage_svc.get_usage(current_user.company_id, db)


@router.get("/usage/all")
async def get_all_usage(
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    return await usage_svc.get_all_usage(db)


@router.get("/usage/{company_id}")
async def get_company_usage(
    company_id: UUID,
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    return await usage_svc.get_usage(company_id, db)


@router.post("/credits/{company_id}")
async def add_credits(
    company_id: UUID,
    amount: int = Query(..., ge=1, le=50000),
    reason: str = Query("Crédito adicional aprovado pelo administrador"),
    current_user: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await usage_svc.add_credits(
        company_id=company_id,
        amount=amount,
        reason=reason,
        added_by_id=current_user.id,
        db=db,
    )
    return result


@router.post("/send-report")
async def send_daily_report(
    current_user: User = Depends(require_any),
    db: AsyncSession = Depends(get_db),
):
    company_id = _require_company_scope(current_user)
    settings = await _get_or_create_settings(company_id, db)
    if not settings.is_active:
        raise HTTPException(status_code=400, detail="WhatsApp nao configurado ou inativo")

    target = _get_whatsapp_target(settings)
    if not target:
        raise HTTPException(status_code=400, detail="Numero ou grupo de destino nao configurado")

    company_result = await db.execute(select(Company).where(Company.id == company_id))
    company = company_result.scalar_one_or_none()
    company_name = company.name if company else "Empresa"

    message = (
        f"*{company_name} - Relatorio Diario*\n"
        f"{datetime.now().strftime('%d/%m/%Y')}\n\n"
        f"Enviado automaticamente pelo DashPro Business"
    )
    success = wa_service.send_pdf_bot_message(target, message)
    if not success:
        raise HTTPException(status_code=503, detail="Falha ao enviar relatorio")

    return {"message": "Relatorio enviado com sucesso"}
