# Netlify Deployment

Use Netlify only for the React/Vite frontend when the Express API runs separately on Render.

- Build command: `npm ci && npm run build`
- Publish directory: `dist`

Required environment variable:

```env
VITE_API_URL=https://your-render-api.onrender.com/api
```

The backend Render service must set:

```env
CLIENT_ORIGIN=https://your-netlify-site.netlify.app
SERVE_STATIC_FRONTEND=false
```

For React Router refresh support on Netlify, add a redirect rule in the Netlify UI or a `_redirects` file:

```text
/* /index.html 200
```
