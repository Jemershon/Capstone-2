# Render.com Environment Variables Reference

## 🔧 Required Environment Variables for Backend

Copy these environment variables to your Render.com service:

### **Authentication & Security**
```
JWT_SECRET=capstone2-super-secure-jwt-secret-key-32-chars-minimum-random-string-2025
GOOGLE_CLIENT_ID=628562218393-7ta3999bue8u991obditpp94vabiegk0.apps.googleusercontent.com
```

### **Database**
```
MONGODB_URI=mongodb+srv://jamesborromeo3_db_user:styfqE3CYTtf7o6Y@cluster0.gje6jlr.mongodb.net/notetify?retryWrites=true&w=majority&appName=Cluster0
```

### **Server Configuration**
```
PORT=4000
NODE_ENV=production
```

### **🚨 CORS Configuration (CRITICAL for fixing the error)**
```
CORS_ORIGIN=https://ccsgoals.me,https://www.ccsgoals.me
FRONTEND_URL=https://ccsgoals.me
```

### **Email Service**
```
EMAIL_USER=adanjemershon@gmail.com
EMAIL_PASS=fmzvwqjyncbdqena
```

### **File Upload**
```
MAX_FILE_SIZE=25
```

### **Cloudinary (Optional - for production file storage)**
```
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

---

## 📝 How to Add Environment Variables on Render.com

### Method 1: Through Dashboard (Recommended)

1. **Go to Render Dashboard:**
   - Visit: https://dashboard.render.com/
   - Select your `goals-ccs` service

2. **Navigate to Environment:**
   - Click "Environment" in left sidebar

3. **Add Variables One by One:**
   - Click "Add Environment Variable"
   - Enter Key (e.g., `CORS_ORIGIN`)
   - Enter Value (e.g., `https://ccsgoals.me,https://www.ccsgoals.me`)
   - Click "Save Changes"

4. **Repeat for All Variables Above**

### Method 2: Bulk Add (Faster)

1. Click "Add Environment Variable"
2. Click "Add from .env"
3. Paste all variables at once:

```env
JWT_SECRET=capstone2-super-secure-jwt-secret-key-32-chars-minimum-random-string-2025
GOOGLE_CLIENT_ID=628562218393-7ta3999bue8u991obditpp94vabiegk0.apps.googleusercontent.com
MONGODB_URI=mongodb+srv://jamesborromeo3_db_user:styfqE3CYTtf7o6Y@cluster0.gje6jlr.mongodb.net/notetify?retryWrites=true&w=majority&appName=Cluster0
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://ccsgoals.me,https://www.ccsgoals.me
FRONTEND_URL=https://ccsgoals.me
EMAIL_USER=adanjemershon@gmail.com
EMAIL_PASS=fmzvwqjyncbdqena
MAX_FILE_SIZE=25
```

4. Click "Save"

---

## ⚠️ Most Important Variable (to fix CORS error)

**This is the one causing your CORS error:**

```
CORS_ORIGIN=https://ccsgoals.me,https://www.ccsgoals.me
```

**Make sure:**
- ✅ No spaces after comma
- ✅ No trailing slashes (e.g., NOT `https://ccsgoals.me/`)
- ✅ Both www and non-www versions included
- ✅ Exact match with your frontend domain

---

## 🔄 After Adding/Updating Variables

Render will **automatically redeploy** your service when you save environment variables.

**Monitor the deployment:**
1. Go to "Logs" tab
2. Wait for "Your service is live 🎉"
3. Takes 2-5 minutes

---

## ✅ Verification Checklist

After deployment, verify these:

- [ ] Backend is running: https://goals-ccs.onrender.com
- [ ] Frontend loads: https://ccsgoals.me
- [ ] Login works without CORS error
- [ ] Browser console (F12) shows no errors
- [ ] API requests succeed

---

## 🐛 Common Issues

### Issue 1: CORS error persists
**Solution:** 
- Double-check `CORS_ORIGIN` value (no typos!)
- Make sure deployment finished
- Clear browser cache (Ctrl+Shift+Delete)

### Issue 2: Deployment fails
**Solution:**
- Check Render logs for errors
- Verify all required variables are set
- Make sure MongoDB URI is correct

### Issue 3: 500 Internal Server Error
**Solution:**
- Check MongoDB connection (verify MONGODB_URI)
- Check JWT_SECRET is set
- Review Render logs for stack traces

---

**Last Updated:** November 9, 2025
**Git Commit:** 90bfc92
