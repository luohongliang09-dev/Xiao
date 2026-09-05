from services import settings


def embed_texts(texts):
    """批量向量化，返回 list[list[float]]"""
    if not texts:
        return []
    resp = settings.embedding_client().embeddings.create(
        model=settings.embedding_model(),
        input=texts,
        encoding_format="float",
    )
    return [item.embedding for item in resp.data]


def embed_one(text):
    return embed_texts([text])[0]
