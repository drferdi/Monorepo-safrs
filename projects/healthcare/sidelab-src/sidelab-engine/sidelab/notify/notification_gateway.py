# Architected and built by codieverse+.
import logging

from .config import load_config
from .telegram_client import TelegramClient

logger = logging.getLogger("sidelab_notify")


class NotificationGateway:
    def __init__(self, client: TelegramClient | None) -> None:
        self.client = client

    def publish(self, text: str) -> None:
        if not self.client:
            return
        try:
            self.client.send_message(text)
        except Exception as e:
            logger.error(f"Failed to send Telegram notification: {e}")


def _init_gateway() -> NotificationGateway:
    try:
        cfg = load_config()
        client = TelegramClient(cfg.bot_token, cfg.chat_id) if cfg.enabled else None
        return NotificationGateway(client)
    except Exception:
        return NotificationGateway(None)


gateway = _init_gateway()
