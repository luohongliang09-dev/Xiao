import json
import time

from openai import OpenAI

import config

SETTINGS_FILE = config.DATA_DIR / "settings.json"


def _defaults():
    return {
        "embedding": {
            "base_url": config.SILICONFLOW_BASE_URL,
            "api_key": config.SILICONFLOW_API_KEY,
            "model": config.EMBEDDING_MODEL,
        },
        "chat": {
            "base_url": config.SILICONFLOW_BASE_URL,
            "api_key": config.SILICONFLOW_API_KEY,
            "model": config.CHAT_MODEL,
        },
    }


def get_settings():
    """读取运行时设置，缺失项回退到 .env 默认值。"""
    settings = _defaults()
    if SETTINGS_FILE.exists():
        try:
            data = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            data = {}
        for key in ("embedding", "chat"):
            if isinstance(data.get(key), dict):
                for field in ("base_url", "api_key", "model"):
                    if data[key].get(field):
                        settings[key][field] = data[key][field]
    return settings


def merge_settings(settings, patch):
    """用 patch 中的非空字段覆盖 settings（空值视为不修改）。"""
    for key in ("embedding", "chat"):
        if isinstance(patch.get(key), dict):
            for field in ("base_url", "api_key", "model"):
                if patch[key].get(field):
                    settings[key][field] = patch[key][field]
    return settings


def save_settings(patch):
    settings = merge_settings(get_settings(), patch)
    SETTINGS_FILE.write_text(json.dumps(settings, ensure_ascii=False, indent=2), encoding="utf-8")
    return settings


def embedding_client():
    s = get_settings()["embedding"]
    return OpenAI(api_key=s["api_key"], base_url=s["base_url"])


def chat_client():
    s = get_settings()["chat"]
    return OpenAI(api_key=s["api_key"], base_url=s["base_url"])


def embedding_model():
    return get_settings()["embedding"]["model"]


def chat_model():
    return get_settings()["chat"]["model"]


def test_config(cfg):
    """测试给定配置的可用性与耗时，返回 embedding/chat 结果。"""
    result = {"embedding": {"ok": False}, "chat": {"ok": False}}

    emb = cfg.get("embedding", {}) or {}
    try:
        c = OpenAI(api_key=emb.get("api_key"), base_url=emb.get("base_url"))
        t = time.time()
        r = c.embeddings.create(model=emb.get("model"), input=["测试"], encoding_format="float")
        result["embedding"] = {
            "ok": True,
            "dim": len(r.data[0].embedding),
            "latency_ms": int((time.time() - t) * 1000),
        }
    except Exception as e:  # noqa: BLE001
        result["embedding"]["error"] = str(e)

    chat = cfg.get("chat", {}) or {}
    try:
        c = OpenAI(api_key=chat.get("api_key"), base_url=chat.get("base_url"))
        t = time.time()
        c.chat.completions.create(
            model=chat.get("model"),
            messages=[{"role": "user", "content": "你好"}],
            max_tokens=20,
        )
        result["chat"] = {"ok": True, "latency_ms": int((time.time() - t) * 1000)}
    except Exception as e:  # noqa: BLE001
        result["chat"]["error"] = str(e)

    return result
