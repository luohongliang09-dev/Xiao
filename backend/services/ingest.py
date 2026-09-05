import re

import chromadb

import config
from db import get_conn
from services.embedding import embed_texts
from services.parsers import parse_document

_chroma_client = chromadb.PersistentClient(path=str(config.CHROMA_DIR))
_collection = _chroma_client.get_or_create_collection(
    name="knowledge",
    metadata={"hnsw:space": "cosine"},
)


def split_text(text, chunk_size=config.CHUNK_SIZE, overlap=config.CHUNK_OVERLAP):
    """按段落切片，超长段落再按固定窗口切分。"""
    text = (text or "").strip()
    if not text:
        return []
    paras = re.split(r"\n\s*\n", text)
    chunks, buf = [], ""
    for para in paras:
        para = para.strip()
        if not para:
            continue
        if len(para) > chunk_size:
            if buf:
                chunks.append(buf)
                buf = ""
            step = chunk_size - overlap
            for i in range(0, len(para), step):
                chunks.append(para[i:i + chunk_size])
        elif len(buf) + len(para) + 1 <= chunk_size:
            buf = f"{buf}\n{para}" if buf else para
        else:
            chunks.append(buf)
            buf = para
    if buf:
        chunks.append(buf)
    return [c for c in chunks if c.strip()]


def _store_chunks(doc_id, filename, chunks):
    """向量化并写入 ChromaDB + SQLite chunks 表。"""
    embeddings = embed_texts(chunks)
    ids = [f"{doc_id}:{i}" for i in range(len(chunks))]
    metadatas = [
        {"document_id": doc_id, "filename": filename, "chunk_index": i}
        for i in range(len(chunks))
    ]
    _collection.add(ids=ids, embeddings=embeddings, documents=chunks, metadatas=metadatas)

    conn = get_conn()
    conn.executemany(
        "INSERT INTO chunks (id, document_id, chunk_index, content) VALUES (?, ?, ?, ?)",
        [(ids[i], doc_id, i, chunks[i]) for i in range(len(chunks))],
    )
    conn.commit()
    conn.close()


def _remove_chunks(doc_id):
    """删除某文档在 ChromaDB + SQLite 里的全部切片，返回删除数量。"""
    conn = get_conn()
    rows = conn.execute("SELECT id FROM chunks WHERE document_id = ?", (doc_id,)).fetchall()
    chunk_ids = [r["id"] for r in rows]
    if chunk_ids:
        _collection.delete(ids=chunk_ids)
    conn.execute("DELETE FROM chunks WHERE document_id = ?", (doc_id,))
    conn.commit()
    conn.close()
    return len(chunk_ids)


def ingest_file(filename, raw_bytes):
    """新建文档并入库。"""
    text = parse_document(filename, raw_bytes)
    chunks = split_text(text)
    if not chunks:
        return {"filename": filename, "chunk_count": 0, "error": "文件没有可解析的文本内容"}

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("INSERT INTO documents (filename, chunk_count) VALUES (?, ?)", (filename, len(chunks)))
    doc_id = cur.lastrowid
    conn.commit()
    conn.close()

    _store_chunks(doc_id, filename, chunks)
    return {"filename": filename, "document_id": doc_id, "chunk_count": len(chunks)}


def store_text(filename, text):
    """把一段文本作为文档入库（用于图片描述等非文件解析产生的内容）。"""
    chunks = split_text(text)
    if not chunks:
        return {"filename": filename, "chunk_count": 0, "error": "没有可入库的文本内容"}

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("INSERT INTO documents (filename, chunk_count) VALUES (?, ?)", (filename, len(chunks)))
    doc_id = cur.lastrowid
    conn.commit()
    conn.close()

    _store_chunks(doc_id, filename, chunks)
    return {"filename": filename, "document_id": doc_id, "chunk_count": len(chunks)}


def delete_document(doc_id):
    """删除文档及其全部切片。"""
    removed = _remove_chunks(doc_id)
    conn = get_conn()
    conn.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    conn.commit()
    conn.close()
    return {"deleted": True, "document_id": doc_id, "chunks_removed": removed}


def update_document(doc_id, filename, raw_bytes):
    """用新文件内容覆盖指定文档（先删旧切片，再重新入库）。"""
    conn = get_conn()
    exists = conn.execute("SELECT id FROM documents WHERE id = ?", (doc_id,)).fetchone()
    conn.close()
    if not exists:
        return {"error": "文档不存在", "document_id": doc_id}

    text = parse_document(filename, raw_bytes)
    chunks = split_text(text)
    if not chunks:
        return {"error": "文件没有可解析的文本内容", "document_id": doc_id}

    _remove_chunks(doc_id)
    _store_chunks(doc_id, filename, chunks)

    conn = get_conn()
    conn.execute(
        "UPDATE documents SET filename = ?, chunk_count = ? WHERE id = ?",
        (filename, len(chunks), doc_id),
    )
    conn.commit()
    conn.close()
    return {"updated": True, "document_id": doc_id, "filename": filename, "chunk_count": len(chunks)}
