Deployment notes

Frontend (Vercel):
- The frontend lives in `frontend/react-app` and uses Vite.
- `vercel.json` is present to rewrite client routes to `index.html`.
- Vercel settings:
  - Framework: Other (Static)
  - Build Command: `npm run vercel-build` (run in `frontend/react-app`)
  - Output Directory: `frontend/react-app/dist`

Suggested steps to deploy frontend to Vercel:
1. Login to Vercel and import the GitHub repo.
2. In the project settings, set the root directory to `frontend/react-app`.
3. Set the Build Command to `npm run vercel-build` and Output Directory to `dist`.
4. Add any required environment variables under the project settings.

Backend + Full repo (Railway):
- `railway.toml` is configured to run `npm start` from the repo root.
- The `buildCommand` builds the frontend first, then Railway will run `npm start` which starts the backend.

Suggested steps to deploy to Railway:
1. Login to Railway and create a new project from GitHub.
2. Make sure Railway picks up `railway.toml` in the repo root.
3. Set environment variables (MONGO_URI, JWT_SECRET, CLOUDINARY_URL, etc.) in Railway.
4. Railway will run the build and then use the `startCommand` to start the backend server.

Notes:
- I pushed a backup branch `remote-backup-<timestamp>` before forcing `main` to Oct 4 state.
- If you want the frontend and backend deployed separately, deploy the frontend to Vercel and the backend to Railway.
