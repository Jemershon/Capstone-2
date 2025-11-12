# File Upload Not Showing in Classwork Tab - Debug Guide

## Issue
Files uploaded through the materials UI are not appearing in the classwork/materials tab on the deployed system.

## Changes Made for Debugging

### Frontend Enhancements (Materials.jsx)
Added detailed console logging to track:
1. **Material Fetch**: Logs the class name being fetched and the results
2. **Material Creation**: Logs the full payload being sent to the backend
3. **File Upload**: Existing logs for upload progress and status

### Backend Enhancements (materials.js)
Added detailed console logging to track:
1. **Material Creation**: Logs incoming request data and validation
2. **Save Success**: Confirms when material is saved with its ID
3. **Material Fetch**: Logs query parameters and number of results found

## How to Debug

### Step 1: Check Browser Console
1. Open your deployed application
2. Press `F12` to open Developer Tools
3. Go to the **Console** tab
4. Upload a file through the materials tab
5. Look for these console messages:
   ```
   "Creating material with payload: {title, description, type, content, class}"
   "Material created successfully, refreshing list..."
   "Fetching materials for class: [classname]"
   "Materials fetched: [array of materials]"
   ```

### Step 2: Check Server Logs
1. On the deployed system, check the backend server logs
2. Look for these messages:
   ```
   "Creating material with data: {title, description, type, content, className, teacher}"
   "Material saved successfully with ID: [id]"
   "Fetching materials with query: {class: classname} page: 1 limit: 10"
   "Found X materials for query: {class: classname}"
   ```

## Common Issues & Solutions

### Issue 1: File Created but Not Showing
**Symptom**: Success message shown, but file doesn't appear after refresh

**Possible Causes**:
- Class name mismatch (e.g., "Class A" vs "class a")
- File path not being saved correctly
- Database save failing silently

**How to Check**: Look in server logs for "Found X materials" - if it shows 0, the material wasn't saved properly

---

### Issue 2: Upload Succeeds but Creation Fails
**Symptom**: File uploaded successfully, but material creation fails

**Possible Causes**:
- Missing required fields (title, type, content, class)
- User not authenticated as teacher
- Database connection issue

**How to Check**: Look for "Missing required fields:" in server logs

---

### Issue 3: Class Name Encoding Issue
**Symptom**: Materials from other classes appear, but not this one

**Possible Causes**:
- Class name has special characters that aren't encoded properly
- Class name comparison is case-sensitive

**How to Check**: 
- In browser console, check the exact class name being sent
- Verify it matches exactly in the database

---

## Verification Steps

### After Uploading a File:

1. **Browser Console Should Show**:
   ```javascript
   Creating material with payload: {
     title: "Your Title",
     description: "Your Description",
     type: "file",
     content: "/path/to/file",
     class: "ClassName"
   }
   ```

2. **Server Log Should Show**:
   ```
   Creating material with data: {...}
   Material saved successfully with ID: 66a1b2c3d4e5f6g7h8i9j0k1
   ```

3. **Next Fetch Should Show**:
   ```javascript
   Found 1 materials for query: {class: "ClassName"}
   Materials fetched: [
     {_id, title, description, type, content, class, teacher, createdAt...}
   ]
   ```

## If Issue Persists

1. **Enable additional debugging** by modifying the fetch interval
2. **Check database directly** using MongoDB compass or CLI:
   ```javascript
   db.materials.find({class: "YourClassName"})
   ```
3. **Check file system** to verify files are being saved:
   ```
   /uploads/materials/[filename]
   ```

## Performance Note
The logging has minimal performance impact and can remain in production for troubleshooting.
