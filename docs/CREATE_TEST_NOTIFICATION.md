# How to Create a Test Notification for Screenshots

This guide shows you how to create a notification from a teacher to a student for UI screenshots.

## Method 1: Using the API Script (Recommended if Admin SDK is configured)

1. **Make sure your dev server is running:**
   ```bash
   npm run dev
   ```

2. **Update the script with correct user IDs:**
   - Open `scripts/create-test-notification-api.js`
   - Update `userId` with the student's user ID
   - Update `courseId` with the course ID (optional)

3. **Run the script:**
   ```bash
   node scripts/create-test-notification-api.js
   ```

## Method 2: Using Firebase Console (Works without Admin SDK)

1. **Go to Firebase Console:**
   - Visit [Firebase Console](https://console.firebase.google.com/)
   - Select your project: **mindcraft-f14ac**
   - Go to **Firestore Database**

2. **Create a new document:**
   - Click on the `notification` collection
   - Click **Add document**
   - Use **Auto-ID** for document ID

3. **Add these fields:**
   ```
   userId: [student's user ID - e.g., r7zKa68NNAazIOzYwoqWULkvSa53]
   type: risk_alert
   title: Risk Notification - SQL Fundamentals
   message: Your teacher has sent a notification regarding your learning performance in the course "SQL Fundamentals". Please review your progress and take action to improve.
   courseId: [course ID - e.g., upgNzUW8Ky7mp8hao4sG]
   guidance: I noticed you've been struggling with the recent assignments. Let's schedule a meeting to discuss how we can improve your performance. Please review the course materials and complete the pending assignments. Don't hesitate to reach out if you need help!
   riskLevel: high
   riskReasons: ["Average score below threshold (45%)", "Multiple missed deadlines (3 assignments)", "Inactive for 10 days"]
   read: false
   createdAt: [Click "timestamp" and select "server timestamp"]
   ```

4. **Save the document**

5. **Log in as the student** to see the notification in the UI

## Method 3: Using the Analytics Page (If you're logged in as teacher)

1. **Log in as a teacher** (e.g., teach4@gmail.com)
2. **Go to Analytics page** (`/analytics`)
3. **Select a course** that has at-risk students
4. **Click "Send Notification"** on any at-risk student
5. **Fill in the guidance message** and send

## Finding User IDs

To find user IDs:

1. **Using Firebase Console:**
   - Go to Firestore Database
   - Open the `user` collection
   - Find the user by email
   - Copy the document ID

2. **Using Browser Console:**
   - Log in to the app
   - Open browser console
   - Check cookies or localStorage for user ID
   - Or check the Network tab when loading user data

## Example Notification Data

Here's a complete example notification document:

```json
{
  "userId": "r7zKa68NNAazIOzYwoqWULkvSa53",
  "type": "risk_alert",
  "title": "Risk Notification - SQL Fundamentals",
  "message": "Your teacher has sent a notification regarding your learning performance in the course \"SQL Fundamentals\". Please review your progress and take action to improve.",
  "courseId": "upgNzUW8Ky7mp8hao4sG",
  "guidance": "I noticed you've been struggling with the recent assignments. Let's schedule a meeting to discuss how we can improve your performance. Please review the course materials and complete the pending assignments. Don't hesitate to reach out if you need help!",
  "riskLevel": "high",
  "riskReasons": [
    "Average score below threshold (45%)",
    "Multiple missed deadlines (3 assignments)",
    "Inactive for 10 days"
  ],
  "read": false,
  "createdAt": [Server Timestamp]
}
```

## Verification

After creating the notification:

1. **Log out** (if logged in as teacher)
2. **Log in as the student** (e.g., student4@gmail.com)
3. **Check the notification bell** in the header
4. **You should see** the notification with a red badge
5. **Click the bell** to see the notification dropdown
6. **Take your screenshot!** 📸

## Troubleshooting

**Notification not showing:**
- Make sure `userId` matches the logged-in student's user ID
- Check that `read` is set to `false`
- Verify `createdAt` is a server timestamp (not a regular date)
- Refresh the page or wait a few seconds

**Permission errors:**
- If using the script, make sure Admin SDK is configured
- If using Firebase Console, you should have no permission issues
- Check Firestore security rules if needed
