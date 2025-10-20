# Deploying backend to Render

This document explains how to finish deploying the backend to Render, what environment variables to set, and how to trigger a deploy using the helper scripts in `/scripts`.

1) Create a Web Service on Render
- In Render: New -> Web Service
- Connect your GitHub repo and select `main` branch
- Set Root Directory to `backend`
- Build Command: `npm ci --no-audit --no-fund`
- Start Command: `npm start`
- Health Check Path: `/health`

2) Set environment variables in the Render dashboard (Service -> Environment)
- MONGODB_URI (MongoDB Atlas connection string)
- JWT_SECRET (strong secret)
- GOOGLE_CLIENT_ID (Google OAuth client ID)
- CLOUDINARY_URL (if using Cloudinary)
- EMAIL_USER
- EMAIL_PASS
- CORS_ORIGIN (frontend origin, e.g., https://www.your-frontend.com)
- NODE_ENV=production

3) Trigger a deploy
- Option A: Use the Render UI -> Manual Deploy
- Option B: Use the helper scripts in `/scripts` (PowerShell or Bash)

PowerShell example:
```powershell
.
\scripts\deploy_render.ps1 -renderApiKey $env:RENDER_API_KEY -renderServiceName "capstone-backend"
```

Bash example:
```bash
export RENDER_API_KEY=your_key_here
./scripts/deploy_render.sh capstone-backend main
```

4) Verify
- Check Render logs for successful startup and MongoDB connection messages.
- Test health endpoint:
  - curl https://<your-backend-domain>/health
  - or PowerShell: Invoke-WebRequest -Uri https://<your-backend-domain>/health -UseBasicParsing

5) After deploy
- Update frontend `VITE_API_URL` on Vercel to point to your backend domain.
- Update Google OAuth allowed origins/redirect URIs to include your frontend and backend domains.
