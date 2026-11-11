# Architected and built by codieverse+.
import os
from dataclasses import dataclass
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:

    def load_dotenv(*_args, **_kwargs) -> bool:
        return False


# Hanya .env milik engine (sidelab-engine/.env). Tanpa path, load_dotenv() mencari ke atas
# dan bisa membaca .env di luar capsule.
ENGINE_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"


@dataclass(frozen=True)
class NotifyConfig:
    enabled: bool
    bot_token: str
    chat_id: str


def load_config() -> NotifyConfig:
    load_dotenv(ENGINE_ENV_PATH)
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "")
    return NotifyConfig(
        enabled=bool(token and chat_id),
        bot_token=token,
        chat_id=chat_id,
    )
