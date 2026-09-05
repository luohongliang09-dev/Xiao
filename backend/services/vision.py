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


def _render_pdf_pages(data: bytes):
    """把 PDF 每页渲染成 PNG 图片字节，返回 list[bytes]。"""
    import pymupdf as fitz

    doc = fitz.open(stream=data, filetype="pdf")
    try:
        pages = []
        for page in doc:
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            pages.append(pix.tobytes("png"))
        return pages
    finally:
        doc.close()


def _describe_one_image(img_bytes: bytes, mime: str) -> str:
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
    return resp.choices[0].message.content or ""


def describe_and_store(filename: str, data: bytes):
    """图片 / PDF → 视觉模型描述 → 入库。"""
    name = filename.lower()
    if name.endswith(".pdf"):
        pages = _render_pdf_pages(data)
        if not pages:
            return {"filename": filename, "chunk_count": 0, "error": "PDF 无法渲染"}
        if len(pages) == 1:
            description = _describe_one_image(pages[0], "image/png")
        else:
            parts = []
            for i, img in enumerate(pages, 1):
                parts.append(f"[第 {i} 页]\n{_describe_one_image(img, 'image/png')}")
            description = "\n\n".join(parts)
    else:
        mime = _IMAGE_MIME.get(name[name.rfind("."):], "image/jpeg")
        description = _describe_one_image(data, mime)

    result = store_text(filename, description)
    return {"description": description, **result}
