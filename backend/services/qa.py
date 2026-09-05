import config
from services.client import client
from services.embedding import embed_one
from services.ingest import _collection


_DEFAULT_SYSTEM = (
    "你是知识库问答助手。请只依据下面提供的参考资料回答问题；"
    "如果资料中没有答案，请明确说明“资料中未找到相关内容”，不要编造。"
    "回答要简洁、准确，使用中文。"
)


def _load_system_prompt():
    """加载 agent.md 人设作为系统提示词；文件不存在时回退到默认提示词。"""
    if config.AGENT_MD_PATH.exists():
        return config.AGENT_MD_PATH.read_text(encoding="utf-8").strip()
    return _DEFAULT_SYSTEM


def answer_question(question):
    q_emb = embed_one(question)
    results = _collection.query(
        query_embeddings=[q_emb],
        n_results=config.TOP_K,
        include=["documents", "metadatas"],
    )
    docs = results["documents"][0]
    metas = results["metadatas"][0]

    context_parts = []
    for doc, meta in zip(docs, metas):
        context_parts.append(f"[来源：{meta['filename']}]\n{doc}")
    context = "\n\n".join(context_parts)

    system = _load_system_prompt()
    user_msg = f"参考资料：\n{context}\n\n问题：{question}"

    resp = client.chat.completions.create(
        model=config.CHAT_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.2,
    )
    answer = resp.choices[0].message.content

    sources, seen = [], set()
    for meta in metas:
        fn = meta["filename"]
        if fn not in seen:
            seen.add(fn)
            sources.append(fn)

    return {"answer": answer, "sources": sources, "contexts": docs}
