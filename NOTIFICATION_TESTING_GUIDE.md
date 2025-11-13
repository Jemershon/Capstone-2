# Notification System Testing Guide

## Changes Made

### 1. Socket Authentication Fix
- **StudentD.jsx**: Replaced direct `io(API_BASE_URL)` calls with `ensureSocketConnected()` from shared socket client
- **TeacherD.jsx**: Updated to use shared socket client for consistency and proper authentication
- **Impact**: All components now use a single authenticated socket connection that persists across the app

### 2. Files Modified
1. `frontend/react-app/src/GCR/StudentD.jsx`
   - Removed: `import { io } from "socket.io-client"`
   - Added: `import { ensureSocketConnected } from "../socketClient"`
   - Updated socket initialization at line 1642 (StudentClassStream)
   - Updated socket emission at line 2291 (exam submission)

2. `frontend/react-app/src/GCR/TeacherD.jsx`
   - Removed: `import { io } from "socket.io-client"`
   - Added: `import { ensureSocketConnected } from "../socketClient"`
   - Updated socket initialization at line 1977 (TeacherClassStream)
   - Updated socket initialization at line 4903 (Leaderboard/Grades)

## How the Notification System Works (End-to-End)

### Step 1: Teacher Posts Announcement
```
Teacher clicks "Post" in stream
→ POST /api/announcements endpoint triggered
```

### Step 2: Backend Notification Creation
```
Backend (server.js lines 2410-2485):
1. Create Announcement document in DB
2. Get list of students in class (cls.students)
3. Create Notification documents for each student
4. Save notifications to DB via Notification.insertMany()
5. Emit Socket.IO events to each student in user:${username} room
6. Send email notifications via SendGrid (async, in background)
```

### Step 3: Frontend Socket Reception
```
Student client receives socket event:
1. NotificationsDropdown has socket listener: socket.on('new-notification', ...)
2. Event is received and notification added to state
3. Unread count badge updated
4. Notification appears in dropdown menu
5. Desktop notification shown (if browser permission granted)
```

### Step 4: Notification Persistence
```
Student can:
- View unread notifications in dropdown
- Mark individual notifications as read
- Delete notifications
- Mark all as read
- View full notification list in modal
```

## Testing Checklist

### Prerequisites
- [ ] Backend is running (npm start or npm run dev in `/backend`)
- [ ] Frontend is running (npm start in `/frontend/react-app`)
- [ ] MongoDB is running and accessible
- [ ] Teacher and Student accounts created
- [ ] Teacher is in a class with students

### Test 1: Basic Announcement Notification (Socket)
**Objective**: Verify real-time socket notification delivery

**Steps**:
1. Open browser DevTools on **Student** browser tab
   - Go to Console
   - Filter for "Socket" messages
   
2. Open browser DevTools on **Teacher** browser tab
   - Go to Console
   - Filter for "notification" messages

3. **Teacher**: Navigate to a class
4. **Teacher**: Type an announcement and click "Post"
5. **Student**: Watch for notification

**Expected Results**:
- Teacher Console shows:
  ```
  ✅ Announcement notifications sent to students in [ClassName]
  📧 Sending announcement emails to X students...
  ✅ Email notifications sent: X successful, 0 failed
  Emitting announcement to class:[ClassName]
  ```

- Student Console shows:
  ```
  [Socket.IO] Connected: [socket-id]
  [Socket.IO] Sent authenticate event
  [NotificationsDropdown] Received notification via socket: {type: 'announcement', message: '...', class: '...', sender: '...'}
  ```

- Student UI shows:
  - Bell icon with red badge showing "1"
  - Notification appears in dropdown with message
  - Can click to mark as read
  - Can click to delete

### Test 2: Email Notification Delivery
**Objective**: Verify email notifications are sent

**Prerequisites**: 
- SendGrid API key configured in `.env` as `SENDGRID_API_KEY`
- Test email addresses configured for students

**Steps**:
1. Follow Test 1 steps to post announcement
2. Check student email inbox
3. Look for email from noreply@ccsgoals.me (or configured sender)

**Expected Results**:
- Email arrives within 1-2 minutes
- Email contains:
  - Teacher name
  - Class name
  - Announcement message
  - Link to view in platform

### Test 3: Multiple Students Receive Notifications
**Objective**: Verify all class students receive notifications

**Steps**:
1. Enroll multiple students in same class
2. Open StudentD dashboard in separate browser tabs/windows for each student
3. Post announcement as teacher
4. Check each student's notification dropdown

**Expected Results**:
- All students' bell icons show badge "1"
- All students see announcement in dropdown
- All students can interact with notification independently

### Test 4: Notification Persistence
**Objective**: Verify notifications stored in database and survive refresh

**Steps**:
1. Student receives notification
2. Student refreshes page (F5 or Cmd+R)
3. Check notification is still visible

**Expected Results**:
- Notification still appears in dropdown after refresh
- Unread count preserved
- Mark as read status preserved

### Test 5: Socket Reconnection
**Objective**: Verify socket reconnects after disconnect

**Steps**:
1. Open browser DevTools Network tab
2. Throttle connection to "Offline"
3. Teacher posts announcement
4. Restore connection to normal
5. Watch for socket reconnection

**Expected Results**:
- Student console shows:
  ```
  [Socket.IO] Disconnected: ...
  [Socket.IO] Connected: [new-socket-id]
  [Socket.IO] Sent authenticate event
  ```
- After reconnect, if announcement was posted during disconnect, notification should appear

### Test 6: Form Submission Real-Time Updates
**Objective**: Verify socket events work for forms too

**Steps**:
1. Teacher creates a form and assigns to class
2. Student submits form
3. Watch for real-time updates on teacher's form submissions page

**Expected Results**:
- Teacher sees "Form submitted" notification
- Teacher's form submission list updates in real-time
- Can see student's response count update

### Test 7: Exam Submission Real-Time Updates  
**Objective**: Verify socket events work for exams too

**Steps**:
1. Teacher creates an exam and assigns to class
2. Student takes and submits exam
3. Watch teacher's grades page

**Expected Results**:
- Teacher sees submission in grades immediately
- Leaderboard updates in real-time
- No page refresh needed

## Troubleshooting

### Issue: Notifications not appearing
**Diagnostic Steps**:
1. Check browser console for errors (should see Socket.IO connected message)
2. Check backend console for notification emission logs
3. Verify student is enrolled in class
4. Verify teacher and student use different accounts
5. Check database: `db.notifications.find({recipient: 'studentUsername'})`

**Common Causes**:
- Socket not authenticated: Look for "Socket authentication failed" in backend console
- Wrong room name: Backend should emit to `user:${studentUsername}` not `user:username`
- Student not in class: Verify class enrollment
- Notifications disabled: Check browser notification permissions

### Issue: Duplicate notifications
**Cause**: Old socket connection still active
**Fix**: 
- Force refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
- Check that no other tabs have StudentD open
- Verify only one socket instance per component

### Issue: Email not arriving
**Diagnostic Steps**:
1. Check SendGrid dashboard for bounce/delivery failures
2. Check backend logs for "Email notifications sent: X successful, Y failed"
3. Verify `SENDGRID_API_KEY` is set in backend `.env`
4. Verify student email address is saved in database

**Common Causes**:
- Invalid/empty email address
- SendGrid API key missing or invalid
- Email marked as spam
- Student's email domain blocklisted

### Issue: Socket connection error
**Error**: "Socket connection error: ...CORS..."
**Fix**: 
- Verify `CORS_ORIGIN` environment variable includes frontend URL
- Check `socket.js` allowlist includes frontend origin
- Ensure frontend and backend on same domain (or properly configured for CORS)

## Performance Notes

- Socket authentication happens once per page load
- Each notification action (mark read, delete) requires API call
- Notifications fetched on mount and updated via socket
- Database queries optimized with indexes on `recipient` and `read` fields
- Async email sending doesn't block response

## Architecture Diagram

```
Teacher Post Announcement
        ↓
POST /api/announcements
        ↓
┌─────────────────────────────────────┐
│ Backend: server.js (Lines 2410-2485)│
│ 1. Create Announcement DB record    │
│ 2. Get class students list          │
│ 3. Create Notification records      │
└─────────────┬───────────────────────┘
              ├─→ Notification.insertMany() [DB]
              ├─→ io.to(user:${name}).emit('new-notification')
              │                ↓
              │   ┌──────────────────────────────┐
              │   │ Student Frontend             │
              │   │ NotificationsDropdown.jsx    │
              │   │ socket.on('new-notification')│
              │   │ Update state → UI update     │
              │   └──────────────────────────────┘
              │
              └─→ SendGrid.send() [Email]
                        ↓
                  Student's Email Inbox
```

## Key Files Reference

- **Frontend Socket Setup**: `frontend/react-app/src/socketClient.js`
- **Frontend Notification Component**: `frontend/react-app/src/GCR/components/NotificationsDropdown.jsx`
- **StudentD Component**: `frontend/react-app/src/GCR/StudentD.jsx`
- **TeacherD Component**: `frontend/react-app/src/GCR/TeacherD.jsx`
- **Backend Socket Setup**: `backend/socket.js`
- **Backend Announcements Route**: `backend/server.js` (lines 2380-2490)
- **Backend Notifications Route**: `backend/routes/notifications.js`
- **Notification Model**: `backend/models/Notification.js`
