# Asset Tracker

订阅 + 储值卡资产管理。回答三个问题：每天实际摊掉多少钱、哪些订阅马上到期、储值卡还剩几次/多少钱。

**单机自托管，零外部依赖。** Python 3.11 标准库后端 + React 前端，一个进程搞定一切。

## 快速开始

```bash
# Docker 单行部署
docker run -d --name asset-tracker -p 8085:8085 \
  -v ./data:/opt/asset-tracker \
  -e ASSET_INITIAL_PASSWORD=你的密码 \
  ghcr.io/hancic128/asset-tracker:latest
```

访问 `http://<IP>:8085`，首次登录后设置口令。

更多部署方式见 [部署指南](docs/deploy.md)。

## 特性

- **订阅管理** — 按周期摊销、到期提醒、续订记录
- **储值卡** — 按金额或按次数，余额/余次追踪
- **每日摘要** — 内置 webhook 推送，无需外部 cron
- **PWA** — 可添加到主屏幕，离线可用
- **单文件后端** — Python 标准库，无框架、无 pip 依赖
- **同源部署** — 前端由后端直接托管，无 CORS

## 技术栈

| 层 | 技术 |
|---|------|
| 后端 | Python 3.11 标准库 + SQLite |
| 前端 | Vite + React + TypeScript + Tailwind |
| 认证 | PBKDF2-HMAC-SHA256，200k 轮 |
| 部署 | Docker，单镜像，无额外依赖 |

## 文档

| 文档 | 内容 |
|------|------|
| [部署指南](docs/deploy.md) | Docker / docker-compose / 反向代理 / 数据备份 |
| [开发指南](docs/develop.md) | 本地开发、测试、构建 |
| [API 参考](docs/api.md) | 完整 REST API 文档 |

## License

[MIT](LICENSE)
