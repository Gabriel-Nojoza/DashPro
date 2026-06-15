"""
Supabase Storage service — upload e delete de arquivos.
"""
import uuid as _uuid
import httpx
from app.config import settings

BUCKET = "dashpro-docs"
VEHICLE_BUCKET = "veiculos"
BASE_URL = f"{settings.SUPABASE_URL}/storage/v1"


def _headers():
    return {
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
        "apikey": settings.SUPABASE_SERVICE_KEY,
    }


async def _create_bucket(bucket_id: str, public: bool):
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{BASE_URL}/bucket",
            headers=_headers(),
            json={"id": bucket_id, "name": bucket_id, "public": public},
        )
        return r.status_code in (200, 201, 409)


async def ensure_bucket():
    """Cria os buckets necessários se não existirem."""
    await _create_bucket(BUCKET, public=False)
    await _create_bucket(VEHICLE_BUCKET, public=True)


# ─── Fotos de veículos (bucket público) ──────────────────────────────────────

async def upload_vehicle_photo(company_id: str, veiculo_id: str, content: bytes, content_type: str, filename: str) -> str:
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'jpg'
    path = f"{company_id}/{veiculo_id}/{_uuid.uuid4()}.{ext}"
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{BASE_URL}/object/{VEHICLE_BUCKET}/{path}",
            headers={**_headers(), "Content-Type": content_type},
            content=content,
        )
        if r.status_code not in (200, 201):
            raise Exception(f"Upload falhou: {r.text}")
    return f"{settings.SUPABASE_URL}/storage/v1/object/public/{VEHICLE_BUCKET}/{path}"


async def delete_vehicle_photo(url: str):
    marker = f"/storage/v1/object/public/{VEHICLE_BUCKET}/"
    if marker not in url:
        return
    path = url.split(marker, 1)[-1]
    async with httpx.AsyncClient() as client:
        await client.delete(
            f"{BASE_URL}/object/{VEHICLE_BUCKET}/{path}",
            headers=_headers(),
        )


async def upload_file(path: str, content: bytes, content_type: str) -> str:
    """Faz upload e retorna a URL assinada (1 ano de validade)."""
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{BASE_URL}/object/{BUCKET}/{path}",
            headers={**_headers(), "Content-Type": content_type},
            content=content,
        )
        if r.status_code not in (200, 201):
            raise Exception(f"Upload falhou: {r.text}")

    return await get_signed_url(path)


async def get_signed_url(path: str, expires_in: int = 31536000) -> str:
    """Gera URL assinada com validade (padrão 1 ano)."""
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{BASE_URL}/object/sign/{BUCKET}/{path}",
            headers=_headers(),
            json={"expiresIn": expires_in},
        )
        if r.status_code == 200:
            signed = r.json().get("signedURL", "")
            if signed.startswith("/"):
                return f"{settings.SUPABASE_URL}/storage/v1{signed}"
            return signed
    return ""


async def delete_file(path: str):
    """Remove arquivo do bucket."""
    async with httpx.AsyncClient() as client:
        await client.delete(
            f"{BASE_URL}/object/{BUCKET}/{path}",
            headers=_headers(),
        )
