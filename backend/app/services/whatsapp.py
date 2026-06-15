import logging
from typing import Optional
from urllib.parse import urljoin

import requests

from app.config import settings

logger = logging.getLogger(__name__)

CONNECTED_STATES = {"open", "connected", "online"}


def _get_headers(api_key: str) -> dict:
    return {"apikey": api_key, "Content-Type": "application/json"}


def _extract_connection_state(payload) -> Optional[str]:
    if isinstance(payload, dict):
        for key in ("state", "status", "connection", "connectionState"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip().lower()

        instance = payload.get("instance")
        if isinstance(instance, dict):
            for key in ("state", "status", "connection", "connectionState"):
                value = instance.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip().lower()

        for value in payload.values():
            nested = _extract_connection_state(value)
            if nested:
                return nested

    if isinstance(payload, list):
        for item in payload:
            nested = _extract_connection_state(item)
            if nested:
                return nested

    return None


def _describe_connection(state: Optional[str], connected: bool, label: str) -> str:
    if connected:
        return f"{label} conectado"
    if state:
        return f"{label} em estado {state}"
    return f"{label} desconectado"


def _get_pdf_bot_base_url() -> str:
    return (settings.PDF_BAILEYS_BOT_URL or "").strip()


def _pdf_bot_unreachable(message: str, error: Optional[str] = None) -> dict:
    payload = {
        "reachable": False,
        "connected": False,
        "state": None,
        "message": message,
    }
    if error:
        payload["error"] = error
    return payload


def _get_bot_headers() -> dict:
    key = (settings.PDF_BAILEYS_BOT_API_KEY or "").strip()
    if key:
        return {"x-api-key": key}
    return {}


def _pdf_bot_get(path: str, params: Optional[dict] = None, timeout: int = 5) -> dict:
    base_url = _get_pdf_bot_base_url()
    if not base_url:
        return _pdf_bot_unreachable("URL do bot PDF nao configurada")

    try:
        response = requests.get(
            urljoin(base_url.rstrip('/') + '/', path.lstrip('/')),
            params=params,
            headers=_get_bot_headers(),
            timeout=timeout,
        )
        response.raise_for_status()
        data = response.json() if response.content else {}
        return {
            "reachable": True,
            "data": data,
        }
    except Exception as exc:
        return _pdf_bot_unreachable("Bot PDF indisponivel", str(exc))


def _pdf_bot_post(path: str, payload: dict, timeout: int = 10) -> dict:
    base_url = _get_pdf_bot_base_url()
    if not base_url:
        return _pdf_bot_unreachable("URL do bot PDF nao configurada")

    try:
        response = requests.post(
            urljoin(base_url.rstrip('/') + '/', path.lstrip('/')),
            json=payload,
            headers=_get_bot_headers(),
            timeout=timeout,
        )
        response.raise_for_status()
        data = response.json() if response.content else {}
        return {
            "reachable": True,
            "data": data,
        }
    except Exception as exc:
        logger.error("PDF bot POST error (%s): %s", path, exc)
        return _pdf_bot_unreachable("Bot PDF indisponivel", str(exc))


def send_message(api_url: str, api_key: str, instance: str, phone: str, message: str) -> bool:
    try:
        url = f"{api_url.rstrip('/')}/message/sendText/{instance}"
        payload = {
            "number": phone,
            "textMessage": {"text": message},
            "options": {"delay": 1200, "presence": "composing"},
        }
        response = requests.post(url, json=payload, headers=_get_headers(api_key), timeout=10)
        response.raise_for_status()
        return True
    except Exception as exc:
        logger.error("WhatsApp send error: %s", exc)
        return False


def send_group_message(api_url: str, api_key: str, instance: str, group_id: str, message: str) -> bool:
    try:
        url = f"{api_url.rstrip('/')}/message/sendText/{instance}"
        payload = {
            "number": group_id,
            "textMessage": {"text": message},
            "options": {"delay": 1200},
        }
        response = requests.post(url, json=payload, headers=_get_headers(api_key), timeout=10)
        response.raise_for_status()
        return True
    except Exception as exc:
        logger.error("WhatsApp group send error: %s", exc)
        return False


def check_connection(api_url: str, api_key: str, instance: str, timeout: int = 10) -> dict:
    try:
        url = f"{api_url.rstrip('/')}/instance/connectionState/{instance}"
        response = requests.get(url, headers=_get_headers(api_key), timeout=timeout)
        response.raise_for_status()
        data = response.json()
        state = _extract_connection_state(data)
        connected = state in CONNECTED_STATES if state else True
        return {
            "connected": connected,
            "state": state,
            "message": _describe_connection(state, connected, "Instancia"),
            "data": data,
        }
    except Exception as exc:
        return {
            "connected": False,
            "state": None,
            "message": "Falha ao consultar instancia",
            "error": str(exc),
        }


def check_pdf_bot_status(timeout: int = 5) -> dict:
    response = _pdf_bot_get("/status", timeout=timeout)
    if not response["reachable"]:
        return {
            **response,
            "configured_groups": [],
            "joined_groups": [],
            "qr_available": False,
            "qr_code": None,
            "qr_ascii": None,
            "contact_count": 0,
        }

    data = response["data"]
    configured_groups = data.get("configuredGroups") if isinstance(data.get("configuredGroups"), list) else []
    joined_groups = data.get("joinedGroups") if isinstance(data.get("joinedGroups"), list) else []
    connected = bool(data.get("connected"))
    state = data.get("state")
    message = data.get("message") or _describe_connection(state, connected, "Bot PDF")
    return {
        "reachable": True,
        "connected": connected,
        "state": state,
        "message": message,
        "configured_groups": configured_groups,
        "joined_groups": joined_groups,
        "qr_available": bool(data.get("qrAvailable")),
        "qr_code": data.get("qrCode"),
        "qr_ascii": data.get("qrAscii"),
        "contact_count": int(data.get("contactCount") or 0),
        "data": data,
    }


def get_pdf_bot_qr(timeout: int = 5) -> dict:
    response = _pdf_bot_get("/qr", timeout=timeout)
    if not response["reachable"]:
        return {
            **response,
            "available": False,
            "qr_code": None,
            "qr_ascii": None,
        }

    data = response["data"]
    return {
        "reachable": True,
        "connected": bool(data.get("connected")),
        "state": data.get("state"),
        "available": bool(data.get("available")),
        "message": data.get("message") or "QR indisponivel no momento",
        "qr_code": data.get("qrCode"),
        "qr_ascii": data.get("qrAscii"),
        "last_qr_at": data.get("lastQrAt"),
        "data": data,
    }


def get_pdf_bot_groups(timeout: int = 5) -> dict:
    response = _pdf_bot_get("/groups", timeout=timeout)
    if not response["reachable"]:
        return {
            **response,
            "count": 0,
            "items": [],
        }

    data = response["data"]
    items = data.get("items") if isinstance(data.get("items"), list) else []
    return {
        "reachable": True,
        "connected": bool(data.get("connected")),
        "count": len(items),
        "items": items,
    }


def get_pdf_bot_contacts(search: Optional[str] = None, timeout: int = 5) -> dict:
    params = {"search": search} if search else None
    response = _pdf_bot_get("/contacts", params=params, timeout=timeout)
    if not response["reachable"]:
        return {
            **response,
            "count": 0,
            "items": [],
        }

    data = response["data"]
    items = data.get("items") if isinstance(data.get("items"), list) else []
    return {
        "reachable": True,
        "connected": bool(data.get("connected")),
        "count": len(items),
        "items": items,
    }


def reconnect_pdf_bot(timeout: int = 10) -> dict:
    response = _pdf_bot_post("/reconnect", {}, timeout=timeout)
    if not response["reachable"]:
        return {**response}
    return {"reachable": True, "message": response.get("data", {}).get("message", "Reconexao iniciada")}


def send_pdf_bot_message(target: str, message: str, timeout: int = 10) -> bool:
    response = _pdf_bot_post("/send-message", {"target": target, "message": message}, timeout=timeout)
    return response["reachable"]


def send_order_delivered_notification(
    api_url: str,
    api_key: str,
    instance: str,
    client_phone: str,
    order_number: str,
    total: str,
    company_name: str,
) -> bool:
    message = (
        f"*{company_name}*\n\n"
        f"Ola! Seu pedido *{order_number}* foi entregue com sucesso.\n"
        f"Valor total: *R$ {total}*\n\n"
        f"Obrigado pela preferencia!"
    )
    return send_message(api_url, api_key, instance, client_phone, message)


def send_low_stock_alert(
    api_url: str,
    api_key: str,
    instance: str,
    target: str,
    products: list,
    company_name: str,
    is_group: bool = False,
) -> bool:
    lines = [f"*{company_name} - Alerta de Estoque Baixo*\n"]
    for product in products:
        lines.append(
            f"- {product['name']}: {product['current_stock']} {product['unit']} (min: {product['min_stock']})"
        )
    message = "\n".join(lines)

    if is_group:
        return send_group_message(api_url, api_key, instance, target, message)
    return send_message(api_url, api_key, instance, target, message)


def send_daily_report(
    api_url: str,
    api_key: str,
    instance: str,
    target: str,
    report_data: dict,
    company_name: str,
    is_group: bool = False,
) -> bool:
    from datetime import date

    message = (
        f"*{company_name} - Relatorio Diario*\n"
        f"{date.today().strftime('%d/%m/%Y')}\n\n"
        f"Vendas do dia: R$ {report_data.get('sales', '0,00')}\n"
        f"Pedidos entregues: {report_data.get('orders', 0)}\n"
        f"Novos clientes: {report_data.get('new_clients', 0)}\n"
        f"Produtos em estoque baixo: {report_data.get('low_stock', 0)}\n\n"
        f"Enviado automaticamente pelo DashPro Business"
    )

    if is_group:
        return send_group_message(api_url, api_key, instance, target, message)
    return send_message(api_url, api_key, instance, target, message)
