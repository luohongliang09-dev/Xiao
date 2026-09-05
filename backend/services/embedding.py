import config
from services.client import client


def embed_texts(texts):
    """批量向量化，返回 list[list[float]]"""
    if not texts:
        return []
    resp = client.embeddings.create(
        model=config.EMBEDDING_MODEL,
        input=texts,
        encoding_format="float",
    )
    return [item.embedding for item in resp.data]


def embed_one(text):
    return embed_texts([text])[0]
