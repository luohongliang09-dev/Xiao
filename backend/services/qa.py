import config
from services import settings
from services.embedding import embed_one
from services.ingest import _collection


_DEFAULT_SYSTEM = (
    "你是知识库问答助手。请只依据下面提供的参考资料回答问题；"
    "如果资料中没有答案，请明确说明“资料中未找到相关内容”，不要编造。"
    "回答要简洁、准确，使用中文。"
)

MAX_HISTORY = 8  # 多轮上下文最多携带最近 8 条消息


def _load_system_prompt():
    """加载 agent.md 人设作为系统提示词；文件不存在时回退到默认提示词。"""
    if config.AGENT_MD_PATH.exists():
        return config.AGENT_MD_PATH.read_text(encoding="utf-8").strip()
    return _DEFAULT_SYSTEM


def _retrieve(question):
    """嵌入 + 向量检索，返回 (context, sources, docs)。"""
    q_emb = embed_one(question)
    results = _collection.query(
        query_embeddings=[q_emb],
        n_results=config.TOP_K,
        include=["documents", "metadatas"],
    )
    docs = results["documents"][0]
    metas = results["metadatas"][0]
    context = "\n\n".join(f"[来源：{m['filename']}]\n{d}" for d, m in zip(docs, metas))

    sources, seen = [], set()
    for m in metas:
        fn = m["filename"]
        if fn not in seen:
            seen.add(fn)
            sources.append(fn)
    return context, sources, docs


def _build_messages(question, history, context):
    system = _load_system_prompt()
    user_msg = f"参考资料：\n{context}\n\n问题：{question}"
    messages = [{"role": "system", "content": system}]
    for h in (history or [])[-MAX_HISTORY:]:
        if isinstance(h, dict) and h.get("role") in ("user", "assistant") and h.get("content"):
            messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": user_msg})
    return messages


def answer_question(question, history=None):
    """非流式回答（保留兼容）。"""
    context, sources, docs = _retrieve(question)
    messages = _build_messages(question, history, context)
    resp = settings.chat_client().chat.completions.create(
        model=settings.chat_model(),
        messages=messages,
        temperature=0.2,
    )
    answer = resp.choices[0].message.content
    return {"answer": answer, "sources": sources, "contexts": docs}


def stream_answer(question, history=None):
    """流式生成器：先 yield sources，再逐字 yield delta，最后 yield done。"""
    context, sources, _docs = _retrieve(question)
    messages = _build_messages(question, history, context)

    yield {"type": "sources", "sources": sources}

    stream = settings.chat_client().chat.completions.create(
        model=settings.chat_model(),
        messages=messages,
        temperature=0.2,
        stream=True,
    )
    for chunk in stream:
        if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
            yield {"type": "delta", "content": chunk.choices[0].delta.content}

    yield {"type": "done"}
