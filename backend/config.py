import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

SILICONFLOW_API_KEY = os.getenv("SILICONFLOW_API_KEY", "")
SILICONFLOW_BASE_URL = os.getenv("SILICONFLOW_BASE_URL", "https://api.siliconflow.cn/v1")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "BAAI/bge-m3")
CHAT_MODEL = os.getenv("CHAT_MODEL", "Qwen/Qwen3-8B")

DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "rag.db"
CHROMA_DIR = DATA_DIR / "chroma"
UPLOAD_DIR = BASE_DIR / "uploads"

CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "500"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "50"))
TOP_K = int(os.getenv("TOP_K", "5"))

for _d in (DATA_DIR, CHROMA_DIR, UPLOAD_DIR):
    _d.mkdir(parents=True, exist_ok=True)
