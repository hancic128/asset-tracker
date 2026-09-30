# Asset Tracker

个人资产管理工具 —— 订阅 + 储值卡，**不是**日常记账。

回答三个问题：每天实际摊掉多少钱、哪些订阅马上到期、储值卡还剩几次/多少钱。

## 形态

单机自托管，**零外部依赖**：

- 后端 `server.py` —— Python 3.11 **标准库**单文件（无框架、无 pip 依赖），SQLite 存储
- 前端 Vite + React + TS + Tailwind，构建产物由 `server.py` 直接托管
- 前后端**同源**（一个进程），因此没有 CORS，也不需要额外的反向代理层
- PWA：manifest + 图标，可「添加到主屏幕」

## 部署

走 `app-deploy` 统一链路（见 Trilium《部署规范》）：

```
git tag 0.0.1 → push
  → 本仓库 CI 测试 + 构建镜像推 ghcr.io/hancic128/asset-tracker
  → repository_dispatch 到 hancic128/app-deploy
  → app-deploy 把镜像从 ghcr 搬到阿里云 ACR，SSH 到 bj 执行 docker compose pull && up -d
```

- 配置：`app-deploy/services/asset-tracker/`
- 宿主：bj `49.232.168.161`，`/root/apps/asset-tracker/`（compose + `.env` + `data/`）
- 端口：`8085`
- 入口：bj 上的 hancic-nginx 反代 `https://asset.hancic.site` → `host.docker.internal:8085`
- 数据：`data/asset-tracker.db`（SQLite）。**备份 = 拷这个目录**

首次部署前宿主上要先备好 `.env`：

```bash
ssh root@49.232.168.161
mkdir -p /root/apps/asset-tracker/data && cd /root/apps/asset-tracker
# .env 由 app-deploy scp .env.example 过来后自己改，或直接手写
```

### 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `ASSET_HOST` | `0.0.0.0` | 监听地址（**别改 127.0.0.1**，nginx 容器要经宿主访问） |
| `ASSET_PORT` | `8085` | 监听端口 |
| `ASSET_DB` | `/opt/asset-tracker/asset-tracker.db` | SQLite 路径（compose 卷内） |
| `ASSET_STATIC` | `/app/static` | 前端产物目录 |
| `ASSET_VERSION` | `dev` | 部署版本，`/health` 与顶栏显示 |
| `ASSET_INITIAL_PASSWORD` | 空 | 只在库里还没有口令时生效；已设则忽略 |
| `ASSET_DIGEST_HOUR` | `9` | 每日提醒推送时刻（0-23，Asia/Shanghai） |

## 本地开发

```bash
npm install
npm run dev                  # 前端 dev server（需要另起后端，见 vite.config.ts 的 proxy）
python3 server.py            # 后端，默认 :8085；ASSET_STATIC 指到 dist/ 就能同源跑
python3 -m unittest discover -s tests -v
```

## 数据模型

### subscriptions

| 字段 | 说明 |
|---|---|
| `name` / `amount` / `currency` | 名称 / 金额 / `CNY` 或 `USD` |
| `period_preset` | `week` / `month` / `quarter` / `half` / `year` / `custom` |
| `period_days` | 自定义周期长度（`custom` 用；内置周期也存折算天数） |
| `start_date` / `end_date` | 周期起止；改起始日期可按周期自动推截止日期 |
| `category` / `status` / `notes` | 分类 / `active` `paused` `cancelled` `renewed` `expired` / 备注 |
| `remind_enabled` / `remind_date` | 到期提醒开关与提醒日期 |

续订 = 复制一条新周期（`start_date` = 旧 `end_date`，`end_date` = 起始 + 周期长度），旧周期置 `renewed`。

### stored_value_cards

| 字段 | 说明 |
|---|---|
| `name` / `category` / `currency` | 名称 / 分类（与订阅共享同一套分类）/ 币种 |
| `type` | `amount`（按金额）或 `count`（按次数），**二选一** |
| `initial_amount` / `remaining_amount` | 按金额时有效 |
| `initial_uses` / `remaining_uses` | 按次数时有效 |
| `expires_at` / `status` | 有效期 / `active` `depleted` `expired` |
| `remind_enabled` / `remind_date` | 到期提醒开关与提醒日期 |

### settings

`key` / `value` 键值表，存分类列表与 webhook 配置。

## API

除 `/health`、`/api/session`、`/api/login`、`/api/setup` 外都需要
`Authorization: Bearer <token>`（登录返回的会话 token，存 localStorage，30 天过期）。

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 探活，返回 `{ok, version}` |
| GET | `/api/session` | 登录态 + 是否需要初始化 |
| POST | `/api/setup` | 首次设置口令 |
| POST | `/api/login` / `/api/logout` | 登录 / 登出 |
| POST | `/api/password` | 改口令（改后**清空所有会话**） |
| GET/POST | `/api/subscriptions` | 列表 / 新建 |
| PATCH/DELETE | `/api/subscriptions/:id` | 修改 / 删除 |
| GET/POST | `/api/cards` | 同上，储值卡 |
| PATCH/DELETE | `/api/cards/:id` | 同上，储值卡 |
| GET | `/api/settings` | 全部设置 |
| PUT | `/api/settings/:key` | 写单个设置 |
| GET | `/api/export` | 全量导出 JSON |
| POST | `/api/import` | 导入 JSON |
| POST | `/api/webhook/test` | 试推一条测试 payload |
| POST | `/api/webhook/run` | 立刻跑一次摘要（不等定时） |
| GET | `/*` | 静态文件 + SPA fallback |

## 认证

- 口令：PBKDF2-HMAC-SHA256，200k 轮，`pbkdf2_sha256$rounds$salt$hash`
- 会话：随机 token 存 SQLite `sessions` 表，30 天过期；改口令即全量失效
- 单用户，无用户名（用户表固定一行 `id = 1`）

## 提醒

`server.py` 里的线程每天 `ASSET_DIGEST_HOUR` 点推一次 webhook（不依赖外部 cron）。
payload 同时带人类可读字段（`title` / `body` / `event` / `repo`，兼容 bluebird 等接收端）
和结构化字段（`upcoming_subscriptions` / `expiring_cards` / `summary`）。

webhook 支持 **URL + Bearer token** 两段式；设置页有「测试」按钮。

## 待办

- 服务端目前只有 manifest，**没有 service worker**，离线下打不开页面
