# Render Deployment

## Single Render Web Service

Use this when Render serves both the Express API and the Vite build.

- Runtime: Node
- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Health check path: `/api/health`

Required environment variables:

```env
NODE_ENV=production
DATABASE_URL=mysql://USER:PASSWORD@HOST:4000/DB_NAME
DB_SSL=true
JWT_SECRET=replace-with-a-long-random-secret
JWT_REFRESH_SECRET=replace-with-a-different-long-random-secret
CLIENT_ORIGIN=https://your-render-service.onrender.com
SERVE_STATIC_FRONTEND=true
TRUST_PROXY=true
```

Render provides `PORT`; the backend uses `PORT` first and falls back to `API_PORT`.

## Backend-Only Render Service

Use this when Netlify serves the frontend.

```env
NODE_ENV=production
DATABASE_URL=mysql://USER:PASSWORD@HOST:4000/DB_NAME
DB_SSL=true
JWT_SECRET=replace-with-a-long-random-secret
JWT_REFRESH_SECRET=replace-with-a-different-long-random-secret
CLIENT_ORIGIN=https://your-netlify-site.netlify.app
SERVE_STATIC_FRONTEND=false
TRUST_PROXY=true
```

Set Netlify `VITE_API_URL` to `https://your-render-api.onrender.com/api`.

## Production Seed

Production seeding is never automatic. To create or update the initial admin user after deployment, run:

```bash
NODE_ENV=production CONFIRM_PRODUCTION_SEED=true PROD_SEED_ADMIN_EMAIL=admin@example.com PROD_SEED_ADMIN_PASSWORD='use-a-strong-16-char-password' npm run seed:prod
```
