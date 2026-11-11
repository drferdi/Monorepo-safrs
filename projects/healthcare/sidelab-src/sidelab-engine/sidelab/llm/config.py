# Architected and built by codieverse+.
from __future__ import annotations

import os

DEFAULT_BACKEND = "deepseek"

PROVIDER_REGISTRY: dict[str, dict] = {
    "deepseek": {
        "label": "DeepSeek",
        "base_url": "https://api.deepseek.com",
        "base_url_env": "DEEPSEEK_BASE_URL",
        "api_key_env": "DEEPSEEK_API_KEY",
        "timeout_env": "DEEPSEEK_TIMEOUT",
        "models": ("deepseek-v4-flash", "deepseek-v4-pro"),
        "default_model": "deepseek-v4-flash",
        "model_env": "DEEPSEEK_MODEL",
        "client": "openai_compat",
    },
    "local": {
        "label": "Local Ollama",
        "models": (),
        "default_model": "medgemma:4b",
        "model_env": "SIDELAB_LOCAL_MODEL",
        "client": "local",
    },
    "openai": {
        "label": "OpenAI",
        "base_url": "https://api.openai.com/v1",
        "base_url_env": "OPENAI_BASE_URL",
        "api_key_env": "OPENAI_API_KEY",
        "timeout_env": "OPENAI_TIMEOUT",
        "models": ("gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "o1-mini", "o3-mini"),
        "default_model": "gpt-4o-mini",
        "model_env": "OPENAI_MODEL",
        "client": "openai_compat",
    },
    "nvidia": {
        "label": "NVIDIA NIM",
        "base_url": "https://integrate.api.nvidia.com/v1",
        "base_url_env": "NVIDIA_BASE_URL",
        "api_key_env": "NVIDIA_API_KEY",
        "timeout_env": "NVIDIA_TIMEOUT",
        "models": (
            "meta/llama-3.3-70b-instruct",
            "nvidia/llama-3.3-nemotron-super-49b-v1",
            "nvidia/nemotron-mini-4b-instruct",
            "qwen/qwen3-coder-480b-a35b-instruct",
            "minimaxai/minimax-m2.7",
            "minimaxai/minimax-m2.5",
        ),
        "default_model": "meta/llama-3.3-70b-instruct",
        "model_env": "NVIDIA_MODEL",
        "client": "openai_compat",
    },
    "kimi": {
        "label": "Kimi (Moonshot AI)",
        "base_url": "https://api.moonshot.cn/v1",
        "base_url_env": "KIMI_BASE_URL",
        "api_key_env": "KIMI_API_KEY",
        "timeout_env": "KIMI_TIMEOUT",
        "models": ("moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"),
        "default_model": "moonshot-v1-8k",
        "model_env": "KIMI_MODEL",
        "client": "openai_compat",
    },
    "qwen": {
        "label": "Qwen (Alibaba)",
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "base_url_env": "QWEN_BASE_URL",
        "api_key_env": "QWEN_API_KEY",
        "timeout_env": "QWEN_TIMEOUT",
        "models": ("qwen-turbo", "qwen-plus", "qwen-max"),
        "default_model": "qwen-turbo",
        "model_env": "QWEN_MODEL",
        "client": "openai_compat",
    },
    "zhipu": {
        "label": "Zhipu AI (GLM-4)",
        "base_url": "https://open.bigmodel.cn/api/paas/v4/",
        "base_url_env": "ZHIPU_BASE_URL",
        "api_key_env": "ZHIPU_API_KEY",
        "timeout_env": "ZHIPU_TIMEOUT",
        "models": ("glm-4-flash", "glm-4-air", "glm-4-plus"),
        "default_model": "glm-4-flash",
        "model_env": "ZHIPU_MODEL",
        "client": "openai_compat",
    },
    "yi": {
        "label": "Yi (01.AI)",
        "base_url": "https://api.lingyiwanwu.com/v1",
        "base_url_env": "YI_BASE_URL",
        "api_key_env": "YI_API_KEY",
        "timeout_env": "YI_TIMEOUT",
        "models": ("yi-lightning", "yi-large"),
        "default_model": "yi-lightning",
        "model_env": "YI_MODEL",
        "client": "openai_compat",
    },
    "baichuan": {
        "label": "Baichuan AI",
        "base_url": "https://api.baichuan-ai.com/v1",
        "base_url_env": "BAICHUAN_BASE_URL",
        "api_key_env": "BAICHUAN_API_KEY",
        "timeout_env": "BAICHUAN_TIMEOUT",
        "models": ("Baichuan4", "Baichuan4-Turbo"),
        "default_model": "Baichuan4",
        "model_env": "BAICHUAN_MODEL",
        "client": "openai_compat",
    },
    "ernie": {
        "label": "Baidu ERNIE (Qianfan)",
        "base_url": "https://qianfan.baidubce.com/v2",
        "base_url_env": "ERNIE_BASE_URL",
        "api_key_env": "ERNIE_API_KEY",
        "timeout_env": "ERNIE_TIMEOUT",
        "models": ("ernie-4.0-8k", "ernie-3.5-8k"),
        "default_model": "ernie-4.0-8k",
        "model_env": "ERNIE_MODEL",
        "client": "openai_compat",
    },
    "spark": {
        "label": "iFlytek Spark",
        "base_url": "https://spark-api-open.xf-yun.com/v1",
        "base_url_env": "SPARK_BASE_URL",
        "api_key_env": "SPARK_API_KEY",
        "timeout_env": "SPARK_TIMEOUT",
        "models": ("generalv3.5", "4.0Ultra", "generalv3", "lite"),
        "default_model": "generalv3.5",
        "model_env": "SPARK_MODEL",
        "client": "openai_compat",
    },
    "gemini": {
        "label": "Google Gemini (Vertex AI)",
        "models": (
            "gemini-2.0-flash-001",
            "gemini-1.5-pro-001",
            "gemini-1.5-flash-001",
        ),
        "default_model": "gemini-2.0-flash-001",
        "model_env": "GEMINI_MODEL",
        "client": "gemini_vertex",
    },
    "gemini_sub": {
        "label": "Google Gemini (API Key)",
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai",
        "base_url_env": "GEMINI_SUB_BASE_URL",
        "api_key_env": "GEMINI_API_KEY",
        "timeout_env": "GEMINI_TIMEOUT",
        "models": (
            "gemini-2.0-flash",
            "gemini-2.5-flash",
            "gemini-2.5-pro",
            "gemini-1.5-flash",
            "gemini-1.5-pro",
        ),
        "default_model": "gemini-2.0-flash",
        "model_env": "GEMINI_SUB_MODEL",
        "client": "openai_compat",
    },
}

# Backward-compat constants (used by existing tests and external imports)
DEFAULT_LOCAL_MODEL: str = PROVIDER_REGISTRY["local"]["default_model"]
DEFAULT_DEEPSEEK_MODEL: str = PROVIDER_REGISTRY["deepseek"]["default_model"]
AVAILABLE_DEEPSEEK_MODELS: tuple = PROVIDER_REGISTRY["deepseek"]["models"]
DEFAULT_NVIDIA_MODEL: str = PROVIDER_REGISTRY["nvidia"]["default_model"]
AVAILABLE_NVIDIA_MODELS: tuple = PROVIDER_REGISTRY["nvidia"]["models"]

_BACKEND_ALIASES: dict[str, str] = {
    "cloud": "deepseek",
    "remote": "deepseek",
    "1": "deepseek",
    "ollama": "local",
    "2": "local",
    "gpt": "openai",
    "chatgpt": "openai",
    "nim": "nvidia",
    "3": "nvidia",
    "moonshot": "kimi",
    "4": "kimi",
    "alibaba": "qwen",
    "dashscope": "qwen",
    "5": "qwen",
    "glm": "zhipu",
    "6": "zhipu",
    "7": "yi",
    "8": "baichuan",
    "qianfan": "ernie",
    "9": "ernie",
    "ifly": "spark",
    "iflytek": "spark",
    "10": "spark",
    "google": "gemini",
    "vertex": "gemini",
    "11": "gemini",
    "gemini_api": "gemini_sub",
    "google_api": "gemini_sub",
    "12": "gemini_sub",
}


def normalize_backend(value: str | None) -> str:
    backend = (value or "").strip().lower()
    if backend in PROVIDER_REGISTRY:
        return backend
    if backend in _BACKEND_ALIASES:
        return _BACKEND_ALIASES[backend]
    env_default = os.getenv("SIDELAB_DEFAULT_BACKEND", DEFAULT_BACKEND).strip().lower()
    if env_default in PROVIDER_REGISTRY:
        return env_default
    return DEFAULT_BACKEND


def resolve_backend_choice(raw: str | None) -> str:
    return normalize_backend(raw)


def default_model_for_backend(backend: str | None) -> str:
    b = normalize_backend(backend)
    spec = PROVIDER_REGISTRY.get(b, PROVIDER_REGISTRY[DEFAULT_BACKEND])
    return os.getenv(spec["model_env"], spec["default_model"])


def check_backend_readiness(backend: str) -> tuple[bool, str, str]:
    """Check whether a backend is ready for clinical use.

    Returns (is_ready, missing_detail, warning_message) where:
    - is_ready: True if backend can serve clinical requests
    - missing_detail: short name of the missing configuration (e.g. "DEEPSEEK_API_KEY")
    - warning_message: provider-specific human-readable warning
    """
    # Check raw input first — don't silently normalize unknown backends
    raw = (backend or "").strip().lower()
    if raw and raw not in PROVIDER_REGISTRY and raw not in _BACKEND_ALIASES:
        return (
            False,
            "unknown_backend",
            f"Backend '{backend}' tidak dikenal. Pilih backend yang tersedia melalui menu startup.",
        )

    b = normalize_backend(backend)
    spec = PROVIDER_REGISTRY.get(b)
    if spec is None:
        return (
            False,
            "unknown_backend",
            f"Backend '{backend}' tidak dikenal. Pilih backend yang tersedia melalui menu startup.",
        )

    client_type = spec.get("client")

    # Local / Ollama
    if client_type == "local":
        try:
            from .local_client import available_models as _am
        except ImportError:
            return (
                False,
                "ollama_not_installed",
                "Ollama belum terinstal atau package 'ollama' tidak tersedia. "
                "Install Ollama dan package 'ollama' untuk memakai mode Local.",
            )
        models = _am()
        if not models:
            return (
                False,
                "no_local_models",
                "Tidak ada model Ollama yang terdeteksi. "
                "Pull model (misalnya: ollama pull medgemma:4b) sebelum memakai mode Local.",
            )
        return (True, "", "")

    # Gemini Vertex
    if client_type == "gemini_vertex":
        project = os.getenv("VERTEX_PROJECT", "") or os.getenv(
            "GOOGLE_CLOUD_PROJECT", ""
        )
        if not project.strip():
            return (
                False,
                "VERTEX_PROJECT",
                "VERTEX_PROJECT atau GOOGLE_CLOUD_PROJECT belum diisi. "
                "Lengkapi .env agar Gemini Vertex bisa dipakai.",
            )
        return (True, "", "")

    # OpenAI-compatible (DeepSeek, NVIDIA, Kimi, Qwen, Zhipu, Yi, Baichuan, Ernie, Spark)
    if client_type == "openai_compat":
        api_key_env = spec.get("api_key_env", "")
        if api_key_env:
            key_value = os.getenv(api_key_env, "").strip()
            if not key_value:
                return (
                    False,
                    api_key_env,
                    f"{api_key_env} belum diisi. "
                    f"Tambahkan {api_key_env} ke .env agar {spec['label']} bisa dipakai.",
                )
        return (True, "", "")

    # Unknown client type — treat as ready to avoid blocking unknown paths
    return (True, "", "")


def render_mode_menu() -> str:
    lines = ["Pilih backend inference untuk sesi ini.\n"]
    for i, (key, spec) in enumerate(PROVIDER_REGISTRY.items(), start=1):
        model = os.getenv(spec["model_env"], spec["default_model"])
        lines.append(f"{i}. {spec['label']} — {model}")
    default_key = os.getenv("SIDELAB_DEFAULT_BACKEND", DEFAULT_BACKEND).strip().lower()
    if default_key not in PROVIDER_REGISTRY:
        default_key = DEFAULT_BACKEND
    default_label = PROVIDER_REGISTRY[default_key]["label"]
    lines.append(f"\nTekan Enter untuk {default_label}.")
    return "\n".join(lines)
