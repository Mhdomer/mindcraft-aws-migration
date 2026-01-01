# Firebase Admin SDK Setup Guide

This guide will help you configure Firebase Admin SDK to enable server-side operations that bypass Firestore security rules.

## Why Admin SDK?

Firebase Admin SDK runs with elevated privileges and bypasses Firestore security rules, which is necessary for:
- Server-side API routes that need to write data
- Background operations
- Automated notifications

## Step-by-Step Setup

### Step 1: Get Service Account Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **mindcraft-f14ac**
3. Click the **gear icon** (⚙️) next to "Project Overview"
4. Select **Project settings**
5. Go to the **Service accounts** tab
6. Click **Generate new private key**
7. A dialog will appear - click **Generate key**
8. A JSON file will be downloaded (e.g., `mindcraft-f14ac-firebase-adminsdk-xxxxx.json`)

### Step 2: Extract Values from JSON

Open the downloaded JSON file. It will look like this:

```json
{
  "type": "service_account",
  "project_id": "mindcraft-f14ac",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@mindcraft-f14ac.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
```

You need these three values:
- `project_id` → `FIREBASE_ADMIN_PROJECT_ID`
- `client_email` → `FIREBASE_ADMIN_CLIENT_EMAIL`
- `private_key` → `FIREBASE_ADMIN_PRIVATE_KEY`

### Step 3: Add to .env File

Open your `.env` or `.env.local` file in the project root and add these variables:

```env
# Firebase Admin SDK Configuration
FIREBASE_ADMIN_PROJECT_ID=mindcraft-f14ac
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@mindcraft-f14ac.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

**⚠️ IMPORTANT:**
- The `FIREBASE_ADMIN_PRIVATE_KEY` must be in quotes (`"..."`)
- Keep the `\n` characters in the private key (they represent newlines)
- The private key should be on a single line with `\n` characters
- Never commit this file to Git!

### Step 4: Verify Setup

1. Restart your development server:
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```

2. Check the server console for Admin SDK initialization:
   - ✅ Success: You should see no errors
   - ❌ Failure: You'll see "Failed to initialize Firebase Admin:" with error details

3. Test by sending a notification from the analytics page

## Troubleshooting

### Error: "Failed to initialize Firebase Admin"

**Check 1: Environment Variables**
- Make sure all three variables are set in `.env` or `.env.local`
- Restart the dev server after adding/changing environment variables

**Check 2: Private Key Format**
- The private key must be in quotes
- Keep all `\n` characters (don't replace with actual newlines)
- The entire key should be on one line

**Check 3: Project ID**
- Make sure `FIREBASE_ADMIN_PROJECT_ID` matches your Firebase project ID
- It should be `mindcraft-f14ac` (from your existing config)

**Check 4: Client Email**
- Make sure `FIREBASE_ADMIN_CLIENT_EMAIL` matches the email from the JSON file
- It should end with `@mindcraft-f14ac.iam.gserviceaccount.com`

### Error: "Missing or insufficient permissions"

If you still get permission errors after setting up Admin SDK:

1. Check server console for Admin SDK initialization errors
2. Verify the service account has proper permissions in Firebase Console
3. Make sure you restarted the dev server after adding environment variables

### Alternative: Using GOOGLE_APPLICATION_CREDENTIALS

If you prefer to use a JSON file directly:

1. Save the downloaded JSON file in your project root (e.g., `firebase-admin-key.json`)
2. Add to `.env`:
   ```env
   GOOGLE_APPLICATION_CREDENTIALS=./firebase-admin-key.json
   ```
3. Add `firebase-admin-key.json` to `.gitignore`

## Security Notes

⚠️ **NEVER commit these credentials to Git!**

- The `.env` file should already be in `.gitignore`
- The service account has full access to your Firebase project
- Keep the JSON file secure
- Rotate keys if they're ever exposed

## Verification

After setup, you can verify Admin SDK is working by checking the server logs when you start the dev server. If configured correctly, you should see no errors related to Firebase Admin initialization.

When you send a notification, check the server console - you should see:
```
Notification created successfully with Admin SDK: <document-id>
```

Instead of permission errors.
