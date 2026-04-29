# 智己 GEO 监测看板

GEO（Generative Engine Optimization）效果监测工具。监测豆包、千问、DeepSeek、元宝四个 AI 搜索平台上智己汽车的关键词表现。

## 技术栈

- **后端**：Node 22 + Express + better-sqlite3
- **前端**：Vite + React 18 + Ant Design + ECharts
- **部署**：Fly.io（新加坡 sin 区域）
- **数据库**：SQLite，持久化在 Fly Volume `/data/geo.db`

## 项目结构

```
server/
  index.js          — Express 入口，绑定 0.0.0.0:3000（生产）
  db/init.js         — SQLite schema（keywords / monitoring_records / relevance_scores）
  middleware/auth.js  — token 鉴权（ADMIN_TOKEN / VIEW_TOKEN）
  routes/
    upload.js        — POST /api/upload，multer 接收 xlsx，解析入库（admin only）
    overview.js      — GET /api/overview
    keywords.js      — GET /api/keywords/{recommend,compare,sentiment}
    settlement.js    — GET /api/settlement
  services/
    xlsxParser.js    — 解析三 Sheet xlsx（推荐词/对比词/舆情词）
    settlementCalc.js — 关联度计算与 tier 分级
client/
  src/
    hooks/useApi.js   — 所有 API 请求用相对路径（无 base URL）
    hooks/useAuth.js  — token 管理 + 从 /api/auth/role 获取角色
    pages/Overview.jsx — 总览页，admin 可见上传按钮
    components/FileUpload.jsx — xlsx 上传组件
```

## 环境变量

| 变量 | 用途 | 生产值 |
|------|------|--------|
| `PORT` | 服务端口 | `3000`（Dockerfile 设定） |
| `DB_PATH` | SQLite 路径 | `/data/geo.db`（Fly Volume） |
| `NODE_ENV` | 环境 | `production`（Dockerfile 设定） |
| `ADMIN_TOKEN` | 管理员密码 | Fly secrets |
| `VIEW_TOKEN` | 只读密码 | Fly secrets |

## API 路由

| 方法 | 路径 | 鉴权 | 说明 |
|------|------|------|------|
| GET | `/api/health` | 无 | 健康检查 |
| GET | `/api/auth/role` | requireAuth | 返回当前 token 角色 |
| GET | `/api/overview` | requireAuth | 总览数据 |
| GET | `/api/keywords/recommend` | requireAuth | 推荐词 |
| GET | `/api/keywords/compare` | requireAuth | 对比词 |
| GET | `/api/keywords/sentiment` | requireAuth | 舆情词 |
| GET | `/api/settlement` | requireAuth | 结算汇总 |
| POST | `/api/upload` | requireAdmin | 上传 xlsx（multer，临时写 /tmp） |

## 部署

- **平台**：Fly.io，app 名 `geo-dashboard`
- **域名**：https://geo-dashboard.fly.dev
- **管理员**：`?token=geo-admin-2026`
- **只读**：`?token=geo-view-2026`
- **Volume**：`data` 挂载到 `/data`，自动扩容到 10GB
- **机器**：shared-cpu-1x，1GB 内存，min_machines=1

### 部署命令

```bash
cd ~/Desktop/split-repos/HM/智己/geo-dashboard
fly deploy
```

### Fly secrets 管理

```bash
fly secrets set ADMIN_TOKEN="xxx" VIEW_TOKEN="xxx"
```

## 开发

```bash
npm install
npm run dev          # 同时启动 server（3001）+ client（3000）
npm test             # Jest 测试
```

## 红线

- `useApi.js` 中不能出现 `localhost` 或硬编码 base URL — 这会导致生产环境 API 全部 Failed to fetch
- multer 临时文件必须写 `/tmp`，不能写 `/app`（Fly 容器 /app 可能只读）
- `app.listen` 必须绑定 `0.0.0.0`（Fly proxy 需要）
- admin 角色判断必须走 `/api/auth/role`，不能依赖 `VITE_ADMIN_TOKEN` 构建时注入
