# 部署指南

## 环境变量

| 变量 | 默认 | 说明 |
|---|---|---|
| `ASSET_HOST` | `0.0.0.0` | 监听地址 |
| `ASSET_PORT` | `8085` | 监听端口 |
| `ASSET_DB` | `/opt/asset-tracker/asset-tracker.db` | 数据库路径 |
| `ASSET_STATIC` | `/app/static` | 前端产物目录（不要改） |
| `ASSET_VERSION` | `dev` | 版本标识，显示在顶栏 |
| `ASSET_INITIAL_PASSWORD` | 空 | 首次部署设置口令，已设则忽略 |
| `ASSET_DIGEST_HOUR` | `9` | 每日 webhook 推送时刻（0-23，Asia/Shanghai） |

## Docker 单行部署

```bash
docker run -d \
  --name asset-tracker \
  -p 8085:8085 \
  -v ./data:/opt/asset-tracker \
  -e ASSET_INITIAL_PASSWORD=你的密码 \
  ghcr.io/hancic128/asset-tracker:latest
```

## docker-compose 部署

```yaml
services:
  asset-tracker:
    image: ghcr.io/hancic128/asset-tracker:latest
    restart: unless-stopped
    ports:
      - "8085:8085"
    volumes:
      - ./data:/opt/asset-tracker
    environment:
      - ASSET_INITIAL_PASSWORD=你的密码
      - ASSET_DIGEST_HOUR=9
```

启动：

```bash
docker compose up -d
```

## 反向代理

服务本身不处理 HTTPS，推荐用 nginx / Caddy 在前面做反代：

### Nginx

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8085;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Caddy

```Caddyfile
your-domain.com {
    reverse_proxy localhost:8085
}
```

## 数据备份

数据库文件在 `/opt/asset-tracker/asset-tracker.db`（docker-compose 挂载的 `./data` 目录）。

备份方式：

```bash
# 停止容器
docker compose stop

# 备份数据目录
cp -r data data.bak-$(date +%Y%m%d)

# 恢复时把备份拷回去
cp data.bak-20240101/* data/
```
