# API Testing Guide for New Features

This guide provides ready-to-use API calls for testing all newly implemented features.

## Prerequisites
- Backend server running on `http://localhost:4000`
- Valid JWT token (get from login endpoint)
- Replace `YOUR_TOKEN` with actual token
- Replace `CLASS_ID`, `EXAM_ID`, etc. with actual IDs

## Environment Setup
```bash
# Set these variables in your terminal/Postman
API_BASE_URL=http://localhost:4000
TOKEN=your_jwt_token_here
```

---

## 1. Class Archiving

### Archive a Class
```bash
curl -X PATCH http://localhost:4000/api/classes/CLASS_ID/archive \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "message": "Class archived successfully",
  "class": {
    "_id": "...",
    "name": "Math 101",
    "archived": true,
    "archivedAt": "2025-11-06T10:00:00Z"
  }
}
```

### Restore a Class
```bash
curl -X PATCH http://localhost:4000/api/classes/CLASS_ID/restore \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Get All Classes (Including Archived)
```bash
curl -X GET "http://localhost:4000/api/classes?includeArchived=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 2. Student Messaging

### Send a Message
```bash
curl -X POST http://localhost:4000/api/messages \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "class": "Math 101",
    "recipient": "jane_doe",
    "content": "Hey, can you help me with the homework?"
  }'
```

**Expected Response:**
```json
{
  "message": "Message sent successfully",
  "data": {
    "_id": "...",
    "class": "Math 101",
    "sender": "john_doe",
    "senderName": "John Doe",
    "recipient": "jane_doe",
    "recipientName": "Jane Doe",
    "content": "Hey, can you help me with the homework?",
    "read": false,
    "createdAt": "2025-11-06T10:00:00Z"
  }
}
```

### Get Conversation with Another User
```bash
curl -X GET "http://localhost:4000/api/messages?class=Math%20101&otherUser=jane_doe" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Mark Messages as Read
```bash
curl -X PATCH http://localhost:4000/api/messages/read \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "class": "Math 101",
    "sender": "jane_doe"
  }'
```

### Get Unread Message Count
```bash
curl -X GET "http://localhost:4000/api/messages/unread-count?class=Math%20101" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 3. Grade Export/Import

### Export Grades as CSV
```bash
curl -X GET "http://localhost:4000/api/grades/export?class=Math%20101" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o grades.csv
```

**CSV Format:**
```csv
Student,Grade,Feedback,Exam ID,Created At
john_doe,95,Excellent work,64abc123,2025-11-06T10:00:00Z
jane_smith,88,Good job,64abc123,2025-11-06T10:00:00Z
```

### Import Grades from CSV
```bash
curl -X POST http://localhost:4000/api/grades/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "class": "Math 101",
    "csvData": "Student,Grade,Feedback,Exam ID\njohn_doe,95,Excellent work,\njane_smith,88,Good job,"
  }'
```

**Expected Response:**
```json
{
  "message": "Successfully imported 2 grades",
  "imported": 2,
  "errors": []
}
```

---

## 4. Bulk Actions

### Bulk Grade Assignment
```bash
curl -X POST http://localhost:4000/api/bulk/grades \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "class": "Math 101",
    "grades": [
      {
        "student": "john_doe",
        "grade": "95",
        "feedback": "Excellent work",
        "examId": null
      },
      {
        "student": "jane_smith",
        "grade": "88",
        "feedback": "Good job"
      }
    ]
  }'
```

### Bulk Delete Announcements
```bash
curl -X POST http://localhost:4000/api/bulk/announcements/delete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["64abc123", "64abc456", "64abc789"]
  }'
```

### Bulk Delete Exams
```bash
curl -X POST http://localhost:4000/api/bulk/exams/delete \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ids": ["64def123", "64def456"]
  }'
```

### Bulk Send Notifications
```bash
curl -X POST http://localhost:4000/api/bulk/notifications \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "class": "Math 101",
    "message": "Class tomorrow is moved to 10 AM",
    "type": "announcement"
  }'
```

**Expected Response:**
```json
{
  "message": "Notification sent to 25 students",
  "count": 25
}
```

---

## 5. Reuse Posts/Materials/Exams

### Reuse Announcement
```bash
curl -X POST http://localhost:4000/api/reuse/announcement \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "announcementId": "64abc123",
    "targetClass": "Math 102"
  }'
```

### Reuse Material
```bash
curl -X POST http://localhost:4000/api/reuse/material \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "materialId": "64xyz456",
    "targetClass": "Math 102"
  }'
```

### Reuse Exam
```bash
curl -X POST http://localhost:4000/api/reuse/exam \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "examId": "64def789",
    "targetClass": "Math 102",
    "newDueDate": "2025-12-15T23:59:59"
  }'
```

**Expected Response:**
```json
{
  "message": "Exam reused successfully",
  "exam": {
    "_id": "...",
    "title": "Midterm Exam",
    "class": "Math 102",
    "due": "2025-12-15T23:59:59Z"
  }
}
```

---

## 6. Advanced Analytics

### Get Class Analytics
```bash
curl -X GET http://localhost:4000/api/analytics/class/Math%20101 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "className": "Math 101",
  "studentCount": 25,
  "examCount": 5,
  "announcementCount": 12,
  "averageGrade": "87.50",
  "totalSubmissions": 120,
  "teacher": "teacher1"
}
```

### Get Student Performance Analytics
```bash
curl -X GET "http://localhost:4000/api/analytics/student/john_doe?class=Math%20101" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "username": "john_doe",
  "name": "John Doe",
  "averageGrade": "92.50",
  "totalGrades": 5,
  "completedExams": 4,
  "pendingExams": 1,
  "totalExams": 5,
  "grades": [
    {
      "class": "Math 101",
      "grade": "95",
      "feedback": "Excellent",
      "examId": "64abc123"
    }
  ]
}
```

### Get Exam Statistics
```bash
curl -X GET http://localhost:4000/api/analytics/exam/64abc123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "examId": "64abc123",
  "examTitle": "Midterm Exam",
  "class": "Math 101",
  "totalStudents": 25,
  "submissionCount": 22,
  "submissionRate": "88.00%",
  "gradedCount": 22,
  "averageScore": "85.50",
  "dueDate": "2025-11-10T23:59:59Z"
}
```

### Get Engagement Analytics
```bash
curl -X GET http://localhost:4000/api/analytics/engagement/Math%20101 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Response:**
```json
{
  "className": "Math 101",
  "totalStudents": 25,
  "activeStudents": 20,
  "engagementRate": "80.00%",
  "recentActivity": {
    "announcements": 5,
    "exams": 2,
    "submissions": 45
  },
  "period": "Last 30 days"
}
```

---

## 7. Assignment Resubmission Controls

### Create Exam with Resubmission Disabled
```bash
curl -X POST http://localhost:4000/api/exams \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Final Exam",
    "description": "No resubmissions allowed",
    "class": "Math 101",
    "due": "2025-12-15T23:59:59",
    "allowResubmission": false,
    "questions": [
      {
        "text": "What is 2+2?",
        "type": "short",
        "correctAnswer": "4"
      }
    ]
  }'
```

### Try to Resubmit (Will Fail if allowResubmission is false)
```bash
curl -X POST http://localhost:4000/api/exam-submissions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "examId": "64abc123",
    "answers": [
      {
        "questionId": 0,
        "answer": "4"
      }
    ]
  }'
```

**Expected Error (if already submitted and resubmission disabled):**
```json
{
  "error": "You have already submitted this exam and resubmission is not allowed"
}
```

---

## Testing with Postman

### Import Collection
1. Open Postman
2. Create new collection: "Google Classroom Features"
3. Add environment variables:
   - `baseUrl`: `http://localhost:4000`
   - `token`: Your JWT token

### Set Authorization
1. Go to Collection settings
2. Authorization tab
3. Type: Bearer Token
4. Token: `{{token}}`

### Create Requests
Copy the curl commands above and convert them to Postman requests.

---

## Testing with JavaScript (Frontend)

```javascript
// Base URL
const API_BASE_URL = 'http://localhost:4000';
const token = localStorage.getItem('token');

// Headers
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};

// 1. Archive a class
const archiveClass = async (classId) => {
  const response = await fetch(`${API_BASE_URL}/api/classes/${classId}/archive`, {
    method: 'PATCH',
    headers
  });
  return await response.json();
};

// 2. Send a message
const sendMessage = async (className, recipient, content) => {
  const response = await fetch(`${API_BASE_URL}/api/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ class: className, recipient, content })
  });
  return await response.json();
};

// 3. Export grades
const exportGrades = async (className) => {
  const response = await fetch(`${API_BASE_URL}/api/grades/export?class=${encodeURIComponent(className)}`, {
    headers
  });
  const blob = await response.blob();
  
  // Download file
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `grades-${className}.csv`;
  a.click();
};

// 4. Get analytics
const getClassAnalytics = async (className) => {
  const response = await fetch(`${API_BASE_URL}/api/analytics/class/${encodeURIComponent(className)}`, {
    headers
  });
  return await response.json();
};

// 5. Bulk send notifications
const bulkNotify = async (className, message) => {
  const response = await fetch(`${API_BASE_URL}/api/bulk/notifications`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ class: className, message, type: 'announcement' })
  });
  return await response.json();
};

// 6. Reuse exam
const reuseExam = async (examId, targetClass, newDueDate) => {
  const response = await fetch(`${API_BASE_URL}/api/reuse/exam`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ examId, targetClass, newDueDate })
  });
  return await response.json();
};
```

---

## Common Issues & Solutions

### Issue: 401 Unauthorized
**Solution:** Check that your JWT token is valid and not expired. Get a new token by logging in.

### Issue: 403 Forbidden
**Solution:** Verify you have the correct role (Teacher/Admin) for the endpoint.

### Issue: 404 Not Found
**Solution:** Check that the class name, exam ID, or other IDs are correct and exist in the database.

### Issue: 500 Internal Server Error
**Solution:** Check backend logs for detailed error messages. Ensure all required fields are provided.

---

## Verify Database Changes

### Check if Class is Archived
```bash
# In MongoDB shell or Compass
db.classes.findOne({ name: "Math 101" })
// Should show: archived: true, archivedAt: ISODate(...)
```

### Check Messages Collection
```bash
db.messages.find({ class: "Math 101" })
// Should show all messages in the class
```

### Check Exam Resubmission Setting
```bash
db.exams.findOne({ _id: ObjectId("...") })
// Should show: allowResubmission: true/false
```

---

## Socket.IO Real-time Events

Connect to Socket.IO to receive real-time updates:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: {
    token: localStorage.getItem('token')
  }
});

// Join class room
socket.emit('join-class', 'Math 101');

// Listen for new messages
socket.on('new-message', (message) => {
  console.log('New message:', message);
  // Update UI
});

// Listen for bulk notifications
socket.on('bulk-notification', (data) => {
  console.log('Bulk notification:', data);
  // Show notification
});
```

---

## Performance Testing

### Test Bulk Operations
```bash
# Create 100 grades at once
curl -X POST http://localhost:4000/api/bulk/grades \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @bulk_grades.json
```

### Test Analytics with Large Dataset
```bash
# Get analytics for class with 1000+ students
time curl -X GET http://localhost:4000/api/analytics/class/Large%20Class \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Next Steps

1. ✅ Test all endpoints with valid data
2. ✅ Test error cases (invalid IDs, unauthorized access)
3. ✅ Test with multiple users/roles
4. ✅ Test Socket.IO real-time updates
5. ✅ Verify database changes
6. ✅ Test performance with large datasets
7. ⏳ Implement frontend UI components
8. ⏳ Add Google Calendar integration
9. ⏳ Add Google Drive integration

---

**Happy Testing! 🚀**
