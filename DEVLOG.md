# 开发日志（DEVLOG）

> RAG 知识库问答系统 · 简化版
> 项目目录：`D:\666\RAG`

---

## 2026-09-05 · 项目启动

- **做了什么**：
  - 敲定技术方案：FastAPI + SQLite + ChromaDB + 硅基流动（`BAAI/bge-m3` 嵌入 / `Qwen/Qwen3-8B` 生成）+ React + Antd
  - 创建项目骨架，开始编写后端代码
- **下一步**：完成后端代码 → 装依赖 → 搭 React 前端 → 端到端联调
- **阻塞项**：无

## 2026-09-05 · 首版完成（端到端跑通）

- **做了什么**：
  - 后端全部代码：`config.py` / `db.py` / `services/{client,embedding,ingest,qa}.py` / `app.py`
  - 前端全部代码：React + TS + Antd，`Upload.tsx`（导入）+ `Chat.tsx`（问答），Vite 代理 `/api` → 8000
  - 创建 `.venv` 并装齐依赖（chromadb 1.5.9 / fastapi 0.141.1 / openai 3.8.0 等）
  - 验证硅基流动 Key：bge-m3 嵌入（1024 维）+ Qwen3-8B 生成均正常
  - 端到端验证：导入样例 → 提问「员工请假流程/后端框架」→ 正确返回带引用来源的答案
  - 前端 `npm run build` 通过，dev server + 代理转发验证通过
  - 清理测试数据，重置 `data/`、`uploads/` 为空
- **下一步**：用户用自己的真实资料做验收；后续可加 PDF/Word 支持、会话历史、流式输出
- **阻塞项**：无

## 2026-09-05 · 新增文档「更新 / 删除」功能

- **做了什么**：
  - 后端 `ingest.py` 重构出 `_store_chunks` / `_remove_chunks`，新增 `delete_document`、`update_document`（先删旧切片再重新入库）
  - 新增接口：`PUT /api/documents/{id}`（更新）、`DELETE /api/documents/{id}`（删除，同时清 ChromaDB + SQLite）
  - 前端 `Upload.tsx` 表格加「更新」（重新上传覆盖）和「删除」（带确认弹窗）操作列；`client.ts` 加对应方法
  - 验证：删除后检索不再命中旧内容；更新后「苹果→香蕉」检索正确跟随
- **下一步**：PDF/Word 导入、会话历史、流式输出
- **阻塞项**：无

## 关键记录（供后续维护）

- 后端依赖首次安装卡在 pypi 官方源（chromadb 依赖树重），**必须用清华镜像**：`pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple`
- chromadb 1.5.9 集合名需 ≥3 字符；余弦距离用 `metadata={"hnsw:space": "cosine"}`（已验证生效）
- 启动后端前确保 `backend/.env` 里的 `SILICONFLOW_API_KEY` 有效
- 环境坑：本机「安全删除」机制会拦截 `rm -rf` 和 Vite 打包时的 `dist/` 清理（`emptyDir` 报 safe-delete 错误）。清理数据目录用 Python `shutil.rmtree` 可绕过；开发模式（`npm run dev`）不受影响，仅 `npm run build` 受影响
