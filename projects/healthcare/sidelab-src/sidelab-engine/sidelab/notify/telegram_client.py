# Architected and built by codieverse+.
import logging

import requests

logger = logging.getLogger("sidelab_notify")


class TelegramClient:
    def __init__(self, bot_token: str, chat_id: str, timeout: int = 10) -> None:
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.timeout = timeout
        self.enabled = bool(bot_token and chat_id)
        self.base_url = f"https://api.telegram.org/bot{bot_token}"

    def send_message(self, text: str) -> bool:
        if not self.enabled:
            return False
        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "Markdown",
        }
        for attempt in range(2):
            try:
                r = requests.post(
                    f"{self.base_url}/sendMessage",
                    json=payload,
                    timeout=self.timeout,
                )
                return r.status_code == 200
            except Exception as e:
                logger.warning(f"Telegram send attempt {attempt + 1} failed: {e}")
        return False
