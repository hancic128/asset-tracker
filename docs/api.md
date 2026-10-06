# API 参考

## 认证

除以下端点外，所有请求需要 `Authorization: Bearer <token>` 头：

- `GET /health`
- `GET /api/session`
- `POST /api/login`
- `POST /api/setup`

会话 token 在登录后返回，存于 localStorage，30 天过期。

## 端点

### 探活

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/health` | 返回 `{ok, version, deployedAt}` |

### 会话

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/session` | 返回 `{initialized, authenticated}` |
| POST | `/api/setup` | 首次设置口令，body: `{password}` |
| POST | `/api/login` | 登录，body: `{password}` |
| POST | `/api/logout` | 登出 |
| POST | `/api/password` | 改口令，body: `{oldPassword, newPassword}` |

### 订阅

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/subscriptions` | 列表 |
| POST | `/api/subscriptions` | 新建 |
| PATCH | `/api/subscriptions/:id` | 修改 |
| DELETE | `/api/subscriptions/:id` | 删除 |

### 储值卡

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/cards` | 列表 |
| POST | `/api/cards` | 新建 |
| PATCH | `/api/cards/:id` | 修改 |
| DELETE | `/api/cards/:id` | 删除 |

### 设置

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/settings` | 全部设置 |
| PUT | `/api/settings/:key` | 写单个，body: `{value}` |

### 导入导出

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/export` | 全量导出 JSON |
| POST | `/api/import` | 导入 JSON，body: `{subscriptions: [], cards: []}` |

### Webhook

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/webhook/test` | 发送测试通知，body: `{url, token}` |
| POST | `/api/webhook/run` | 立即触发每日摘要 |

### 静态文件

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/*` | 前端静态文件，未知路径返回 index.html（SPA） |

## 数据模型

### Subscription

| 字段 | 类型 | 说明 |
|---|---|---|
| id | integer | 主键 |
| name | string | 名称 |
| amount | number | 金额 |
| currency | string | `CNY` 或 `USD` |
| period_preset | string | `week` / `month` / `quarter` / `half` / `year` / `custom` |
| period_days | integer | 周期天数（custom 用） |
| start_date | string | 周期开始日期（YYYY-MM-DD） |
| end_date | string | 周期结束日期 |
| category | string | 分类 |
| status | string | `active` / `paused` / `cancelled` / `renewed` / `expired` |
| remind_enabled | boolean | 开启提醒 |
| remind_date | string | 提醒日期 |
| notes | string | 备注 |
| created_at | string | 创建时间（ISO） |
| updated_at | string | 更新时间（ISO） |

### Card

| 字段 | 类型 | 说明 |
|---|---|---|
| id | integer | 主键 |
| name | string | 名称 |
| type | string | `amount`（按金额）或 `count`（按次数） |
| category | string | 分类 |
| currency | string | `CNY` 或 `USD` |
| initial_amount | number | 初始金额（type=amount） |
| remaining_amount | number | 剩余金额 |
| initial_uses | integer | 初始次数（type=count） |
| remaining_uses | integer | 剩余次数 |
| expires_at | string | 有效期截止 |
| status | string | `active` / `depleted` / `expired` |
| remind_enabled | boolean | 开启提醒 |
| remind_date | string | 提醒日期 |
| notes | string | 备注 |
| created_at | string | 创建时间（ISO） |
| updated_at | string | 更新时间（ISO） |

## Webhook Payload

每日摘要推送格式：

```json
{
  "title": "资产管理 · N 个订阅待扣费 / N 张卡待过期",
  "body": "人类可读摘要文本",
  "event": "asset_tracker.digest",
  "repo": "asset-tracker",
  "type": "asset_tracker.digest",
  "at": "2024-01-01T09:00:00+08:00",
  "upcoming_subscriptions": [
    {"name": "...", "amount": 30, "days": 3, "end_date": "2024-01-04", "category": "视频"}
  ],
  "expiring_cards": [
    {"name": "...", "type": "amount", "days": 7, "expires_at": "2024-01-08",
     "remaining_amount": 50, "remaining_uses": null}
  ],
  "summary": {
    "upcoming_subscriptions_count": 2,
    "expiring_cards_count": 1,
    "reminders_count": 0,
    "total": 3
  }
}
```
