# AI Assistant Environment Setup Guide

## Problem: AI Using Hardcoded Responses Instead of Real Gemini

### Symptoms
- AI assistant gives generic, hardcoded responses
- Responses don't seem intelligent or contextual
- Same responses appear regardless of input complexity
- Works on one PC but not another (even with same codebase)

### Root Cause
The AI assistant tries to use Firebase AI (Gemini) first, but if Firebase is not properly configured, it **silently falls back** to hardcoded sample responses. This happens when:

1. `.env.local` file is missing  
2. Firebase environment variables are not set correctly  
3. Firebase API Key doesn't have Gemini API enabled  
4. Dev server wasn't restarted after creating `.env.local`

## Solution

### Step 1: Create `.env.local` File

Create a file named `.env.local` in the project root directory with your Firebase credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### Step 2: Get Firebase Credentials

**Option A: From Firebase Console**
1. Go to `https://console.firebase.google.com/`
2. Select your project
3. Click ⚙ **Project settings**
4. Scroll to **Your apps** → **Web app**
5. Copy the config values and paste into `.env.local`

**Option B: From Team Lead**
- Request the `.env.local` file or Firebase config via secure channel

### Step 3: Enable Gemini API

1. In Firebase Console, go to **Project settings** → **API Keys**
2. Find your Web API key
3. Ensure **Gemini API** is enabled for that key
4. If not enabled, edit the key and turn on Gemini

### Step 4: Restart Dev Server

After creating/updating `.env.local`:

```bash
# Stop the current server (Ctrl+C)
npm run dev
```

### Step 5: Verify It's Working

1. **Check server console** – you should **not** see:
   - `❌ Firebase AI Error` messages
   - `⚠️ Firebase AI not configured` warnings  
2. **Test AI Assistant** – ask a coding/database question:
   - Real Gemini: contextual, intelligent responses
   - Fallback: generic, pre-written responses  
3. **Confirm env vars** – log `process.env.NEXT_PUBLIC_FIREBASE_API_KEY` (first few chars only) if needed during debugging

## How the Code Works

### 1. Coding Help (`/api/ai` – `action: "coding_help"`)

- Tries to use Firebase AI Logic SDK (`generateWithHistory`)
- On success: returns real Gemini response
- On failure or missing env vars:
  - Logs detailed error messages to the server console
  - Falls back to `sampleCodingHelp` (hardcoded assistant)

### 2. Concept Explanation (`/api/ai` – `action: "explain_concept"`)

- Tries to use Firebase AI Logic SDK (`generateText`)
- On failure or missing env vars:
  - Logs detailed error messages
  - Falls back to `sampleExplainConcept` (hardcoded explanations)

## Troubleshooting Checklist

If your teammate only gets generic responses:

1. **Check `.env.local` exists** in the project root  
2. **Verify all `NEXT_PUBLIC_FIREBASE_*` vars** are present  
3. **Restart dev server** after any env change  
4. **Check console logs** for:
   - `⚠️ Firebase AI not configured`
   - `❌ Firebase AI Error (Coding Help / Concept Explanation)`  
5. **Confirm API key permissions** – Gemini API enabled in Firebase

## Notes for Team

- `.env.local` is in `.gitignore` – each team member needs their own copy  
- Share credentials securely only (never via plain chat/screenshots)  
- If you rotate keys, update **all teammates'** `.env.local` files


