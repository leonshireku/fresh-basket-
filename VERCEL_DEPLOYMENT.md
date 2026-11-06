# Deploying Freshmat / FreshBasket to Vercel

Your project is now fully configured for deployment on **Vercel** with global edge CDN caching for static assets and serverless Node.js functions for backend APIs.

---

## 1. Quick Deploy via Vercel Dashboard (Recommended)

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "feat: configure project for Vercel deployment"
   git push origin main
   ```

2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com) and log in with your GitHub account.
   - Click **Add New...** > **Project**.
   - Select your GitHub repository (`freshmat-ecommerce`).
   - **Framework Preset**: Leave as **Other**.
   - **Root Directory**: `./` (default).
   - **Build and Output Settings**: Leave defaults (no build command needed).

3. **Configure Database Environment Variables** (in Vercel project settings):
   Add the following variables under **Settings** > **Environment Variables**:
   - `DB_HOST`: Your cloud database host (e.g., from [TiDB Cloud](https://tidbcloud.com) or [Aiven](https://aiven.io))
   - `DB_PORT`: `3306` (or provided port)
   - `DB_USER`: Your cloud database username
   - `DB_PASSWORD`: Your cloud database password
   - `DB_NAME`: `freshbasket`
   - `DB_SSL`: `true`

4. Click **Deploy**. Vercel will complete the deployment in ~30 seconds and provide a live `https://...vercel.app` URL.

---

## 2. Deploy via Vercel CLI (Alternative)

If you have the Vercel CLI installed:

```bash
# Install Vercel CLI globally (one time)
npm install -g vercel

# Deploy directly from terminal
vercel

# Deploy to production
vercel --prod
```

---

## Architecture on Vercel

```
Incoming Request
      │
      ├── Static Assets (index.html, style.css, images, *.js)
      │     └── Served instantly by Vercel Edge CDN (0ms cold start)
      │
      └── API Requests (/api/products, /api/orders, /api/auth, /api/stats)
            └── Routed via vercel.json to api/index.js (Serverless Function)
                  └── Connects to Cloud MySQL with TLS/SSL encryption
```

---

## Files Configured for Vercel

- `vercel.json`: Directs `/api/*` traffic to the serverless function while serving root static files.
- `api/index.js`: Serverless entry point adapting Vercel requests to the backend.
- `server.js`: Dual-mode (runs standalone locally or serverless on Vercel).
- `db.js`: Enhanced with automatic TLS/SSL support for cloud database connections.
- `.vercelignore`: Keeps sensitive files and local logs out of the deployment bundle.

