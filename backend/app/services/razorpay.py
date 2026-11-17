"""Razorpay REST integration. Without keys (dev/test) it runs in simulated mode: local ids, and
payments arrive via signed webhooks exactly as in production."""
import base64
import hashlib
import hmac
import time
import httpx
from ..config import settings


def live() -> bool:
    s = settings()
    return bool(s.razorpay_key_id and s.razorpay_key_secret)


def _auth():
    s = settings()
    return "Basic " + base64.b64encode(f"{s.razorpay_key_id}:{s.razorpay_key_secret}".encode()).decode()


def _base36(n: int) -> str:
    chars = "0123456789abcdefghijklmnopqrstuvwxyz"
    out = ""
    while n:
        n, r = divmod(n, 36)
        out = chars[r] + out
    return out or "0"


def create_provider_order(amount_paise: int, receipt: str) -> str:
    if not live():
        if settings().production:
            raise RuntimeError("Razorpay keys are not configured")
        return f"order_sim_{receipt}_{_base36(int(time.time() * 1000))}"
    r = httpx.post("https://api.razorpay.com/v1/orders", headers={"Authorization": _auth()},
                   json={"amount": amount_paise, "currency": "INR", "receipt": receipt}, timeout=15)
    if r.status_code >= 400:
        raise RuntimeError(f"Razorpay order failed: {r.status_code} {r.text}")
    return r.json()["id"]


def create_provider_refund(payment_id: str, amount_paise: int, credit_note: str) -> str:
    if not live():
        if settings().production:
            raise RuntimeError("Razorpay keys are not configured")
        return f"rfnd_sim_{credit_note}"
    r = httpx.post(f"https://api.razorpay.com/v1/payments/{payment_id}/refund",
                   headers={"Authorization": _auth(), "X-Refund-Idempotency": credit_note},
                   json={"amount": amount_paise, "speed": "normal", "notes": {"credit_note": credit_note}, "receipt": credit_note},
                   timeout=15)
    if r.status_code >= 400:
        raise RuntimeError(f"Razorpay refund failed: {r.status_code} {r.text}")
    return r.json()["id"]


def verify_webhook_signature(raw: bytes, signature: str | None) -> bool:
    secret = settings().razorpay_webhook_secret
    if not secret or not signature:
        return False
    expected = hmac.new(secret.encode(), raw, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
