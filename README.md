# ✦ 星尘之海 · 部署指南

> 心事是一颗孤独的微行星，回应是因引力而环绕它的光环。

## 快速启动

### 前置条件
- [Node.js](https://nodejs.org/) v18+
- npm（Node.js 自带）

### 1. 安装依赖
```bash
cd backend
npm install
```

### 2. 启动服务
```bash
npm start
```
服务运行在 **http://localhost:3000**

### 3. 打开浏览器
访问 `http://localhost:3000` 即可使用。

---

## 部署到服务器

### 方案一：直接部署（推荐小型项目）

```bash
# 服务器上
git clone <项目地址> stardust-sea
cd stardust-sea/backend
npm install
npm start
```

使用 [pm2](https://pm2.keymetrics.io/) 保持运行：

```bash
npm install -g pm2
pm2 start server.js --name stardust-sea
pm2 save
pm2 startup
```

### 方案二：Render 部署（推荐，固定 URL）

将代码推送到 GitHub，通过 Render 自动部署，获得稳定的 `*.onrender.com` 域名。

**步骤：**

1. **创建 GitHub 仓库**（公开或私有均可）
2. **推送代码：**
   ```bash
   cd stardust-sea
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git branch -M main
   git push -u origin main
   ```
3. **登录 [Render Dashboard](https://dashboard.render.com)**
4. **点击「New +」→「Web Service」**
5. **连接你的 GitHub 仓库**
6. **填写配置：**
   - **Name:** `stardust-sea`（将获得 `stardust-sea.onrender.com`）
   - **Region:** `Singapore`（亚太节点，国内访问较快）
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `cd backend && npm install`
   - **Start Command:** `node backend/server.js`
   - **Plan:** `Free`
7. **点击「Create Web Service」**
8. 等待几分钟，部署完成后即可访问 `https://stardust-sea.onrender.com`

> ⚠️ **注意：** Render Free 计划使用临时文件系统，SQLite 数据会在服务重启后重置。
> 如需持久化数据，建议后续迁移到 PostgreSQL（Render 免费提供 1GB）。

### 方案三：Docker 部署

创建 `Dockerfile`：

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
COPY frontend/ ../frontend/
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t stardust-sea .
docker run -d -p 3000:3000 --name stardust stardust-sea
```

---

## 架构说明

```
用户浏览器 ──HTTP──→ Express 服务器 (:3000)
                         │
                    ┌────┴────┐
                    │ SQLite   │
                    │ (本地DB) │
                    └─────────┘
```

- **数据库**：SQLite（`backend/stardust.db`），零配置，自动创建
- **前端**：静态文件由 Express 直接托管
- **实时**：Socket.IO（新碎片/成长/光环事件）

## API 接口一览

| 功能 | 方法 | 路径 |
|---|---|---|
| 健康检查 | GET | `/api/health` |
| 创建碎片 | POST | `/api/fragment` |
| 碎片列表 | GET | `/api/fragments` |
| 碎片详情 | GET | `/api/fragment/:id` |
| 提交回应 | POST | `/api/fragment/:id/reply` |
| 获取待审 | GET | `/api/audit/next/:guardianId` |
| 提交审核 | POST | `/api/audit/:guardianId` |
| 密钥找回 | GET | `/api/my-stardust?key=***` |
| 守护者注册 | POST | `/api/guardian/register` |
| 排行榜 | GET | `/api/guardian/leaderboard` |
| 守护者反馈 | POST | `/api/guardian/feedback` |
| 管理列表 | GET | `/api/admin/fragments?pwd=stardust` |
| 管理删除 | DELETE | `/api/admin/fragment/:id?pwd=stardust` |

---

## 前端单独使用（无需后端）

`frontend/index.html` 可直接用浏览器打开，使用本地 localStorage 模拟数据，适合测试。

生产环境推荐配合后端使用，数据持久化且支持多用户。
