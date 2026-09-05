import base64

import config
from services import settings
from services.ingest import store_text

# 支持的图片类型 → mime
_IMAGE_MIME = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}


def _load_constraint():
    """读取 vision.md 约束；不存在则用默认提示。"""
    if config.VISION_MD_PATH.exists():
        return config.VISION_MD_PATH.read_text(encoding="utf-8").strip()
    return "请详细描述这张图片的内容。"


def _client():
    return settings.vision_client()


def _render_pdf_page(data: bytes):
    """把 PDF 第一页渲染成 PNG 图片字节。"""
    import pymupdf as fitz

    doc = fitz.open(stream=data, filetype="pdf")
    try:
        page = doc[0]
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
        return pix.tobytes("png"), "image/png"
    finally:
        doc.close()


def _to_image_bytes_and_mime(filename: str, data: bytes):
    """返回 (图片字节, mime)。PDF 渲染成图，图片原样。"""
    name = filename.lower()
    if name.endswith(".pdf"):
        return _render_pdf_page(data)
    mime = _IMAGE_MIME.get(name[name.rfind("."):], "image/jpeg")
    return data, mime


def describe_and_store(filename: str, data: bytes):
    """图片 → 视觉模型描述 → 入库。"""
    img_bytes, mime = _to_image_bytes_and_mime(filename, data)
    b64 = base64.b64encode(img_bytes).decode()

    constraint = _load_constraint()
    resp = _client().chat.completions.create(
        model=settings.vision_model(),
        messages=[
            {"role": "system", "content": constraint},
            {
                "role": "user",
                "content": [
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{b64}"}},
                    {"type": "text", "text": "请按约束描述这张图片。"},
                ],
            },
        ],
    )
    description = resp.choices[0].message.content or ""

    result = store_text(filename, description)
    return {"description": description, **result}
