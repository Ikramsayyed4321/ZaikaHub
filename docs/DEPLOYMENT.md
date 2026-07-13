# Ubuntu 24.04 Deployment Guide

## Server Requirements

- Ubuntu 24.04
- MySQL Community Edition on the same VPS
- Node.js
- Nginx
- PM2

## Steps

```bash
sudo apt update
sudo apt install -y nodejs npm mysql-server nginx
sudo npm install -g pm2
```

Copy the project to:

```text
/var/www/zaika-hub
```

Create production `.env`:

```env
NODE_ENV=production
DB_HOST=localhost
DB_PORT=3306
DB_USER=zaika_user
DB_PASSWORD=strong_password
DB_NAME=restaurant_db
API_PORT=3001
CLIENT_ORIGIN=https://your-domain.com
VITE_API_URL=https://your-domain.com/api
JWT_SECRET=strong_random_value
JWT_REFRESH_SECRET=another_strong_random_value
```

Build and start:

```bash
npm install
npm run build
npm run migrate
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

Configure Nginx using `scripts/deploy-ubuntu-24.04.sh`.
