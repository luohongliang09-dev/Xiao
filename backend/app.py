import json

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

import config
from db import get_conn, init_db
from services.ingest import delete_document, ingest_file, update_document
from services.qa import answer_question, stream_answer
from services.settings import get_settings, merge_settings, save_settings, test_config

init_db()

app = FastAPI(title="RAG 知识库问答")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    question: str
    history: list[dict] = []


class ModelConfig(BaseModel):
    base_url: str = ""
    api_key: str = ""
    model: str = ""


class SettingsRequest(BaseModel):
    embedding: ModelConfig = ModelConfig()
    chat: ModelConfig = ModelConfig()


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "api_key_set": bool(config.SILICONFLOW_API_KEY),
        "embedding_model": config.EMBEDDING_MODEL,
        "chat_model": config.CHAT_MODEL,
    }


@app.post("/api/ingest")
async def ingest(file: UploadFile = File(...)):
    name = file.filename or "unnamed"
    if not name.lower().endswith((".txt", ".md")):
        raise HTTPException(400, "仅支持 .txt / .md 文件")
    raw = await file.read()
    try:
        return ingest_file(name, raw)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(500, f"导入失败：{e}")


@app.get("/api/documents")
def list_documents():
    conn = get_conn()
    rows = conn.execute(
        "SELECT id, filename, chunk_count, created_at FROM documents ORDER BY id DESC"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


@app.put("/api/documents/{doc_id}")
async def update_doc(doc_id: int, file: UploadFile = File(...)):
    name = file.filename or "unnamed"
    if not name.lower().endswith((".txt", ".md")):
        raise HTTPException(400, "仅支持 .txt / .md 文件")
    raw = await file.read()
    try:
        result = update_document(doc_id, name, raw)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(500, f"更新失败：{e}")
    if "error" in result:
        raise HTTPException(404, result["error"])
    return result


@app.delete("/api/documents/{doc_id}")
def delete_doc(doc_id: int):
    try:
        return delete_document(doc_id)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(500, f"删除失败：{e}")


@app.post("/api/chat")
def chat(req: ChatRequest):
    if not req.question.strip():
        raise HTTPException(400, "问题不能为空")
    try:
        result = answer_question(req.question, req.history)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(500, f"问答失败：{e}")

    conn = get_conn()
    conn.execute("INSERT INTO messages (role, content) VALUES (?, ?)", ("user", req.question))
    conn.execute("INSERT INTO messages (role, content) VALUES (?, ?)", ("assistant", result["answer"]))
    conn.commit()
    conn.close()
    return result


@app.post("/api/chat/stream")
def chat_stream(req: ChatRequest):
    if not req.question.strip():
        raise HTTPException(400, "问题不能为空")

    def gen():
        try:
            for evt in stream_answer(req.question, req.history):
                yield f"data: {json.dumps(evt, ensure_ascii=False)}\n\n"
        except Exception as e:  # noqa: BLE001
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")


@app.get("/api/settings")
def read_settings():
    return get_settings()


@app.put("/api/settings")
def write_settings(req: SettingsRequest):
    return save_settings(req.model_dump())


@app.post("/api/settings/test")
def settings_test(req: SettingsRequest):
    merged = merge_settings(get_settings(), req.model_dump())
    return test_config(merged)
