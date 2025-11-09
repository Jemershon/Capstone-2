# CORS Fix for Render.com Deployment

## Problem
Your frontend at `https://ccsgoals.me` is blocked by CORS when trying to access `https://goals-ccs.onrender.com`.

## Solution Applied
Updated CORS configuration in `backend/server.js` and `.env` files to allow your frontend domain.

## **IMPORTANT: Update Render.com Environment Variables**

### Steps to fix on Render.com:

1. **Go to your Render.com dashboard:**
   - Navigate to: https://dashboard.render.com/
   - Select your backend service: `goals-ccs`

2. **Update Environment Variables:**
   - Click on "Environment" in the left sidebar
   - Add or update the following variable:
   
   ```
   CORS_ORIGIN=https://ccsgoals.me,https://www.ccsgoals.me
   ```

3. **Redeploy:**
   - After saving the environment variable, Render will automatically redeploy
   - OR manually trigger a redeploy by clicking "Manual Deploy" → "Deploy latest commit"

4. **Wait for deployment:**
   - Monitor the deployment logs
   - Wait for "Your service is live" message
   - Should take 2-5 minutes

5. **Test:**
   - Go to https://ccsgoals.me
   - Try logging in
   - The CORS error should be gone!

## Verification
After deployment, check:
- [ ] Login works without CORS error
- [ ] API requests succeed
- [ ] Browser console shows no CORS errors

## Fallback
If it still doesn't work:
1. Check Render logs for any errors
2. Verify the environment variable is set correctly
3. Make sure your backend is using the latest code (check commit hash)

## Current Configuration
- **Frontend domain:** `https://ccsgoals.me`
- **Backend URL:** `https://goals-ccs.onrender.com`
- **Allowed origins:** Configured in `CORS_ORIGIN` env variable

---
**Last updated:** November 9, 2025
