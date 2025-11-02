# Database Schema Documentation
## Learning Management System

**Project:** Classroom Management System  
**Database:** MongoDB  
**Date:** November 2, 2025  

---

## Overview

The system uses **MongoDB** with **11 collections** to manage a complete learning management system with user authentication, class management, announcements, exams, and real-time notifications.

---

## Collections Summary

1. **users** - User accounts (students, teachers, admins)
2. **classes** - Virtual classrooms
3. **topics** - Organizational folders for announcements
4. **announcements** - Class posts and assignments (embedded in server.js)
5. **exams** - Examination documents
6. **examsubmissions** - Student exam submissions
7. **grades** - Student grades
8. **materials** - Educational resources
9. **notifications** - User notifications
10. **comments** - Comments on announcements
11. **reactions** - Reactions (like/love) on announcements

---

## Entity Relationship Diagram

```
┌──────────────┐
│    User      │
│              │
│ _id          │◄──────────┐
│ name         │           │
│ email        │           │ (teacher)
│ password     │           │
│ role         │           │
│ profilePic   │           │
└──────┬───────┘           │
       │                   │
       │ (students)        │
       │                   │
       ↓                   │
┌──────────────┐           │
│    Class     │           │
│              │           │
│ _id          │◄──────────┤
│ className    │           │
│ section      │           │
│ teacher      │───────────┘
│ students[]   │───────────┐
│ code         │           │
└──────┬───────┘           │
       │                   │
       │                   │
   ┌───┴───────────────┐   │
   │                   │   │
   ↓                   ↓   │
┌──────────────┐  ┌──────────────┐
│    Topic     │  │ Announcement │
│              │  │              │
│ _id          │◄─┤ topic        │
│ name         │  │ _id          │
│ color        │  │ class        │───┐
│ class        │──┤ teacher      │   │
│ teacher      │  │ title        │   │
│ order        │  │ description  │   │
└──────────────┘  │ files[]      │   │
                  │ dueDate      │   │
                  └──────┬───────┘   │
                         │           │
                    ┌────┴────┐      │
                    │         │      │
                    ↓         ↓      │
            ┌──────────┐ ┌──────────┐
            │ Comment  │ │ Reaction │
            │          │ │          │
            │ _id      │ │ _id      │
            │ post     │ │ post     │
            │ author   │ │ user     │
            │ text     │ │ type     │
            └──────────┘ └──────────┘

┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│     Exam     │     │ ExamSubmission   │     │    Grade     │
│              │     │                  │     │              │
│ _id          │◄────┤ exam             │     │ _id          │
│ class        │─────┤ class            │     │ exam         │
│ teacher      │     │ student          │─────┤ student      │
│ title        │     │ answers[]        │     │ score        │
│ questions[]  │     │ score            │     │ feedback     │
│ dueDate      │     │ submittedAt      │     └──────────────┘
└──────────────┘     └──────────────────┘

┌──────────────┐     ┌──────────────┐
│  Material    │     │ Notification │
│              │     │              │
│ _id          │     │ _id          │
│ class        │─────┤ class        │
│ teacher      │     │ user         │
│ title        │     │ type         │
│ description  │     │ message      │
│ files[]      │     │ link         │
└──────────────┘     │ read         │
                     └──────────────┘
```

---

## Detailed Schema Definitions

### 1. User Collection

**Collection Name:** `users`  
**Model File:** `backend/models/User.js`

#### Schema
```javascript
{
  _id: ObjectId,
  name: String (required),
  email: String (required, unique, lowercase),
  password: String (required, hashed with bcrypt),
  role: String (enum: ['student', 'teacher', 'admin'], default: 'student'),
  profilePic: String (optional, URL to uploaded image),
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

#### Indexes
- `email`: Unique index for authentication and preventing duplicate accounts

#### Relationships
- **One-to-Many with Class (as teacher):** One user (teacher) can create many classes
- **Many-to-Many with Class (as student):** One user (student) can join many classes
- **One-to-Many with Announcement:** One user (teacher) can create many announcements
- **One-to-Many with Exam:** One user (teacher) can create many exams
- **One-to-Many with Material:** One user (teacher) can upload many materials
- **One-to-Many with Notification:** One user receives many notifications
- **One-to-Many with Comment:** One user can write many comments
- **One-to-Many with Reaction:** One user can create many reactions
- **One-to-Many with Topic:** One user (teacher) can create many topics

#### Example Document
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@example.com",
  "password": "$2b$10$abcdefghijklmnopqrstuvwxyz123456789",
  "role": "teacher",
  "profilePic": "uploads/profiles/john-profile.jpg",
  "createdAt": "2025-01-15T10:00:00Z",
  "updatedAt": "2025-01-15T10:00:00Z"
}
```

---

### 2. Class Collection

**Collection Name:** `classes`  
**Model File:** `backend/models/Class.js`

#### Schema
```javascript
{
  _id: ObjectId,
  className: String (required),
  section: String (required),
  teacher: ObjectId (ref: 'User', required),
  students: [ObjectId] (ref: 'User', default: []),
  code: String (required, unique, auto-generated 6-character code),
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

#### Indexes
- `code`: Unique index for class joining functionality
- `teacher`: Index for quickly fetching teacher's classes

#### Relationships
- **Many-to-One with User (teacher):** Each class belongs to one teacher
- **Many-to-Many with User (students):** Each class has many students
- **One-to-Many with Topic:** One class has many topics
- **One-to-Many with Announcement:** One class has many announcements
- **One-to-Many with Exam:** One class has many exams
- **One-to-Many with Material:** One class has many materials
- **One-to-Many with Notification:** One class generates many notifications

#### Code Generation
The `code` field is auto-generated using a 6-character random alphanumeric string:
```javascript
function generateClassCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
```

#### Example Document
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "className": "Computer Science 101",
  "section": "A",
  "teacher": "507f1f77bcf86cd799439011",
  "students": [
    "507f1f77bcf86cd799439020",
    "507f1f77bcf86cd799439021",
    "507f1f77bcf86cd799439022"
  ],
  "code": "ABC123",
  "createdAt": "2025-01-15T11:00:00Z",
  "updatedAt": "2025-01-15T11:00:00Z"
}
```

---

### 3. Topic Collection

**Collection Name:** `topics`  
**Model File:** `backend/models/Topic.js`

#### Schema
```javascript
{
  _id: ObjectId,
  name: String (required, max length: 100),
  color: String (default: '#1976d2', hex color code),
  class: ObjectId (ref: 'Class', required),
  teacher: ObjectId (ref: 'User', required),
  order: Number (default: 0, for custom sorting),
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

#### Indexes
- **Compound Unique Index:** `{ class: 1, name: 1 }`
  - Ensures no duplicate topic names within the same class
  - Different classes can have topics with the same name

#### Relationships
- **Many-to-One with Class:** Each topic belongs to one class
- **Many-to-One with User (teacher):** Each topic is created by one teacher
- **One-to-Many with Announcement:** One topic can categorize many announcements

#### Purpose
Topics organize announcements into categories (like folders in Google Classroom), helping teachers and students find content more easily.

#### Example Document
```json
{
  "_id": "507f1f77bcf86cd799439014",
  "name": "Unit 1: Introduction",
  "color": "#1976d2",
  "class": "507f1f77bcf86cd799439012",
  "teacher": "507f1f77bcf86cd799439011",
  "order": 0,
  "createdAt": "2025-11-01T10:00:00Z",
  "updatedAt": "2025-11-01T10:00:00Z"
}
```

---

### 4. Announcement Collection

**Collection Name:** `announcements` (virtual - embedded in server.js)  
**Model File:** Embedded in `backend/server.js` (AnnouncementSchema)

#### Schema
```javascript
{
  _id: ObjectId,
  class: ObjectId (ref: 'Class', required),
  teacher: ObjectId (ref: 'User', required),
  topic: ObjectId (ref: 'Topic', optional),
  title: String (required),
  description: String (optional),
  files: [String] (optional, array of file URLs),
  dueDate: Date (optional),
  isAssignment: Boolean (default: false),
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

#### Indexes
- `class`: Index for fetching announcements by class
- `topic`: Index for filtering by topic

#### Relationships
- **Many-to-One with Class:** Each announcement belongs to one class
- **Many-to-One with User (teacher):** Each announcement is created by one teacher
- **Many-to-One with Topic:** Each announcement optionally belongs to one topic
- **One-to-Many with Comment:** One announcement can have many comments
- **One-to-Many with Reaction:** One announcement can have many reactions

#### Example Document
```json
{
  "_id": "507f1f77bcf86cd799439030",
  "class": "507f1f77bcf86cd799439012",
  "teacher": "507f1f77bcf86cd799439011",
  "topic": "507f1f77bcf86cd799439014",
  "title": "Welcome to the Course",
  "description": "Please read the syllabus and complete the introductory survey by Friday.",
  "files": [
    "uploads/materials/syllabus.pdf",
    "uploads/materials/survey-link.txt"
  ],
  "dueDate": "2025-01-20T23:59:59Z",
  "isAssignment": false,
  "createdAt": "2025-01-15T12:00:00Z",
  "updatedAt": "2025-01-15T12:00:00Z"
}
```

---

### 5. Exam Collection

**Collection Name:** `exams`  
**Model File:** `backend/models/Exam.js`

#### Schema
```javascript
{
  _id: ObjectId,
  class: ObjectId (ref: 'Class', required),
  teacher: ObjectId (ref: 'User', required),
  title: String (required),
  description: String (optional),
  questions: [
    {
      questionText: String (required),
      type: String (enum: ['multiple-choice', 'essay', 'true-false'], required),
      options: [String] (for multiple-choice questions),
      correctAnswer: String (for auto-grading),
      points: Number (default: 1)
    }
  ],
  totalPoints: Number (calculated from questions),
  dueDate: Date (required),
  duration: Number (in minutes, optional),
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

#### Indexes
- `class`: Index for fetching class exams
- `dueDate`: Index for sorting by deadline

#### Relationships
- **Many-to-One with Class:** Each exam belongs to one class
- **Many-to-One with User (teacher):** Each exam is created by one teacher
- **One-to-Many with ExamSubmission:** One exam has many student submissions
- **One-to-Many with Grade:** One exam generates many grades

#### Example Document
```json
{
  "_id": "507f1f77bcf86cd799439040",
  "class": "507f1f77bcf86cd799439012",
  "teacher": "507f1f77bcf86cd799439011",
  "title": "Midterm Exam",
  "description": "Covers chapters 1-5",
  "questions": [
    {
      "questionText": "What is the capital of France?",
      "type": "multiple-choice",
      "options": ["London", "Berlin", "Paris", "Madrid"],
      "correctAnswer": "Paris",
      "points": 2
    },
    {
      "questionText": "Explain the concept of polymorphism.",
      "type": "essay",
      "points": 10
    }
  ],
  "totalPoints": 12,
  "dueDate": "2025-03-15T23:59:59Z",
  "duration": 60,
  "createdAt": "2025-02-15T10:00:00Z",
  "updatedAt": "2025-02-15T10:00:00Z"
}
```

---

### 6. ExamSubmission Collection

**Collection Name:** `examsubmissions`  
**Model File:** `backend/models/Exam.js` (ExamSubmissionSchema)

#### Schema
```javascript
{
  _id: ObjectId,
  exam: ObjectId (ref: 'Exam', required),
  student: ObjectId (ref: 'User', required),
  class: ObjectId (ref: 'Class', required),
  answers: [
    {
      questionIndex: Number (required),
      answer: String (required)
    }
  ],
  score: Number (optional, set after grading),
  submittedAt: Date (required, auto-generated),
  createdAt: Date (auto-generated)
}
```

#### Indexes
- **Compound Unique Index:** `{ exam: 1, student: 1 }`
  - Ensures one submission per student per exam
  - Prevents duplicate submissions

#### Relationships
- **Many-to-One with Exam:** Each submission belongs to one exam
- **Many-to-One with User (student):** Each submission is made by one student
- **Many-to-One with Class:** Each submission is for one class
- **One-to-One with Grade:** Each submission generates one grade

#### Example Document
```json
{
  "_id": "507f1f77bcf86cd799439050",
  "exam": "507f1f77bcf86cd799439040",
  "student": "507f1f77bcf86cd799439020",
  "class": "507f1f77bcf86cd799439012",
  "answers": [
    {
      "questionIndex": 0,
      "answer": "Paris"
    },
    {
      "questionIndex": 1,
      "answer": "Polymorphism is the ability of different objects to respond to the same method call in different ways..."
    }
  ],
  "score": 12,
  "submittedAt": "2025-03-15T14:30:00Z",
  "createdAt": "2025-03-15T14:30:00Z"
}
```

---

### 7. Grade Collection

**Collection Name:** `grades`  
**Model File:** `backend/models/Exam.js` (GradeSchema)

#### Schema
```javascript
{
  _id: ObjectId,
  exam: ObjectId (ref: 'Exam', required),
  student: ObjectId (ref: 'User', required),
  score: Number (required),
  feedback: String (optional),
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

#### Relationships
- **Many-to-One with Exam:** Each grade is for one exam
- **Many-to-One with User (student):** Each grade belongs to one student

#### Example Document
```json
{
  "_id": "507f1f77bcf86cd799439060",
  "exam": "507f1f77bcf86cd799439040",
  "student": "507f1f77bcf86cd799439020",
  "score": 12,
  "feedback": "Excellent work! Your explanation of polymorphism was thorough.",
  "createdAt": "2025-03-16T10:00:00Z",
  "updatedAt": "2025-03-16T10:00:00Z"
}
```

---

### 8. Material Collection

**Collection Name:** `materials`  
**Model File:** `backend/models/Material.js`

#### Schema
```javascript
{
  _id: ObjectId,
  class: ObjectId (ref: 'Class', required),
  teacher: ObjectId (ref: 'User', required),
  title: String (required),
  description: String (optional),
  files: [String] (required, array of file URLs),
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

#### Indexes
- `class`: Index for fetching class materials

#### Relationships
- **Many-to-One with Class:** Each material belongs to one class
- **Many-to-One with User (teacher):** Each material is uploaded by one teacher

#### Example Document
```json
{
  "_id": "507f1f77bcf86cd799439070",
  "class": "507f1f77bcf86cd799439012",
  "teacher": "507f1f77bcf86cd799439011",
  "title": "Chapter 3 Lecture Slides",
  "description": "Introduction to algorithms and data structures",
  "files": [
    "uploads/materials/chapter3-slides.pdf",
    "uploads/materials/chapter3-examples.zip"
  ],
  "createdAt": "2025-02-01T09:00:00Z",
  "updatedAt": "2025-02-01T09:00:00Z"
}
```

---

### 9. Notification Collection

**Collection Name:** `notifications`  
**Model File:** `backend/models/Notification.js`

#### Schema
```javascript
{
  _id: ObjectId,
  user: ObjectId (ref: 'User', required),
  class: ObjectId (ref: 'Class', optional),
  type: String (e.g., 'announcement', 'exam', 'grade', 'comment'),
  message: String (required),
  link: String (optional, URL to related resource),
  read: Boolean (default: false),
  createdAt: Date (auto-generated)
}
```

#### Indexes
- `user`: Index for fetching user notifications
- `read`: Index for filtering unread notifications
- Compound index: `{ user: 1, read: 1 }` for efficient unread count queries

#### Relationships
- **Many-to-One with User:** Each notification belongs to one user
- **Many-to-One with Class:** Each notification may relate to one class

#### Notification Types
- `announcement`: New announcement posted
- `exam`: New exam available or due soon
- `grade`: Grade published
- `comment`: Someone commented on your post
- `reaction`: Someone reacted to your post
- `material`: New material uploaded

#### Example Document
```json
{
  "_id": "507f1f77bcf86cd799439080",
  "user": "507f1f77bcf86cd799439020",
  "class": "507f1f77bcf86cd799439012",
  "type": "announcement",
  "message": "New announcement posted in Computer Science 101: Welcome to the Course",
  "link": "/class/507f1f77bcf86cd799439012/announcements",
  "read": false,
  "createdAt": "2025-01-15T12:01:00Z"
}
```

---

### 10. Comment Collection

**Collection Name:** `comments`  
**Model File:** `backend/models/Comment.js`

#### Schema
```javascript
{
  _id: ObjectId,
  post: ObjectId (ref: 'Announcement', required),
  author: ObjectId (ref: 'User', required),
  text: String (required, max length: 1000),
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

#### Indexes
- `post`: Index for fetching comments by announcement
- Compound index: `{ post: 1, createdAt: 1 }` for chronological ordering

#### Relationships
- **Many-to-One with Announcement:** Each comment belongs to one announcement
- **Many-to-One with User:** Each comment is written by one user

#### Example Document
```json
{
  "_id": "507f1f77bcf86cd799439090",
  "post": "507f1f77bcf86cd799439030",
  "author": "507f1f77bcf86cd799439020",
  "text": "Thank you for the syllabus! Looking forward to this course.",
  "createdAt": "2025-01-15T13:00:00Z",
  "updatedAt": "2025-01-15T13:00:00Z"
}
```

---

### 11. Reaction Collection

**Collection Name:** `reactions`  
**Model File:** `backend/models/Reaction.js`

#### Schema
```javascript
{
  _id: ObjectId,
  post: ObjectId (ref: 'Announcement', required),
  user: ObjectId (ref: 'User', required),
  type: String (enum: ['like', 'love'], required),
  createdAt: Date (auto-generated)
}
```

#### Indexes
- **Compound Unique Index:** `{ post: 1, user: 1 }`
  - Ensures one reaction per user per post
  - User can change reaction type but not add multiple

#### Relationships
- **Many-to-One with Announcement:** Each reaction belongs to one announcement
- **Many-to-One with User:** Each reaction is created by one user

#### Reaction Types
- `like`: Thumbs up reaction
- `love`: Heart reaction

#### Example Document
```json
{
  "_id": "507f1f77bcf86cd799439100",
  "post": "507f1f77bcf86cd799439030",
  "user": "507f1f77bcf86cd799439020",
  "type": "like",
  "createdAt": "2025-01-15T12:30:00Z"
}
```

---

## Data Integrity & Constraints

### Unique Constraints
1. **User.email** - Prevents duplicate accounts
2. **Class.code** - Ensures unique join codes
3. **(Topic.class, Topic.name)** - No duplicate topic names in same class
4. **(ExamSubmission.exam, ExamSubmission.student)** - One submission per exam
5. **(Reaction.post, Reaction.user)** - One reaction per user per post

### Referential Integrity
All `ObjectId` references use Mongoose's `ref` property for population. However, MongoDB does not enforce referential integrity at the database level. The application handles:
- Cascading deletes (e.g., deleting a class should delete related announcements)
- Validation before deletion (e.g., checking if students exist before deleting class)

### Required Fields
Each schema enforces required fields at the application level through Mongoose validation.

---

## Indexing Strategy

### Performance Indexes
- **User.email**: Fast authentication lookups
- **Class.code**: Quick class joining
- **Class.teacher**: Teacher's class list
- **Topic.(class, name)**: Unique constraint + filtering
- **Announcement.class**: Class stream queries
- **Announcement.topic**: Topic-based filtering
- **Exam.class**: Class exam list
- **Notification.user**: User notification feed
- **Notification.read**: Unread count queries
- **Comment.post**: Comments per announcement
- **Reaction.post**: Reactions per announcement

### Compound Indexes
```javascript
// Topics - Unique per class
{ class: 1, name: 1 } - unique

// ExamSubmissions - One per student per exam
{ exam: 1, student: 1 } - unique

// Reactions - One per user per post
{ post: 1, user: 1 } - unique

// Notifications - Unread filtering
{ user: 1, read: 1 }

// Comments - Chronological order
{ post: 1, createdAt: 1 }
```

---

## Sample Data Relationships

### Example: Complete Class Structure

```
User (Teacher)
└─ Class: "Computer Science 101"
   ├─ Students: [Student1, Student2, Student3]
   ├─ Topics:
   │  ├─ "Unit 1: Introduction" (blue)
   │  ├─ "Unit 2: Data Structures" (green)
   │  └─ "Midterm Exams" (red)
   ├─ Announcements:
   │  ├─ "Welcome" → Topic: "Unit 1"
   │  │  ├─ Comments: [Comment1, Comment2]
   │  │  └─ Reactions: [Like, Love, Like]
   │  └─ "Midterm Schedule" → Topic: "Midterm Exams"
   ├─ Exams:
   │  └─ "Midterm Exam"
   │     ├─ Submissions: [Student1, Student2]
   │     └─ Grades: [95, 87]
   ├─ Materials:
   │  ├─ "Syllabus.pdf"
   │  └─ "Chapter 1 Slides.pdf"
   └─ Notifications:
      ├─ [Student1]: "New announcement posted"
      ├─ [Student2]: "New exam available"
      └─ [Student3]: "Grade published"
```

---

## Database Statistics

### Collection Sizes (Estimated)
| Collection | Avg Document Size | Growth Rate |
|------------|------------------|-------------|
| users | 500 bytes | Slow |
| classes | 300 bytes | Slow |
| topics | 200 bytes | Medium |
| announcements | 2 KB | High |
| exams | 5 KB | Medium |
| examsubmissions | 3 KB | High |
| grades | 300 bytes | High |
| materials | 1 KB | Medium |
| notifications | 400 bytes | Very High |
| comments | 500 bytes | High |
| reactions | 150 bytes | High |

---

## Backup & Maintenance

### Recommended Practices
1. **Daily Backups**: Use MongoDB Atlas automated backups or `mongodump`
2. **Index Monitoring**: Monitor slow queries and add indexes as needed
3. **Data Archiving**: Archive old notifications and submissions periodically
4. **Soft Deletes**: Consider soft deletes for critical data (users, classes)

### Potential Optimizations
1. **TTL Indexes**: Auto-expire old notifications after 90 days
2. **Aggregation Pipelines**: Pre-calculate statistics (grades, submission rates)
3. **Sharding**: Shard by `class` for horizontal scaling
4. **Caching**: Use Redis for frequently accessed data (class lists, user profiles)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Nov 2, 2025 | Initial documentation with Topics feature |

---

**Last Updated:** November 2, 2025  
**Document Status:** Current
