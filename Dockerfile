# asset-tracker — 单机自托管（Python 标准库 + SQLite）
#
# 前端在 CI 里用 Vite 构建好，产物拷进镜像的 /app/static，由 server.py 直接托管，
# 因此前端与 API 同源，没有 CORS 问题。
#
# 数据落在 /opt/asset-tracker/asset-tracker.db（compose 数据卷提供）。

# ---------- 构建前端 ----------
# Node 24 = 当前 LTS（node 20 已过维护期，CI 上 actions 已被强制跑在 node 24 上）。
FROM node:24-alpine AS web
WORKDIR /web
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---------- 运行 ----------
FROM python:3.11-alpine
RUN apk add --no-cache tzdata && cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime \
    && echo "Asia/Shanghai" > /etc/timezone
WORKDIR /app
COPY server.py /app/server.py
COPY --from=web /web/dist /app/static
RUN mkdir -p /opt/asset-tracker
EXPOSE 8085
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD python3 -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8085/health',timeout=3)"
CMD ["python3", "/app/server.py"]
