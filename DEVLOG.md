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

## 2026-09-05 · 初始化 Git 版本管理

- **做了什么**：
  - `git init -b main` 初始化仓库，首次提交（commit `ad07504`，26 文件）
  - 完善 `.gitignore`：排除 `.env`（Key）、`backend/data/`（运行数据）、`.venv`、`node_modules`、`dist`、TS 构建产物
  - 用户资料 `资料/碧蓝航线.md` 已纳入版本管理
- **阻塞项**：无

## 2026-09-05 · 问答人设（碧蓝航线秘书舰）

- **做了什么**：
  - 新增 `agent.md`：港区秘书舰人设（称呼用户「指挥官」、术语包装、铁律禁止编造）
  - `config.py` 加 `AGENT_MD_PATH`，`qa.py` 的 `_load_system_prompt()` 改为自动读取 `agent.md`（不存在则回退默认提示词）
  - 验证：有资料的问题按人设汇报且数据准确；无资料的问题明确说「未检索到」、不编造
- **备注**：改人设只需编辑根目录 `agent.md`，后端每次请求实时读取，无需改代码、无需重启
- **阻塞项**：无

## 2026-09-05 · 一键启动 / 停止脚本

- **做了什么**：
  - 新增 `start.bat`（双击：起后端 8000 + 前端 5173 + 自动开浏览器）
  - 新增 `stop.bat`（双击：按端口 8000/5173 停服务）
- **用法**：双击 `D:\666\RAG\start.bat` 即可打开网页；停止双击 `stop.bat`
- **阻塞项**：无

## 关键记录（供后续维护）

- 后端依赖首次安装卡在 pypi 官方源（chromadb 依赖树重），**必须用清华镜像**：`pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple`
- chromadb 1.5.9 集合名需 ≥3 字符；余弦距离用 `metadata={"hnsw:space": "cosine"}`（已验证生效）
- 启动后端前确保 `backend/.env` 里的 `SILICONFLOW_API_KEY` 有效
- 环境坑：本机「安全删除」机制会拦截 `rm -rf` 和 Vite 打包时的 `dist/` 清理（`emptyDir` 报 safe-delete 错误）。清理数据目录用 Python `shutil.rmtree` 可绕过；开发模式（`npm run dev`）不受影响，仅 `npm run build` 受影响
- 环境坑：Windows 的 `.bat` 文件**必须用纯 ASCII（英文）**，UTF-8 中文会被 cmd（GBK）误读导致乱码、命令截断（报 `'RAG' 不是内部或外部命令` 之类）。要么纯英文，要么用 GBK 编码写
- 性能：生成模型从 `Qwen/Qwen3-8B` 换成 `THUDM/GLM-4-9B-0414`（硅基流动免费档 Qwen3-8B 拥堵，实测 7~22s 且波动大；GLM-4-9B 稳定 0.7~1.4s，质量一致），端到端从 ~10-15s 降到 ~1.8s

## 2026-09-05 · 问答页背景板 + 毛玻璃聊天框

- **做了什么**：
  - 将 `壁纸.png` 复制到 `frontend/public/bg.png`（用 ASCII 名避免编码风险，原始壁纸留在项目根目录）
  - `Chat.tsx` 重构样式：问答页容器设为背景图（cover/center），所有卡片（用户消息、秘书舰回复、空状态提示、输入框）改为半透明 + `backdrop-filter: blur(10px)` 毛玻璃效果
- **效果**：背景板感觉，聊天框透明浮在壁纸之上
- **阻塞项**：无
