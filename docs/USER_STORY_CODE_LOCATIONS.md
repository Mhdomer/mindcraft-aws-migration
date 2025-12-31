# User Story Code Locations

This document maps User Stories US012-01, US012-02, and US012-03 to their implementation files.

## US012-01: Identify At-Risk Student

**Description:** System automatically identifies students at risk based on performance metrics.

### Primary Implementation Files:

1. **`app/analytics/page.jsx`** (Lines 682-733)
   - **Location:** Risk assessment logic in `loadAnalytics()` function
   - **Key Functions:**
     - Calculates risk levels (low/medium/high) based on:
       - Average assessment scores
       - Missed deadlines count
       - Days since last activity
       - Completion rate
     - Configurable thresholds (default: 60% score, 2 missed deadlines, 7 days inactive)
   - **Code Section:**
     ```javascript
     // Identify at-risk students (per-course, configurable thresholds)
     const studentsArray = Object.values(studentData).map(student => {
       // Risk calculation logic
       let riskLevel = 'low';
       if (highScoreRisk || highDeadlineRisk || highEngagementRisk) {
         riskLevel = 'high';
       } else if (mediumScoreRisk || mediumDeadlineRisk || mediumEngagementRisk) {
         riskLevel = 'medium';
       }
       // ...
     });
     ```

2. **`app/analytics/page.jsx`** (Lines 735-741)
   - Filters and sorts at-risk students
   - Displays them in the "At-Risk Students" section

### Related Files:
- **`app/progress/page.jsx`** (Lines 237-293) - Similar risk calculation for student's own view

---

## US012-02: View Risk Indicator

**Description:** Students can view their learning risk indicators and recommendations.

### Primary Implementation Files:

1. **`app/progress/page.jsx`** (Lines 237-293)
   - **Location:** Risk indicator calculation in `loadProgress()` function
   - **Key Functions:**
     - Calculates risk level for each enrolled course
     - Generates risk reasons (e.g., "Average score below 60%")
     - Provides personalized recommendations
   - **Code Section:**
     ```javascript
     // Calculate risk indicators for each course
     const riskLevel = 'low';
     const riskReasons = [];
     const recommendations = [];
     // Risk assessment logic...
     ```

2. **`app/progress/page.jsx`** (Lines 482-556)
   - **Location:** UI rendering of risk indicators
   - **Key Features:**
     - Displays risk level badge (High/Medium/Low)
     - Shows risk factors with icons
     - Displays personalized recommendations
     - Color-coded cards (red for high, yellow for medium, green for low)
   - **Code Section:**
     ```javascript
     {/* Risk Indicators Section */}
     {Object.keys(riskIndicators).length > 0 && (
       <div className="space-y-4">
         <h2>Learning Risk Indicators</h2>
         {/* Risk cards for each course */}
       </div>
     )}
     ```

### Related Files:
- **`app/analytics/page.jsx`** (Lines 1246-1311) - Teacher view of student risk indicators

---

## US012-03: Notify At-Risk Student

**Description:** System automatically sends notifications to at-risk students, and teachers can send custom notifications.

### Primary Implementation Files:

1. **`app/api/notifications/at-risk/route.js`** (Entire file)
   - **Location:** API endpoint for automatic risk notifications
   - **Key Functions:**
     - Receives risk data (courseId, studentId, riskLevel, riskReasons, guidance)
     - Checks for recent notifications (prevents duplicates within 7 days)
     - Creates notification document in Firestore
     - Uses Firebase Admin SDK (with Web SDK fallback)
   - **Endpoint:** `POST /api/notifications/at-risk`

2. **`app/api/notifications/route.js`** (Lines 78-178)
   - **Location:** General notification API endpoint
   - **Key Functions:**
     - `POST /api/notifications` - Create custom notifications (used by teachers)
     - `GET /api/notifications` - Fetch notifications for a user
   - **Used by:** Teacher notification modal in analytics page

3. **`app/analytics/page.jsx`** (Lines 832-855)
   - **Location:** Automatic notification sending
   - **Key Functions:**
     - Automatically sends notifications to all medium/high risk students
     - Called when analytics data is loaded
   - **Code Section:**
     ```javascript
     // Send notifications to at-risk students (medium or high risk)
     for (const student of studentsArray) {
       if (student.riskLevel === 'medium' || student.riskLevel === 'high') {
         fetch('/api/notifications/at-risk', {
           method: 'POST',
           body: JSON.stringify({
             courseId, studentId, riskLevel, riskReasons
           })
         });
       }
     }
     ```

4. **`app/analytics/page.jsx`** (Lines 1700-1760)
   - **Location:** Manual notification sending UI
   - **Key Features:**
     - Custom notification modal
     - Teacher can add guidance message
     - Sends via `/api/notifications` endpoint

5. **`components/NotificationBell.jsx`** (Entire file)
   - **Location:** Student-facing notification UI component
   - **Key Features:**
     - Displays notification bell icon with unread count badge
     - Dropdown shows all notifications
     - Color-coded by type (risk alerts, feedback, etc.)
     - Mark as read functionality
     - Auto-refreshes every 30 seconds
   - **Used in:** Header component (visible to all users)

### Related Files:
- **`app/api/notifications/[id]/read/route.js`** - Mark notification as read
- **`lib/admin.js`** - Firebase Admin SDK initialization (used by notification APIs)

---

## Summary Table

| User Story | Primary Files | Key Functions/Lines |
|-----------|--------------|---------------------|
| **US012-01: Identify At-Risk Student** | `app/analytics/page.jsx` (682-733) | Risk calculation logic, filtering at-risk students |
| **US012-02: View Risk Indicator** | `app/progress/page.jsx` (237-293, 482-556) | Risk calculation, UI rendering |
| **US012-03: Notify At-Risk Student** | `app/api/notifications/at-risk/route.js`<br>`app/analytics/page.jsx` (832-855, 1700-1760)<br>`components/NotificationBell.jsx` | Automatic notifications, manual notifications, UI display |

---

## Testing Locations

To test each user story:

1. **US012-01:** 
   - Go to `/analytics` as a teacher
   - Select a course with enrolled students
   - Check "At-Risk Students" section

2. **US012-02:**
   - Go to `/progress` as a student
   - Scroll to "Learning Risk Indicators" section
   - View risk level, factors, and recommendations

3. **US012-03:**
   - **Automatic:** Analytics page automatically sends notifications
   - **Manual:** Click "Send Notification" on at-risk student in analytics
   - **View:** Check notification bell in header (as student)

---

## Notes

- All three user stories are fully implemented and integrated
- Risk assessment uses configurable thresholds (can be adjusted in code)
- Notifications use Firebase Admin SDK for server-side writes (bypasses security rules)
- UI supports both English and Bahasa Malaysia
- Notifications are automatically deduplicated (won't send duplicate within 7 days)
