# Railway 部署说明：智己 GEO 监测看板

目标：让同事不在 Windows 本机安装/编译依赖，直接通过 Railway 网址访问看板并上传 Excel 更新数据。

## 1. 本次 Railway 适配改动

- `server/index.js`
  - 数据库路径支持环境变量：`DB_PATH`
  - Railway 上建议使用 `/data/geo.db`
- `package.json`
  - `start` 改为跨平台命令：`node server/index.js`
  - 固定 Node 版本：`22.x`
- `.node-version`
  - 固定 Node 22
- `railway.json`
  - Railway 使用 Nixpacks 构建
  - Build Command: `npm run build`
  - Start Command: `npm start`
  - Healthcheck: `/api/health`

## 2. Railway 项目设置

### 2.1 创建项目

1. 打开 Railway
2. New Project
3. 选择 Deploy from GitHub repo
4. 选择 `geo-dashboard` 所在仓库
5. 等待首次部署

如果你不是从 GitHub 部署，而是上传代码包，也要确保上传的是项目根目录，也就是包含这些文件的目录：

- `package.json`
- `package-lock.json`
- `server/`
- `client/`
- `railway.json`

不要只上传 `dist-package/`。

## 3. 必填环境变量

在 Railway 项目里进入：

`Variables` -> `New Variable`

添加：

```text
NODE_ENV=production
DB_PATH=/data/geo.db
ADMIN_TOKEN=自己设置一个管理员token
VIEW_TOKEN=自己设置一个只读token
VITE_ADMIN_TOKEN=和 ADMIN_TOKEN 填同一个值
```

说明：

- `ADMIN_TOKEN`：用于上传 Excel、更新数据
- `VIEW_TOKEN`：用于只看数据，不允许上传
- `VITE_ADMIN_TOKEN`：前端构建时用于显示管理员上传入口。当前项目已有这个机制，所以 Railway 构建前必须设置。

建议 token 不要用中文、空格或特殊符号，先用简单英文数字，例如：

```text
ADMIN_TOKEN=zhiji-admin-2026
VIEW_TOKEN=zhiji-view-2026
VITE_ADMIN_TOKEN=zhiji-admin-2026
```

后续正式使用时可以换成更长的随机字符串。

## 4. 配置持久化 Volume

SQLite 数据库必须持久化，否则 Railway 重新部署/重启后数据可能丢失。

操作：

1. Railway 项目页打开服务
2. 找到 `Volumes`
3. Add Volume
4. Mount Path 填：

```text
/data
```

5. 保存后重新部署

环境变量里必须同时有：

```text
DB_PATH=/data/geo.db
```

## 5. 访问方式

部署成功后，在 Railway 服务里生成 Public Domain。

假设 Railway 域名是：

```text
https://your-app.up.railway.app
```

管理员入口：

```text
https://your-app.up.railway.app/?token=你的ADMIN_TOKEN
```

只读入口：

```text
https://your-app.up.railway.app/?token=你的VIEW_TOKEN
```

第一次打开带 token 的链接后，前端会把 token 存到浏览器 localStorage，后续可以直接打开域名。

## 6. 部署后验证

### 6.1 健康检查

浏览器打开：

```text
https://your-app.up.railway.app/api/health
```

期望返回：

```json
{"status":"ok"}
```

### 6.2 页面检查

打开管理员入口：

```text
https://your-app.up.railway.app/?token=你的ADMIN_TOKEN
```

检查：

- 页面能打开
- 能看到上传 Excel 的入口
- 上传 Excel 后，数据刷新正常

### 6.3 数据持久化检查

1. 上传一次 Excel
2. 在 Railway 里手动 Redeploy 或 Restart
3. 再打开页面
4. 如果数据仍在，说明 Volume 配置成功

## 7. 常见问题

### Q1: 页面能打开，但上传入口不显示

检查 Railway Variables 是否设置：

```text
VITE_ADMIN_TOKEN=和 ADMIN_TOKEN 相同
```

注意：`VITE_ADMIN_TOKEN` 是前端构建变量。如果部署后才添加或修改，需要重新部署一次。

### Q2: API 返回 Token required / Invalid token

检查访问 URL 是否带了 token：

```text
/?token=你的ADMIN_TOKEN
```

或者清空浏览器 localStorage 后重新打开带 token 的链接。

### Q3: Railway 重启后数据没了

检查两个地方：

```text
DB_PATH=/data/geo.db
```

以及 Volume Mount Path 是否是：

```text
/data
```

### Q4: 构建失败在 better-sqlite3

Railway Linux 环境通常比 Windows 更容易安装 `better-sqlite3`。如果仍失败，优先检查 Node 版本是否为 22。项目已通过 `package.json` 和 `.node-version` 固定 Node 22。

## 8. 给同事的话术

部署好后，不要再让同事跑 bat。

直接发他管理员链接：

```text
这是智己 GEO 看板地址：
https://your-app.up.railway.app/?token=你的ADMIN_TOKEN

打开后可以上传 Excel 更新数据。第一次打开后浏览器会记住登录状态。
```
