#!/bin/bash
# ============================================
# 众像美术馆后端 - 一键部署脚本（腾讯云 CVM）
# 系统：Ubuntu 22.04 / 20.04
# 用法：chmod +x deploy.sh && ./deploy.sh
# ============================================

set -e

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║   众像美术馆后端 - 一键部署脚本      ║"
echo "  ║   腾讯云 CVM Ubuntu Server           ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# ---------- 配置区 ----------
APP_DIR="/opt/museum-server"
APP_NAME="museum-server"
NODE_VERSION="18"
NGINX_CONF="/etc/nginx/sites-available/museum-server"
# ----------------------------

# 1. 检查是否为 root
if [ "$(id -u)" -ne 0 ]; then
  echo "❌ 请使用 root 权限运行此脚本"
  echo "   命令：sudo bash deploy.sh"
  exit 1
fi

# 2. 更新系统
echo "📦 [1/8] 更新系统软件包..."
apt-get update -yqq
apt-get upgrade -yqq

# 3. 安装基础软件
echo "📦 [2/8] 安装 Nginx、Git、curl..."
apt-get install -yqq nginx git curl wget unzip

# 4. 安装 Node.js 18
echo "📦 [3/8] 安装 Node.js ${NODE_VERSION}..."
if command -v node &>/dev/null; then
  echo "   ✅ Node.js 已安装：$(node -v)"
else
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -yqq nodejs
  echo "   ✅ Node.js 安装完成：$(node -v)"
fi

# 5. 安装 PM2
echo "📦 [4/8] 安装 PM2..."
if command -v pm2 &>/dev/null; then
  echo "   ✅ PM2 已安装"
else
  npm install -g pm2
  echo "   ✅ PM2 安装完成"
fi

# 6. 部署应用
echo "📦 [5/8] 部署后端代码..."
if [ -d "$APP_DIR" ]; then
  echo "   📂 目录已存在，更新代码..."
  cd "$APP_DIR"
  git pull origin main 2>/dev/null || echo "   ⚠️ 非仓库目录，跳过 git pull"
else
  mkdir -p "$APP_DIR"
  echo "   📂 创建目录：$APP_DIR"
  echo "   ⚠️ 请手动将代码上传到此目录后再运行 npm install"
fi

cd "$APP_DIR"

# 创建必要目录
mkdir -p data uploads

# 安装依赖
echo "📦 [6/8] 安装 Node.js 依赖..."
npm install --production

# 初始化数据库
echo "📦 [7/8] 初始化数据库..."
if [ -f "seed.js" ]; then
  node seed.js
fi

# 创建 .env 文件
if [ ! -f .env ]; then
  JWT_SECRET=$(openssl rand -hex 32)
  cat > .env << ENVEOF
# 众像美术馆后端 - 生产环境配置
NODE_ENV=production
PORT=3000
DATA_DIR=/opt/museum-server/data
JWT_SECRET=${JWT_SECRET}
FRONTEND_URL=https://www.zxmeishu.fun
ENVEOF
  echo "   ✅ 已创建 .env 文件"
  echo "   🔑 JWT_SECRET: ${JWT_SECRET}"
else
  echo "   ✅ .env 文件已存在"
fi

# 7. 配置 Nginx 反向代理
echo "📦 [8/8] 配置 Nginx..."
cat > "$NGINX_CONF" << 'NGINXEOF'
server {
    listen 80;
    server_name _;

    # 安全限制：上传文件最大 10MB
    client_max_body_size 10M;

    # API 反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    # 上传文件访问
    location /uploads/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}
NGINXEOF

# 启用站点配置
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/museum-server
rm -f /etc/nginx/sites-enabled/default

# 测试 Nginx 配置
nginx -t

# 重启 Nginx
systemctl restart nginx
systemctl enable nginx

# 8. 使用 PM2 启动应用
echo "🚀 启动后端服务..."
pm2 delete "$APP_NAME" 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup 2>/dev/null || true

# 完成
echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║        ✅ 部署完成！                ║"
echo "  ╚══════════════════════════════════════╝"
echo ""
echo "  📍 后端 API 地址：http://$(curl -s ifconfig.me 2>/dev/null || echo '你的服务器IP'):3000"
echo "  📍 Nginx 代理地址：http://$(curl -s ifconfig.me 2>/dev/null || echo '你的服务器IP')"
echo ""
echo "  📋 常用命令："
echo "     pm2 logs museum-server     # 查看日志"
echo "     pm2 restart museum-server  # 重启服务"
echo "     pm2 stop museum-server     # 停止服务"
echo ""
echo "  🔜 下一步："
echo "     1. 在腾讯云控制台 → 安全组 → 开放 80 和 3000 端口"
echo "     2. 配置域名解析（如 api.zxmeishu.fun → 服务器IP）"
echo "     3. 申请 SSL 证书（可选，推荐 Let's Encrypt 免费证书）"
echo ""
