"""Settings shared with the Next.js app (same .env keys, same database, same session secret)."""
from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    _ROOT = Path(__file__).resolve().parents[2]
    model_config = SettingsConfigDict(env_file=(_ROOT / ".env.local", _ROOT / "backend" / ".env"), extra="ignore")

    database_url: str = "postgresql://localhost:5432/hsp_giftos"
    session_secret: str = ""
    auth_dev_otp: str = ""
    environment: str = "development"
    cors_origins: str = "http://localhost:5173"
    email_provider_key: str = ""
    email_from: str = ""
    sms_provider_key: str = ""
    whatsapp_token: str = ""
    whatsapp_phone_number_id: str = ""
    sms_template_auth_otp: str = ""
    return_window_days: int = 7
    commission_tds_bps: int = 200
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""
    razorpayx_account_number: str = ""
    cron_secret: str = ""
    blob_read_write_token: str = ""
    upload_dir: str = "../.uploads"
    hsp_gst_state: str = ""
    tally_sales_ledger: str = "Sales - Gifting"
    tally_freight_ledger: str = "Freight Recovered"
    tally_advance_ledger: str = "Customer Advances"
    tally_bank_ledger: str = "Razorpay Clearing"
    anthropic_api_key: str = ""
    voyage_api_key: str = ""
    embedding_model: str = "voyage-3.5"
    shiprocket_email: str = ""
    shiprocket_password: str = ""
    shiprocket_pickup_location: str = "Primary"
    sim_delivery_days: int = 2
    ai_model: str = "claude-opus-5-5"
    site_url: str = "https://hspmart.com"
    next_revalidate_url: str = ""
    revalidate_secret: str = ""

    @property
    def sqlalchemy_url(self) -> str:
        url = self.database_url
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url[len(prefix):]
        return url

    @property
    def production(self) -> bool:
        return self.environment == "production"


@lru_cache
def settings() -> Settings:
    s = Settings()
    if len(s.session_secret) < 32:
        raise RuntimeError("SESSION_SECRET must be at least 32 characters")
    return s
