# 企业级 RAG 知识库系统 · 实施计划（PLAN）

> 一个面向企业内部知识管理与智能问答场景的全栈 RAG（Retrieval-Augmented Generation，检索增强生成）系统。
> 支持多格式文档接入、混合检索、LangGraph 状态图编排的自纠错问答链路、RBAC 权限体系与效果评测，开箱即用、可本地全离线运行。

---

## 1. 项目概述

企业内部沉淀了大量制度文件、产品手册、技术规范等非结构化文档，传统关键词搜索难以直接给出答案。本系统将文档解析、切片、向量化后写入 Elasticsearch，用户以自然语言提问时，系统自动匹配相关知识库、混合检索相关片段，并交由大模型生成带引用来源的回答，实现"问一句话，得到有据可查的答案"。

## 2. 核心特性

- **多格式文档接入**：支持 PDF / Word（docx）/ Markdown / TXT 上传，自动解析、切片、向量化并建立索引
- **混合检索 + RRF 融合**：BM25 全文检索与 kNN 向量检索并行召回，采用 RRF（Reciprocal Rank Fusion）融合作为最终排序
- **LangGraph 状态图编排**：智能路由（自动选库）→ 问题分解 → 自纠错检索（相关性评分、查询改写重检）→ 生成 → 幻觉校验（未通过自动重新生成）
- **SSE 流式输出**：问答全程通过 Server-Sent Events 推送阶段事件与逐段回答文本，前端实时呈现"路由中 / 检索中 / 生成中"等状态
- **引用溯源**：回答附带引用来源片段，答案可追溯到具体文档
- **语义缓存**：基于 Redis 的问答语义缓存，相似问题直接命中，降低时延与调用成本
- **零外部模型依赖**：内置本地哈希嵌入（字符 1/2-gram 特征哈希 + TF 加权 + L2 归一化），无需下载任何模型权重即可完成向量检索；未配置大模型 Key 时自动降级为检索摘要式回答，全链路依然可用
- **RBAC 权限体系**：用户 / 角色 / 知识库成员三级授权，会话历史按用户隔离
- **企业级配套能力**：任务中心（异步索引任务）、评测中心（RAGAS 风格指标）、审计日志、系统配置、仪表盘（Redis 指标源）

## 3. 技术栈

### 3.1 后端

| 类别 | 技术选型 |
| --- | --- |
| Web 框架 | FastAPI + Uvicorn |
| 数据库 | MySQL（SQLAlchemy 2.x + PyMySQL，utf8mb4） |
| 检索引擎 | Elasticsearch 8.x（BM25 + kNN 向量检索） |
| 缓存 | Redis（语义缓存、仪表盘指标） |
| RAG 编排 | LangGraph（状态图：路由 / 分解 / 自纠错检索 / 幻觉校验） |
| 大模型 | DeepSeek（OpenAI 兼容协议，可选） |
| 向量嵌入 | 本地哈希嵌入（默认 256 维，可替换为真实 Embedding 服务） |
| 鉴权 | JWT（PyJWT）+ bcrypt 密码哈希 |
| 文档解析 | pypdf / python-docx / markdown + BeautifulSoup |
| 异步任务 | 进程内后台线程（默认），可切换 Celery |

### 3.2 前端

| 类别 | 技术选型 |
| --- | --- |
| 框架 | React 18 + TypeScript |
| 构建工具 | Vite 5 |
| UI 组件库 | Ant Design 5 |
| 路由 | React Router 6 |

## 4. 系统架构

```
┌────────────────────────────────────────────────────────┐
│                 前端 React + Antd (Vite)                │
│   登录/注册 · 仪表盘 · 知识库 · 文档 · 智能问答(SSE)      │
│   会话历史 · 用户角色 · 任务中心 · 评测中心 · 审计日志     │
└──────────────────────────┬─────────────────────────────┘
                           │ REST / SSE (/api/*)
┌──────────────────────────▼─────────────────────────────┐
│                    FastAPI 后端                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │        LangGraph RAG 状态图 (rag_graph)           │  │
│  │  路由选库 → 问题分解 → 检索 → 相关性评分           │  │
│  │      ↑ 查询改写 ←──┘   → 生成 → 幻觉校验          │  │
│  └──────────────────────────────────────────────────┘  │
│  文档解析/切片 · 本地哈希嵌入 · 索引服务 · RBAC · 审计   │
└───────┬──────────────────┬──────────────────┬──────────┘
        │                  │                  │
   ┌────▼────┐      ┌──────▼──────┐    ┌──────▼──────┐
   │  MySQL  │      │Elasticsearch│    │    Redis    │
   │ 业务数据 │      │ BM25 + kNN  │    │ 缓存/指标    │
   └─────────┘      │  RRF 融合    │    └─────────────┘
                    └─────────────┘
```

## 5. RAG 问答链路

1. **语义缓存**：先查 Redis 语义缓存，命中则直接返回
2. **智能路由**：大模型根据问题自动匹配最相关的知识库（前端展示"已选库"）
3. **问题分解**：复杂问题拆分为多个子问题分别检索
4. **混合检索**：BM25 与向量 kNN 并行召回，RRF 融合排序
5. **相关性评分**：对召回片段打分，不相关则触发查询改写后重新检索
6. **答案生成**：基于上下文流式生成回答，附引用来源
7. **幻觉校验**：校验答案是否忠于上下文，未通过则重新生成

> 未配置大模型 API Key 时，路由 / 分解 / 校验节点自动直通，回退为基于检索片段的摘要式回答，保证链路完整可用。

## 6. 功能模块

| 模块 | 说明 |
| --- | --- |
| 认证中心 | 注册 / 登录，JWT 访问令牌 + 刷新令牌 |
| 仪表盘 | 系统总览指标（Redis 数据源）、RAGAS 评测概览 |
| 知识库管理 | 知识库增删改查、成员授权（kb_member） |
| 文档管理 | 上传、解析状态跟踪、切片查看、删除 |
| 智能问答 | SSE 流式对话、自动选库、引用溯源、多轮上下文 |
| 会话历史 | 按用户隔离的历史会话查看与继续对话 |
| 用户与角色 | RBAC 用户角色管理（管理员功能） |
| 任务中心 | 文档索引等异步任务的状态监控 |
| 审计日志 | 关键操作留痕审计 |
| 系统配置 | 系统级参数配置 |

## 7. 数据模型

共 **14 张表**：

| # | 表名 | 说明 |
| --- | --- | --- |
| 1 | user | 用户 |
| 2 | role | 角色 |
| 3 | user_role | 用户角色关联 |
| 4 | knowledge_base | 知识库 |
| 5 | kb_member | 知识库成员 |
| 6 | document | 文档 |
| 7 | chunk | 切片 |
| 8 | conversation | 会话 |
| 9 | message | 消息 |
| 10 | citation | 引用来源 |
| 11 | task | 异步任务 |
| 12 | eval_run | 评测运行 |
| 13 | audit_log | 审计日志 |
| 14 | system_config | 系统配置 |

## 8. 目录结构

```
├── backend/                  # 后端（FastAPI）
│   ├── app/
│   │   ├── common/           # 统一响应封装
│   │   ├── routers/          # 路由：auth/kb/documents/qa/conversations/tasks/eval/admin/dashboard
│   │   ├── services/         # 核心服务：rag_graph(LangGraph)/rag/indexing/parsing/embedding/es_client/redis_client/llm/access/audit
│   │   ├── config.py         # 配置（.env）
│   │   ├── models.py         # SQLAlchemy 模型
│   │   ├── schemas.py        # Pydantic 模型
│   │   └── main.py           # 应用入口
│   ├── sql/                  # schema.sql / seed.sql
│   ├── data/uploads/         # 上传文件存储
│   └── requirements.txt
├── frontend/                 # 前端（React + TS + Antd）
│   ├── src/
│   │   ├── api/              # HTTP 封装与接口定义
│   │   ├── components/       # 通用组件
│   │   ├── layouts/          # 主布局 / 认证布局
│   │   ├── pages/            # 业务页面（12 个）
│   │   └── router.tsx        # 路由配置
│   └── vite.config.ts
└── 示例文档/                  # 7 大类 34 份中文示例文档（制度/手册/规范等）
```

## 9. 快速开始（部署步骤）

### 9.1 环境要求

- Python 3.10+
- Node.js 20+
- MySQL 8.x、Redis、Elasticsearch 8.x

> ⚠️ **启动顺序**：请确保 Elasticsearch 先于后端启动，否则索引初始化会跳过（可稍后自动重试）。

### 9.2 初始化数据库

```bash
mysql -u root -p --default-character-set=utf8mb4 -e "CREATE DATABASE rag_kb DEFAULT CHARACTER SET utf8mb4"
mysql -u root -p --default-character-set=utf8mb4 rag_kb -e "source backend/sql/rag_kb.sql"
```

### 9.3 启动后端

```powershell
cd backend
Copy-Item .env.example .env   # 按需修改 MySQL/Redis/ES/LLM 配置
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

健康检查：`GET http://127.0.0.1:8000/api/health`（返回 ES / Redis / LLM 可用状态）

### 9.4 启动前端

```bash
cd frontend
npm install
npm run dev
```

访问 http://127.0.0.1:5173 即可使用。

### 9.5（可选）配置大模型

在 `backend/.env` 中填写：

```ini
LLM_API_KEY=sk-xxxx
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-v4-pro
```

不配置也能运行，系统会自动降级为检索摘要式回答。

## 10. API 概览

所有接口统一前缀 `/api`，返回统一响应结构：

| 路由组 | 功能 |
| --- | --- |
| /api/auth | 注册、登录、令牌刷新 |
| /api/kbs | 知识库管理与成员授权 |
| /api/documents | 文档上传、列表、切片、删除 |
| /api/qa | 智能问答（SSE 流式） |
| /api/conversations | 会话历史 |
| /api/tasks | 任务中心 |
| /api/admin | 用户角色、审计日志、系统配置 |
| /api/dashboard | 仪表盘指标 |

## 11. 示例数据

`示例文档/` 目录内置 7 大类共 34 份中文示例文档（考勤假期、产品手册、技术规范、财务报销、培训入职、安全管理、薪酬福利），覆盖 PDF / Word / Markdown / TXT 四种格式，可直接上传体验完整 RAG 链路。

---

## 12. 实施里程碑建议

> 以下为基于上述方案拆分出的落地节奏（建议，可按团队节奏调整）。

| 阶段 | 内容 | 验收标准 |
| --- | --- | --- |
| M1 · 基础设施 | 初始化 MySQL / Redis / ES，建库建表，后端骨架 + 统一响应 + JWT 认证，前端 Vite + Antd 骨架与登录注册 | `/api/health` 通过；可注册登录并拿到令牌 |
| M2 · 文档接入链路 | 多格式解析 → 切片 → 本地哈希嵌入 → ES 索引；文档管理 + 任务中心 | 上传 PDF/Word/MD/TXT 均完成异步索引，切片可查看 |
| M3 · 检索与问答核心 | ES BM25 + kNN 混合检索、RRF 融合；LangGraph 状态图（路由/分解/自纠错/生成/幻觉校验）；SSE 流式前端 | 无 Key 降级模式可用；有 Key 全链路带引用回答 |
| M4 · 企业级能力 | 知识库成员授权（RBAC）、会话历史、语义缓存、评测中心（RAGAS）、审计日志、仪表盘 | 权限隔离生效；评测报告可产出；指标可观测 |
| M5 · 联调与示例验证 | 34 份示例文档入库，端到端跑通问答链路，性能与降级场景回归 | 全功能验收通过，可本地离线一键起跑 |
