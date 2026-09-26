# Architected and built by codieverse+.
import unittest
from unittest.mock import patch

from sidelab.llm.openai_compat_client import OpenAICompatClient


class FakeResponse:
    def __init__(self, status_code=200, lines=None, text=""):
        self.status_code = status_code
        self._lines = lines or []
        self.text = text

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def iter_lines(self, decode_unicode=True):
        yield from self._lines


class OpenAICompatClientTests(unittest.TestCase):
    @patch("sidelab.llm.openai_compat_client.requests.post")
    def test_stream_chat_parses_sse_tokens(self, mock_post):
        mock_post.return_value = FakeResponse(
            lines=[
                'data: {"choices": [{"delta": {"content": "Halo"}}]}',
                'data: {"choices": [{"delta": {"content": " dunia"}}]}',
                "data: [DONE]",
            ],
        )
        client = OpenAICompatClient(
            name="deepseek",
            label="DeepSeek",
            base_url="https://api.deepseek.com",
            api_key="token",
        )
        chunks = list(
            client.stream_chat(
                [{"role": "user", "content": "hai"}], "deepseek-v4-flash"
            )
        )
        self.assertEqual(chunks, ["Halo", " dunia"])
        mock_post.assert_called_once()

    @patch("sidelab.llm.openai_compat_client.requests.post")
    def test_raises_on_empty_api_key(self, mock_post):
        client = OpenAICompatClient(
            name="kimi", label="Kimi", base_url="https://api.moonshot.cn/v1", api_key=""
        )
        with self.assertRaises(RuntimeError):
            list(
                client.stream_chat(
                    [{"role": "user", "content": "hi"}], "moonshot-v1-8k"
                )
            )
        mock_post.assert_not_called()

    @patch("sidelab.llm.openai_compat_client.requests.post")
    def test_raises_on_http_error(self, mock_post):
        mock_post.return_value = FakeResponse(
            status_code=401, text='{"error": "Unauthorized"}'
        )
        client = OpenAICompatClient(
            name="qwen",
            label="Qwen",
            base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
            api_key="x",
        )
        with self.assertRaises(RuntimeError) as ctx:
            list(client.stream_chat([{"role": "user", "content": "hi"}], "qwen-turbo"))
        self.assertIn("401", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
