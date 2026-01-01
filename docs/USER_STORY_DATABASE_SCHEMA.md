# Firebase Database Schema for User Stories US012-01, US012-02, US012-03

This document details the Firebase Firestore collections and fields used by the three user stories for Learning Risk Monitoring.

---

## US012-01: Identify At-Risk Student

### Collections Used:

#### 1. `enrollment` Collection
**Purpose:** Track which students are enrolled in which courses

**Fields Used:**
```javascript
{
  id: string,                    // Document ID (auto-generated)
  studentId: string,             // Reference to user document ID
  courseId: string,              // Reference to course document ID
  enrolledAt: Timestamp,         // Enrollment date
  progress: {                    // Optional: Progress tracking
    completedModules: [string],  // Array of completed module IDs
    completedLessons: [string], // Array of completed lesson IDs
    overallProgress: number      // Overall progress percentage (0-100)
  }
}
```

**Query Pattern:**
```javascript
// Get all enrollments for a course
query(
  collection(db, 'enrollment'),
  where('courseId', '==', courseId)
)
```

---

#### 2. `submission` Collection
**Purpose:** Store student submissions for assessments and assignments (used to calculate scores and missed deadlines)

**Fields Used:**
```javascript
{
  id: string,                    // Document ID (auto-generated)
  studentId: string,             // Reference to user document ID
  assessmentId: string,          // Optional: Reference to assessment document ID
  assignmentId: string,          // Optional: Reference to assignment document ID
  courseId: string,              // Optional: Direct course reference
  score: number,                  // Points earned
  totalPoints: number,           // Total possible points
  grade: number,                 // Alternative: Percentage grade (0-100)
  submittedAt: Timestamp,        // Submission timestamp
  status: string                 // Submission status
}
```

**Query Pattern:**
```javascript
// Get all submissions for a course
query(
  collection(db, 'submission'),
  where('courseId', '==', courseId)
)
```

---

#### 3. `assessment` Collection
**Purpose:** Get assessment details including deadlines and configuration

**Fields Used:**
```javascript
{
  id: string,                    // Document ID (auto-generated)
  courseId: string,             // Reference to course document ID
  title: string,                 // Assessment title
  config: {
    startDate: Timestamp,        // Optional: Start date
    endDate: Timestamp,          // Used to check missed deadlines
    timer: number,               // Time limit in minutes
    attempts: number             // Maximum attempts allowed
  },
  published: boolean            // Publication status
}
```

**Query Pattern:**
```javascript
// Get all assessments for a course
query(
  collection(db, 'assessment'),
  where('courseId', '==', courseId)
)
```

---

#### 4. `assignment` Collection
**Purpose:** Get assignment details including deadlines

**Fields Used:**
```javascript
{
  id: string,                    // Document ID (auto-generated)
  courseId: string,             // Reference to course document ID
  title: string,                 // Assignment title
  deadline: Timestamp,          // Assignment deadline (used for missed deadline calculation)
  allowLateSubmissions: boolean // Whether late submissions are allowed
  status: string                // 'draft' | 'published'
}
```

**Query Pattern:**
```javascript
// Get all assignments for a course
query(
  collection(db, 'assignment'),
  where('courseId', '==', courseId)
)
```

---

#### 5. `course` Collection
**Purpose:** Get course details and module/lesson structure

**Fields Used:**
```javascript
{
  id: string,                    // Document ID (auto-generated)
  title: string,                 // Course title
  description: string,           // Course description
  modules: [string],            // Array of module document IDs
  createdBy: string,            // Teacher/creator user ID
  createdAt: Timestamp,         // Creation date
  status: string                // 'draft' | 'published'
}
```

---

#### 6. `module` Collection
**Purpose:** Get module structure to count total lessons

**Fields Used:**
```javascript
{
  id: string,                    // Document ID (auto-generated)
  courseId: string,             // Reference to course document ID
  title: string,                // Module title
  lessons: [string]             // Array of lesson document IDs
}
```

---

#### 7. `user` Collection
**Purpose:** Get student names and email addresses

**Fields Used:**
```javascript
{
  id: string,                    // Document ID (Firebase Auth UID)
  name: string,                  // Student name
  email: string,                 // Student email
  role: string                   // 'student' | 'teacher' | 'admin'
}
```

---

### Risk Calculation Data Points:

The system calculates risk based on:
1. **Average Score:** From `submission.score` and `submission.totalPoints`
2. **Missed Deadlines:** Comparing `assignment.deadline` and `assessment.config.endDate` with `submission.submittedAt`
3. **Days Inactive:** Comparing `submission.submittedAt` (or `enrollment.enrolledAt`) with current date
4. **Completion Rate:** From `enrollment.progress.completedLessons` vs total lessons in course

---

## US012-02: View Risk Indicator

### Collections Used:

#### 1. `enrollment` Collection
**Same structure as US012-01**

**Query Pattern:**
```javascript
// Get all enrollments for current student
query(
  collection(db, 'enrollment'),
  where('studentId', '==', userId)
)
```

---

#### 2. `submission` Collection
**Same structure as US012-01**

**Query Pattern:**
```javascript
// Get all submissions for current student
query(
  collection(db, 'submission'),
  where('studentId', '==', userId)
)
```

---

#### 3. `course` Collection
**Same structure as US012-01**

---

#### 4. `module` Collection
**Same structure as US012-01**

---

#### 5. `assessment` Collection
**Same structure as US012-01**

---

#### 6. `assignment` Collection
**Same structure as US012-01**

---

### Risk Indicator Data Structure:

The calculated risk data stored in component state:
```javascript
{
  [courseId]: {
    riskLevel: 'low' | 'medium' | 'high',
    riskReasons: [
      'Average assessment score below 60%',
      'Missed 3 deadlines',
      'Low engagement (inactive for 10 days)'
    ],
    recommendations: [
      'Review learning materials and practice assessment questions',
      'Complete pending assignments before deadlines',
      'Engage with course content regularly'
    ]
  }
}
```

---

## US012-03: Notify At-Risk Student

### Collections Used:

#### 1. `notification` Collection ⭐ **NEW COLLECTION**
**Purpose:** Store notifications sent to students

**Fields:**
```javascript
{
  id: string,                    // Document ID (auto-generated)
  userId: string,                // Reference to user document ID (student)
  type: string,                  // 'risk_alert' | 'feedback_released' | 'custom'
  title: string,                 // Notification title
  message: string,               // Notification message
  courseId: string,             // Optional: Reference to course document ID
  itemId: string,               // Optional: Reference to related item (assessment, assignment, etc.)
  guidance: string,              // Optional: Custom guidance from teacher
  riskLevel: string,            // Optional: 'low' | 'medium' | 'high' (for risk_alert type)
  riskReasons: [string],         // Optional: Array of risk reasons
  read: boolean,                 // Whether notification has been read
  createdAt: Timestamp          // Server timestamp of creation
}
```

**Query Pattern:**
```javascript
// Get all notifications for a user
query(
  collection(db, 'notification'),
  where('userId', '==', userId)
)

// Check for recent risk notifications (deduplication)
query(
  collection(db, 'notification'),
  where('userId', '==', studentId),
  where('type', '==', 'risk_alert'),
  where('courseId', '==', courseId)
)
```

---

#### 2. `course` Collection
**Purpose:** Get course title for notification message

**Fields Used:**
```javascript
{
  id: string,
  title: string                 // Used in notification title/message
}
```

---

#### 3. `user` Collection
**Purpose:** Get student information (implicitly, via userId)

---

## Complete Database Schema Summary

### Collections Required for All 3 User Stories:

| Collection | Used By | Primary Purpose |
|-----------|---------|----------------|
| `enrollment` | US012-01, US012-02 | Track student-course relationships and progress |
| `submission` | US012-01, US012-02 | Calculate scores and check deadlines |
| `assessment` | US012-01, US012-02 | Get assessment deadlines and configuration |
| `assignment` | US012-01, US012-02 | Get assignment deadlines |
| `course` | US012-01, US012-02, US012-03 | Get course details and titles |
| `module` | US012-01, US012-02 | Count total lessons for completion rate |
| `user` | US012-01, US012-02, US012-03 | Get student/teacher names and emails |
| `notification` | US012-03 | Store and retrieve notifications |

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    US012-01: Identify At-Risk Student       │
│                    (Teacher Analytics Page)                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
        │  enrollment  │    │  submission  │    │  assessment  │
        │  (courseId)  │───▶│  (scores)    │    │  (deadlines) │
        └──────────────┘    └──────────────┘    └──────────────┘
                              │
                              ▼
                    Calculate Risk Level
                    (avgScore, missedDeadlines, daysInactive)
                              │
                              ▼
        ┌──────────────────────────────────────┐
        │  Display At-Risk Students List       │
        │  (riskLevel, riskReasons)            │
        └──────────────────────────────────────┘
                              │
                              ▼
        ┌──────────────────────────────────────┐
        │  Auto-send notifications             │
        │  POST /api/notifications/at-risk      │
        └──────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              US012-02: View Risk Indicator                  │
│              (Student Progress Page)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌──────────────┐    ┌──────────────┐
        │  enrollment  │    │  submission  │
        │  (studentId)│───▶│  (studentId) │
        └──────────────┘    └──────────────┘
                              │
                              ▼
                    Calculate Risk Indicators
                    (per course)
                              │
                              ▼
        ┌──────────────────────────────────────┐
        │  Display Risk Cards                   │
        │  (riskLevel, riskReasons,            │
        │   recommendations)                    │
        └──────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│          US012-03: Notify At-Risk Student                   │
│          (Notification System)                              │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼
┌───────────────┐                          ┌───────────────┐
│ Auto Trigger │                          │ Manual Trigger│
│ (Analytics)  │                          │ (Teacher UI)  │
└───────────────┘                          └───────────────┘
        │                                           │
        └─────────────────┬─────────────────────────┘
                          ▼
        ┌──────────────────────────────────────┐
        │  POST /api/notifications/at-risk     │
        │  or POST /api/notifications           │
        └──────────────────────────────────────┘
                          │
                          ▼
        ┌──────────────────────────────────────┐
        │  Create notification document         │
        │  in 'notification' collection        │
        └──────────────────────────────────────┘
                          │
                          ▼
        ┌──────────────────────────────────────┐
        │  Student views notification           │
        │  in NotificationBell component       │
        │  GET /api/notifications?userId=...   │
        └──────────────────────────────────────┘
```

---

## Example Document Structures

### Example: `enrollment` Document
```json
{
  "studentId": "r7zKa68NNAazIOzYwoqWULkvSa53",
  "courseId": "upgNzUW8Ky7mp8hao4sG",
  "enrolledAt": {
    "_seconds": 1704067200,
    "_nanoseconds": 0
  },
  "progress": {
    "completedModules": ["module1", "module2"],
    "completedLessons": ["lesson1", "lesson2", "lesson3"],
    "overallProgress": 45
  }
}
```

### Example: `submission` Document
```json
{
  "studentId": "r7zKa68NNAazIOzYwoqWULkvSa53",
  "assessmentId": "assessment123",
  "courseId": "upgNzUW8Ky7mp8hao4sG",
  "score": 45,
  "totalPoints": 100,
  "submittedAt": {
    "_seconds": 1704153600,
    "_nanoseconds": 0
  },
  "status": "graded"
}
```

### Example: `notification` Document
```json
{
  "userId": "r7zKa68NNAazIOzYwoqWULkvSa53",
  "type": "risk_alert",
  "title": "Risk Notification - SQL Fundamentals",
  "message": "Your teacher has sent a notification regarding your learning performance in the course \"SQL Fundamentals\". Please review your progress and take action to improve.",
  "courseId": "upgNzUW8Ky7mp8hao4sG",
  "guidance": "I noticed you've been struggling with the recent assignments. Let's schedule a meeting to discuss how we can improve your performance.",
  "riskLevel": "high",
  "riskReasons": [
    "Average score below threshold (45%)",
    "Multiple missed deadlines (3 assignments)",
    "Inactive for 10 days"
  ],
  "read": false,
  "createdAt": {
    "_seconds": 1704240000,
    "_nanoseconds": 0
  }
}
```

---

## Indexes Required

For optimal performance, these Firestore indexes should be created:

1. **enrollment collection:**
   - `courseId` (ascending)
   - `studentId` (ascending)

2. **submission collection:**
   - `studentId` (ascending)
   - `courseId` (ascending)
   - `submittedAt` (descending)

3. **notification collection:**
   - `userId` (ascending), `createdAt` (descending)
   - `userId` (ascending), `type` (ascending), `courseId` (ascending)

---

## Notes

- All timestamps use Firestore `serverTimestamp()` for consistency
- The `notification` collection is the only new collection added for these user stories
- Risk calculation happens in-memory (not stored in database) - it's calculated on-the-fly from enrollment, submission, assessment, and assignment data
- Notifications are automatically deduplicated (won't send duplicate within 7 days)
