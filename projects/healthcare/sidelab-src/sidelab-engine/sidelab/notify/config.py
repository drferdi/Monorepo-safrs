# Architected and built by codieverse+.
import os
from dataclasses import dataclass

try:
    from dotenv import load_dotenv
except ImportError:

    def load_dotenv() -> None:
        pass


@dataclass(frozen=True)
class NotifyConfig:
    enabled: bool
    bot_token: str
    chat_id: str


def load_config() -> NotifyConfig:
    load_dotenv()
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "")
    return NotifyConfig(
        enabled=bool(token and chat_id),
        bot_token=token,
        chat_id=chat_id,
    )
