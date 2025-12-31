# Firebase Collections to Check for User Story Interfaces

This guide shows which Firebase Firestore collections (tables) you should check in Firebase Console to see the data that appears in each user story interface.

---

## Quick Reference: Collections to Check

### For US012-01: Identify At-Risk Student (Teacher Analytics Page)

**Check these collections in Firebase Console:**

1. **`enrollment`** - See which students are enrolled in courses
   - Look for: `studentId`, `courseId`, `progress.completedLessons`
   
2. **`submission`** - See student submissions and scores
   - Look for: `studentId`, `score`, `totalPoints`, `submittedAt`
   
3. **`user`** - See student names and emails
   - Look for: `name`, `email`, `role` (should be 'student')

**What you'll see in the interface:**
- List of at-risk students with their risk levels
- Average scores, missed deadlines, days inactive
- Risk reasons for each student

---

### For US012-02: View Risk Indicator (Student Progress Page)

**Check these collections in Firebase Console:**

1. **`enrollment`** - See your enrollment and progress
   - Filter by: `studentId` = your user ID
   - Look for: `progress.completedLessons`, `progress.overallProgress`
   
2. **`submission`** - See your submissions and scores
   - Filter by: `studentId` = your user ID
   - Look for: `score`, `totalPoints`, `submittedAt`
   
3. **`course`** - See course details
   - Look for: `title`, `modules[]`
   
4. **`assessment`** - See assessment deadlines
   - Filter by: `courseId`
   - Look for: `config.endDate`
   
5. **`assignment`** - See assignment deadlines
   - Filter by: `courseId`
   - Look for: `deadline`

**What you'll see in the interface:**
- Risk level cards for each enrolled course
- Risk factors (e.g., "Average score below 60%")
- Personalized recommendations

---

### For US012-03: Notify At-Risk Student (Notification System)

**Check these collections in Firebase Console:**

1. **`notification`** ⭐ **MAIN COLLECTION TO CHECK**
   - This is where all notifications are stored
   - Filter by: `userId` = student's user ID
   - Look for:
     - `type`: Should be `'risk_alert'` for risk notifications
     - `title`: Notification title
     - `message`: Notification message
     - `guidance`: Custom guidance from teacher (optional)
     - `riskLevel`: `'high'`, `'medium'`, or `'low'`
     - `riskReasons`: Array of risk reasons
     - `read`: `false` = unread, `true` = read
     - `createdAt`: When notification was created

2. **`course`** - See course titles (used in notifications)
   - Look for: `title` (appears in notification message)

**What you'll see in the interface:**
- Notification bell icon with unread count badge
- Dropdown list of notifications
- Notification details (title, message, guidance, risk level)

---

## Step-by-Step: How to Check in Firebase Console

### 1. Open Firebase Console
- Go to: https://console.firebase.google.com/
- Select your project: **mindcraft-f14ac**
- Click **Firestore Database** in the left menu

### 2. Navigate to Collections

You'll see a list of collections. Click on any collection name to view its documents.

---

## Collection Details

### `notification` Collection (Most Important for US012-03)

**Example document structure:**
```
Collection: notification
Document ID: [auto-generated]
Fields:
  - userId: "r7zKa68NNAazIOzYwoqWULkvSa53" (string)
  - type: "risk_alert" (string)
  - title: "Risk Notification - SQL Fundamentals" (string)
  - message: "Your teacher has sent..." (string)
  - courseId: "upgNzUW8Ky7mp8hao4sG" (string)
  - guidance: "I noticed you've been struggling..." (string, optional)
  - riskLevel: "high" (string)
  - riskReasons: ["Average score below 60%", "Missed 3 deadlines"] (array)
  - read: false (boolean)
  - createdAt: [timestamp]
```

**How to filter:**
- Click on `notification` collection
- Use the filter icon to filter by `userId` to see notifications for a specific student

---

### `enrollment` Collection (For US012-01 and US012-02)

**Example document structure:**
```
Collection: enrollment
Document ID: [auto-generated]
Fields:
  - studentId: "r7zKa68NNAazIOzYwoqWULkvSa53" (string)
  - courseId: "upgNzUW8Ky7mp8hao4sG" (string)
  - enrolledAt: [timestamp]
  - progress: {
      completedLessons: ["lesson1", "lesson2"] (array)
      completedModules: ["module1"] (array)
      overallProgress: 45 (number)
    }
```

**How to filter:**
- Filter by `courseId` to see all students in a course
- Filter by `studentId` to see all courses a student is enrolled in

---

### `submission` Collection (For US012-01 and US012-02)

**Example document structure:**
```
Collection: submission
Document ID: [auto-generated]
Fields:
  - studentId: "r7zKa68NNAazIOzYwoqWULkvSa53" (string)
  - assessmentId: "assessment123" (string, optional)
  - assignmentId: "assignment456" (string, optional)
  - courseId: "upgNzUW8Ky7mp8hao4sG" (string, optional)
  - score: 45 (number)
  - totalPoints: 100 (number)
  - submittedAt: [timestamp]
  - status: "graded" (string)
```

**How to filter:**
- Filter by `studentId` to see all submissions by a student
- Filter by `courseId` to see all submissions for a course

---

## Quick Checklist

### To see data for US012-01 (Teacher Analytics):
- ✅ Check `enrollment` collection (filter by `courseId`)
- ✅ Check `submission` collection (filter by `courseId` or `studentId`)
- ✅ Check `user` collection (to see student names)

### To see data for US012-02 (Student Progress):
- ✅ Check `enrollment` collection (filter by `studentId`)
- ✅ Check `submission` collection (filter by `studentId`)
- ✅ Check `course` collection (to see course details)
- ✅ Check `assessment` collection (to see deadlines)
- ✅ Check `assignment` collection (to see deadlines)

### To see data for US012-03 (Notifications):
- ✅ **Check `notification` collection** (filter by `userId`)
- ✅ Check `course` collection (to see course titles)

---

## Tips

1. **Use Filters**: Click the filter icon in Firebase Console to filter documents by field values
2. **Sort by Timestamp**: Click on `createdAt` or `submittedAt` columns to sort by date
3. **Check Unread Notifications**: Filter `notification` collection where `read = false`
4. **View Risk Alerts**: Filter `notification` collection where `type = 'risk_alert'`

---

## What Each Interface Shows

| Interface | Main Data Source | What to Check in Firebase |
|-----------|-----------------|---------------------------|
| **Analytics Page (Teacher)** | `enrollment` + `submission` | Check `enrollment` for course enrollments, `submission` for scores |
| **Progress Page (Student)** | `enrollment` + `submission` | Check `enrollment` for your progress, `submission` for your scores |
| **Notification Bell** | `notification` | Check `notification` collection filtered by `userId` |

---

## Example: Finding a Student's Notifications

1. Go to Firebase Console → Firestore Database
2. Click on `notification` collection
3. Click the filter icon
4. Add filter: `userId` = `r7zKa68NNAazIOzYwoqWULkvSa53` (student's user ID)
5. You'll see all notifications for that student
6. Look for documents where `read = false` to see unread notifications
7. Check `type = 'risk_alert'` to see risk notifications

---

## Example: Finding At-Risk Students in a Course

1. Go to Firebase Console → Firestore Database
2. Click on `enrollment` collection
3. Filter by `courseId` = `upgNzUW8Ky7mp8hao4sG` (your course ID)
4. You'll see all enrollments for that course
5. Note the `studentId` values
6. Check `submission` collection filtered by those `studentId` values
7. Look for low scores or missing submissions to identify at-risk students
