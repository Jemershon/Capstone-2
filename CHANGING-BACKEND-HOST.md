# Guide: Changing Your Backend Hosting from Railway

## Current Setup Overview

Your system is currently deployed as:
- **Frontend (React)**: Hosted on **Vercel** 
- **Backend (Node.js/Express)**: Hosted on **Railway**
- **Database (MongoDB)**: Hosted on **MongoDB Atlas**

## Why You Might Want to Change Railway

Common reasons:
1. **Cost** - Railway has pricing plans, you might want a free alternative
2. **Performance** - Need better server specs or different regions
3. **Features** - Need specific features Railway doesn't offer
4. **Limits** - Hit usage limits on Railway's free tier

---

## Alternative Backend Hosting Options

### 1. **Render.com** (Most Similar to Railway - RECOMMENDED)
- ✅ Free tier available (750 hours/month)
- ✅ Auto-deploys from GitHub
- ✅ Easy setup, similar to Railway
- ✅ Good for Node.js apps
- ❌ Free tier sleeps after 15 mins of inactivity

### 2. **Heroku**
- ✅ Well-established platform
- ✅ Good documentation
- ❌ No free tier anymore (starts at $5/month)
- ✅ More add-ons and integrations

### 3. **DigitalOcean App Platform**
- ✅ $5/month starter tier
- ✅ Good performance
- ✅ No sleep on apps
- ❌ More complex setup

### 4. **AWS EC2 / Azure / Google Cloud**
- ✅ Most powerful and scalable
- ✅ More control
- ❌ Most complex to set up
- ❌ Can be expensive

### 5. **Fly.io**
- ✅ Free tier available
- ✅ Fast global deployment
- ✅ Docker-based
- ❌ Slightly more technical

---

## How to Migrate from Railway to Render.com (Step-by-Step)

### Step 1: Prepare Your Backend
Your backend is already ready! It's in the `/backend` folder with:
- ✅ `server.js` - main file
- ✅ `package.json` - dependencies
- ✅ Environment variables configured

### Step 2: Sign Up for Render
1. Go to https://render.com
2. Click **"Get Started"** or **"Sign Up"**
3. Choose **"Sign up with GitHub"**
4. Authorize Render to access your GitHub account

### Step 3: Create a New Web Service
1. Once logged in, click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: **Jemershon/Capstone-2**
3. Render will detect your repository

### Step 4: Configure Your Service
Fill in these settings:

**Basic Settings:**
- **Name**: `capstone-backend` (or any name you want)
- **Region**: Choose closest to your users (e.g., Oregon USA)
- **Branch**: `main`
- **Root Directory**: `backend` ⚠️ IMPORTANT!
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `node server.js`

**Instance Type:**
- Select **"Free"** (or paid if you need no sleep)

### Step 5: Add Environment Variables
Click **"Advanced"** → **"Add Environment Variable"**

Add ALL these variables (get values from your Railway project):

```env
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb+srv://jamesborromeo3_db_user:YOUR_PASSWORD@cluster0.gje6jlr.mongodb.net/notetify?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters-long
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://your-vercel-app.vercel.app
MAX_FILE_SIZE=25
ALLOWED_FILE_TYPES=pdf,doc,docx,ppt,pptx,xls,xlsx,txt,zip,rar,jpg,jpeg,png,mp4,mov,mp3,wav
```

⚠️ **IMPORTANT**: 
- Replace `YOUR_PASSWORD` with your actual MongoDB password
- Replace `your-vercel-app.vercel.app` with your actual Vercel URL
- Copy your `JWT_SECRET` from Railway (keep it the same)

### Step 6: Deploy
1. Click **"Create Web Service"**
2. Render will start building and deploying
3. Wait for the deployment to complete (2-5 minutes)
4. You'll get a URL like: `https://capstone-backend.onrender.com`

### Step 7: Update Your Frontend (Vercel)
Now you need to tell your frontend to use the new backend URL:

1. Go to https://vercel.com
2. Open your frontend project
3. Click **"Settings"** → **"Environment Variables"**
4. Find or add: `VITE_API_URL`
5. Update its value to: `https://capstone-backend.onrender.com`
6. Click **"Save"**
7. Go to **"Deployments"** tab
8. Click the **"..."** menu on the latest deployment
9. Click **"Redeploy"** to apply the new environment variable

### Step 8: Test Your Application
1. Open your Vercel frontend URL
2. Try to login/register
3. Test creating/viewing classes, exams, etc.
4. Check if everything works!

### Step 9: (Optional) Remove Railway Deployment
Once everything works on Render:
1. Go to Railway dashboard
2. Select your project
3. Click **"Settings"**
4. Scroll down and click **"Delete Project"**

---

## Important Files for Different Platforms

### For Render.com (What you need):
- ✅ `package.json` - Already have it
- ✅ `server.js` - Already have it
- ✅ Environment variables - Set in Render dashboard

### For Heroku (If you choose this instead):
You'll need to create a `Procfile`:
```
web: cd backend && node server.js
```

### For DigitalOcean App Platform:
Create `.do/app.yaml`:
```yaml
name: capstone-backend
region: nyc
services:
  - name: backend
    source_dir: /backend
    github:
      repo: Jemershon/Capstone-2
      branch: main
    environment_slug: node-js
    run_command: node server.js
    envs:
      - key: NODE_ENV
        value: production
      # Add other env vars here
```

---

## Troubleshooting Common Issues

### Issue 1: Backend URL Not Working
**Problem**: Getting 404 or connection errors
**Solution**: 
- Check if backend deployment succeeded on new platform
- Verify environment variables are set correctly
- Make sure CORS_ORIGIN matches your Vercel URL exactly

### Issue 2: Database Connection Failed
**Problem**: "Failed to connect to MongoDB"
**Solution**:
- Check MONGODB_URI is correct
- Verify MongoDB Atlas allows connections from anywhere (0.0.0.0/0)
- Check if MongoDB password has special characters (might need URL encoding)

### Issue 3: Frontend Can't Connect to Backend
**Problem**: Login/Register not working
**Solution**:
1. Check browser console for CORS errors
2. Verify VITE_API_URL in Vercel matches new backend URL
3. Make sure you redeployed frontend after changing env variable
4. Check if CORS_ORIGIN in backend matches your Vercel URL

### Issue 4: File Uploads Not Working
**Problem**: Materials/assignments can't be uploaded
**Solution**:
- Check MAX_FILE_SIZE and ALLOWED_FILE_TYPES are set
- Verify backend has write permissions
- Check if Cloudinary env vars are set (if using Cloudinary)

---

## Cost Comparison

| Platform | Free Tier | Paid Tier | Sleep Policy |
|----------|-----------|-----------|--------------|
| **Railway** | $5 credit/month | $0.000231/GB-hour | No sleep |
| **Render** | 750 hours/month | $7/month | Sleeps after 15 min |
| **Heroku** | None | $5-7/month | No sleep on paid |
| **Fly.io** | 3 VMs free | $1.94/month per VM | No sleep |
| **DigitalOcean** | None | $5/month | No sleep |

---

## Quick Migration Checklist

- [ ] Choose new hosting platform (Render recommended)
- [ ] Sign up and connect GitHub
- [ ] Configure build settings (root: backend, start: node server.js)
- [ ] Copy ALL environment variables from Railway
- [ ] Deploy and wait for build to complete
- [ ] Get new backend URL
- [ ] Update VITE_API_URL in Vercel
- [ ] Redeploy frontend on Vercel
- [ ] Test all features thoroughly
- [ ] Update JWT_SECRET in backend if needed (optional)
- [ ] Delete old Railway project (optional)

---

## Need Help?

If you encounter issues:
1. Check deployment logs on your new platform
2. Check browser console for errors
3. Verify all environment variables are set correctly
4. Make sure MongoDB Atlas firewall allows connections
5. Test backend directly: `https://your-backend-url.onrender.com/api/test`

---

## Backup Strategy (IMPORTANT!)

Before migrating:
1. **Export your MongoDB data** (MongoDB Atlas → Collections → Export)
2. **Save your environment variables** (copy from Railway)
3. **Keep Railway running** until new platform is confirmed working
4. **Take screenshots** of Railway configuration for reference

This way, you can always roll back if something goes wrong!
