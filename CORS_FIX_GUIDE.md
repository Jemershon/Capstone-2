# CORS Fix Guide - URGENT

## Problem
Your frontend at `https://ccsgoals.me` cannot access your backend at `https://goals-ccs.onrender.com` due to CORS policy blocking.

## What I Fixed Locally

1. ✅ Updated `.env` file:
   - Changed `CORS_ORIGIN` to include `https://ccsgoals.me`
   - Changed `NODE_ENV` to `production`
   - Changed `FRONTEND_URL` to `https://ccsgoals.me`

2. ✅ Improved CORS configuration in `server.js`:
   - Added explicit handling for `https://ccsgoals.me`
   - Added explicit OPTIONS preflight handler
   - Improved error handling

## CRITICAL: Update Render.com Environment Variables

**You MUST update these environment variables in your Render.com dashboard:**

### Steps:

1. Go to https://dashboard.render.com/
2. Click on your backend service: `goals-ccs`
3. Go to **Environment** tab
4. Update/Add these variables:

```
CORS_ORIGIN=https://ccsgoals.me,https://www.ccsgoals.me,https://goals-ccs.vercel.app
NODE_ENV=production
FRONTEND_URL=https://ccsgoals.me
```

5. Click **Save Changes**
6. Render will automatically redeploy your backend with the new settings

## After Updating Render Environment Variables

Your backend will restart automatically. Then:

1. Wait 2-3 minutes for deployment to complete
2. Test your login at `https://ccsgoals.me`
3. CORS errors should be gone ✅

## If Still Not Working

Check these:

1. **Browser Console**: Clear cache and hard reload (Ctrl+Shift+R)
2. **Render Logs**: Check if backend is logging CORS warnings
3. **Network Tab**: Check if OPTIONS requests are returning 204 status

## Quick Test

After updating Render variables, test with this curl command:

```bash
curl -X OPTIONS https://goals-ccs.onrender.com/api/login \
  -H "Origin: https://ccsgoals.me" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v
```

Should return:
```
< HTTP/1.1 204 No Content
< Access-Control-Allow-Origin: https://ccsgoals.me
< Access-Control-Allow-Credentials: true
```

## Summary

**Local changes are done ✅**  
**You need to update Render.com environment variables NOW ⚠️**

Once Render redeploys, CORS will work immediately.
