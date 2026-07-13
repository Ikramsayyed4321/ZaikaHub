#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/www/zaika-hub"
APP_USER="www-data"
DOMAIN="${DOMAIN:-_}"

sudo apt update
sudo apt install -y nodejs npm mysql-server nginx
sudo npm install -g pm2

sudo mkdir -p "$APP_DIR"
sudo chown -R "$USER:$USER" "$APP_DIR"

echo "Copy project files to $APP_DIR, then run:"
echo "  cd $APP_DIR"
echo "  npm install"
echo "  npm run build"
echo "  npm run migrate"
echo "  pm2 start ecosystem.config.cjs --env production"

sudo tee /etc/nginx/sites-available/zaika-hub >/dev/null <<NGINX
server {
  listen 80;
  server_name $DOMAIN;

  root $APP_DIR/dist;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:3001/api/;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  }

  location / {
    try_files \$uri /index.html;
  }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/zaika-hub /etc/nginx/sites-enabled/zaika-hub
sudo nginx -t
sudo systemctl reload nginx
