# 开发指南

## 环境要求

- Node.js 24+
- Python 3.11+

## 本地开发

```bash
# 安装依赖
npm install

# 启动前端（需要另起后端）
npm run dev

# 另开终端启动后端
python3 server.py

# 后端单元测试
python3 -m unittest discover -s tests -v
```

前端 dev server 监听 `127.0.0.1:5173`，通过 vite.config.ts 的 proxy 转发 API 请求到后端 `127.0.0.1:8085`。

## 生产构建

```bash
npm run build
```

产物输出到 `dist/`，由 `server.py` 直接托管。

## 项目结构

```
asset-tracker/
├── server.py          # Python 后端（标准库单文件）
├── src/               # React 前端源码
│   ├── components/    # UI 组件
│   ├── hooks/         # React hooks
│   ├── lib/           # 工具函数、API 客户端
│   └── i18n/          # 国际化
├── tests/             # Python 单元测试
└── docs/              # 文档
```

## 技术细节

- **同源部署**：前端构建产物由 `server.py` 托管，API 与静态文件同源，无 CORS
- **SQLite WAL 模式**：高并发写入更安全
- **PBKDF2**：口令 200k 轮 PBKDF2-HMAC-SHA256 哈希
- **会话**：随机 token，30 天过期，改口令全量失效
- **Webhook**：内置每日定时推送线程，不依赖外部 cron
