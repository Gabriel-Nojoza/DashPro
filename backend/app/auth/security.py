from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.config import settings


pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


def _limit_password(password: str) -> str:
    """
    O bcrypt aceita no máximo 72 bytes.
    Isso evita erro quando a senha passa desse limite.
    """
    if not password:
        return ""

    return password[:72]


def hash_password(password: str) -> str:
    return pwd_context.hash(_limit_password(password))


def verify_password(plain: str, hashed: str) -> bool:
    if not plain or not hashed:
        return False

    try:
        return pwd_context.verify(_limit_password(plain), hashed)
    except Exception:
        return False


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    now = datetime.utcnow()
    expire = now + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    to_encode = data.copy()
    to_encode.update({
        "exp": expire,
        "iat": now,
    })

    return jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def decode_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
    except JWTError:
        return {}