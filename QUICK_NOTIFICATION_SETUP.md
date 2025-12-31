# Quick Setup: Create Test Notification for Screenshot

## 🚀 Fastest Method: Firebase Console

### Step 1: Open Firebase Console
1. Go to: https://console.firebase.google.com/
2. Select project: **mindcraft-f14ac**
3. Click **Firestore Database** in the left menu

### Step 2: Create Notification Document
1. Click on the **`notification`** collection
2. Click **Add document** (or **Start collection** if it doesn't exist)
3. Use **Auto-ID** for the document ID
4. Add these fields one by one:

| Field Name | Type | Value |
|------------|------|-------|
| `userId` | string | `r7zKa68NNAazIOzYwoqWULkvSa53` |
| `type` | string | `risk_alert` |
| `title` | string | `Risk Notification - SQL Fundamentals` |
| `message` | string | `Your teacher has sent a notification regarding your learning performance in the course "SQL Fundamentals". Please review your progress and take action to improve.` |
| `courseId` | string | `upgNzUW8Ky7mp8hao4sG` |
| `guidance` | string | `I noticed you've been struggling with the recent assignments. Let's schedule a meeting to discuss how we can improve your performance. Please review the course materials and complete the pending assignments. Don't hesitate to reach out if you need help!` |
| `riskLevel` | string | `high` |
| `riskReasons` | array | Click "array", then add these 3 items:<br>1. `Average score below threshold (45%)`<br>2. `Multiple missed deadlines (3 assignments)`<br>3. `Inactive for 10 days` |
| `read` | boolean | `false` |
| `createdAt` | timestamp | Click the field type dropdown → Select **timestamp** → Click **Use server timestamp** |

### Step 3: Save
- Click **Save**

### Step 4: View in App
1. **Log out** if you're logged in as teacher
2. **Log in as student**: `student4@gmail.com` (or the student account)
3. **Look at the notification bell** in the header (top right)
4. You should see a **red badge** with a number
5. **Click the bell** to see the notification dropdown
6. **Take your screenshot!** 📸

## 📝 Field Values Reference

**Student User ID:** `r7zKa68NNAazIOzYwoqWULkvSa53`  
**Course ID (SQL Fundamentals):** `upgNzUW8Ky7mp8hao4sG`

## 🎨 What You'll See

The notification will appear in the notification bell dropdown with:
- 🔴 Red circular background (high risk)
- ⚠️ Alert triangle icon
- Course title: "SQL Fundamentals"
- Risk level: "High"
- Guidance message
- Relative time (e.g., "just now")

## ⚠️ Troubleshooting

**Notification not showing?**
- Make sure you're logged in as the student (userId must match)
- Check that `read` is `false`
- Verify `createdAt` is a server timestamp
- Refresh the page

**Need different student/course?**
- Find the user ID in Firestore `user` collection
- Find the course ID in Firestore `course` collection
- Update the `userId` and `courseId` fields accordingly
