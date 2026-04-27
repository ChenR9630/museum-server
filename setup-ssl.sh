#!/bin/bash
# ============================================
# 众像美术馆 - SSL 证书自动配置（Let's Encrypt）
# 前提：域名已解析到服务器 IP
# 用法：sudo bash setup-ssl.sh your-domain.com
# ============================================

DOMAIN=${1:-"api.zxmeishu.fun"}

echo "🔧 为 ${DOMAIN} 配置 SSL 证书..."

# 安装 certbot
apt-get install -yqq certbot python3-certbot-nginx

# 申请证书
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@zxmeishu.fun"

# 测试自动续期
certbot renew --dry-run

echo ""
echo "✅ SSL 证书配置完成！"
echo "   HTTPS 地址：https://${DOMAIN}"
echo "   证书自动续期已配置（每天检查两次）"
