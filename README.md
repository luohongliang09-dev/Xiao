# RAG 知识库问答系统（简化版）

本地知识库问答：上传 TXT / Markdown 资料 → 自动切片向量化入库 → 网页提问，基于知识库生成带引用来源的回答。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 后端 | FastAPI + Uvicorn |
| 数据库 | SQLite |
| 向量库 | ChromaDB（本地持久化） |
| 向量化 | 硅基流动 `BAAI/bge-m3`（免费） |
| 生成 | 硅基流动 `Qwen/Qwen3-8B`（免费） |
| 前端 | React + TypeScript + Vite + Ant Design |

## 目录结构

```
├── backend/                 # 后端
│   ├── app.py               # FastAPI 入口
│   ├── config.py            # 配置（读 .env）
│   ├── db.py                # SQLite 建表
│   ├── services/
│   │   ├── client.py        # 硅基流动客户端
│   │   ├── embedding.py     # 向量化
│   │   ├── ingest.py        # 解析/切片/入库
│   │   └── qa.py            # 检索 + 生成
│   ├── .env                 # API Key（已填好）
│   └── requirements.txt
├── frontend/                # 前端
│   └── src/pages/           # Upload.tsx / Chat.tsx
└── DEVLOG.md                # 开发日志
```

## 快速开始

### 1. 配置 API Key

`backend/.env` 中已填入 `SILICONFLOW_API_KEY`，无需修改。更换 Key 时改这里即可。

### 2. 启动后端

```bash
cd backend
.venv\Scripts\activate          # Windows 激活虚拟环境（已创建好）
python -m uvicorn app:app --host 127.0.0.1 --port 8000
```

> 首次部署时若无 `.venv`，先执行：
> ```bash
> cd backend
> python -m venv .venv
> .venv\Scripts\activate
> pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
> ```

### 3. 启动前端（另开一个终端）

```bash
cd frontend
npm install
npm run dev
```

浏览器访问 **http://localhost:5173**

## 使用

1. **导入资料**：上传 `.txt` / `.md` 文件，自动解析、切片、向量化入库
2. **智能问答**：输入问题，返回答案 + 「来源：xxx」引用标签
3. **更新/删除**：文档列表每行有「更新」和「删除」按钮——更新可重新上传同名文件覆盖旧内容，删除会同时清除该文档的全部切片

## API 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| POST | `/api/ingest` | 上传文档（multipart `file`） |
| GET | `/api/documents` | 已导入文档列表 |
| PUT | `/api/documents/{id}` | 更新指定文档（multipart `file`，覆盖旧内容） |
| DELETE | `/api/documents/{id}` | 删除指定文档及其全部切片 |
| POST | `/api/chat` | 问答（JSON `{question}`） |

## 说明

- 数据存于 `backend/data/`（SQLite + ChromaDB），删除该目录即清空知识库
- 嵌入与生成共用一个硅基流动 Key，均走 `https://api.siliconflow.cn/v1`
