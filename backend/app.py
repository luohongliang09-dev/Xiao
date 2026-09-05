from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import config
from db import get_conn, init_db
from services.ingest import delete_document, ingest_file, update_document
from services.qa import answer_question

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
        result = answer_question(req.question)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(500, f"问答失败：{e}")

    conn = get_conn()
    conn.execute("INSERT INTO messages (role, content) VALUES (?, ?)", ("user", req.question))
    conn.execute("INSERT INTO messages (role, content) VALUES (?, ?)", ("assistant", result["answer"]))
    conn.commit()
    conn.close()
    return result
