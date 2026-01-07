# Team Setup Guide

## Quick Start for New Team Members

### 1. Clone the Repository from GitHub

**Prerequisites:**
- Git installed on your computer ([Download Git](https://git-scm.com/downloads))
- GitHub account (if you need access to private repo)

**Steps:**

1. **Open terminal/command prompt** (PowerShell on Windows, Terminal on Mac/Linux)

2. **Navigate to where you want to clone the project:**
   ```bash
   cd ~/Documents  # or wherever you keep projects
   ```

3. **Clone the repository:**
   ```bash
   git clone https://github.com/MahWilson/MindCraft.git
   ```

4. **Navigate into the project folder:**
   ```bash
   cd MindCraft
   ```

**Alternative: Using GitHub Desktop or VS Code:**
- Open GitHub Desktop → File → Clone Repository → Enter URL
- Or in VS Code: Source Control → Clone Repository → Enter URL

**Troubleshooting:**
- If you get "repository not found", contact team lead to be added to the GitHub repository
- If you need SSH access, use: `git clone git@github.com:MahWilson/MindCraft.git`

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

**⚠️ IMPORTANT: Without proper Firebase configuration, the AI assistant will use hardcoded fallback responses instead of real Gemini AI!**

**Option A: Get Firebase Config from Firebase Console (Recommended)**
1. You should receive an invite to the Firebase project
2. Go to [Firebase Console](https://console.firebase.google.com/)
3. Select the project: `mindcraft-f14ac`
4. Click **gear icon** → **Project settings**
5. Scroll to **Your apps** section → **Web app** (or create one if needed)
6. Copy the Firebase config values
7. Create `.env.local` file in project root with these values:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=<paste from Firebase Console>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<paste from Firebase Console>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<paste from Firebase Console>
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=<paste from Firebase Console>
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<paste from Firebase Console>
NEXT_PUBLIC_FIREBASE_APP_ID=<paste from Firebase Console>
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=<paste from Firebase Console>
```

**Option B: Receive .env.local file from team lead**
- You'll receive a `.env.local` file via secure channel
- Copy the `.env.local` file to the project root directory
- Make sure it's named exactly `.env.local` (with the leading dot)

### 4. Run Development Server

```bash
npm run dev
```

### 5. Access the Application

- Open `http://localhost:3000` in your browser
- Sign in with your Firebase Auth credentials (provided by team lead)

## Environment Variables

The `.env.local` file contains Firebase configuration. **Never commit this file to Git!**

Required variables:
- `NEXT_PUBLIC_FIREBASE_API_KEY` - **Required for AI features (Gemini)**
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID`

**Note**: Next.js automatically loads `.env.local` files. Make sure your file is named exactly `.env.local` (not `.env` or `env.local`).

## Getting Firebase Credentials

If you need Firebase access:
1. Contact the team lead to be added to the Firebase project
2. Or request the Firebase config values via secure channel

## Troubleshooting

**"Missing NEXT_PUBLIC_FIREBASE_API_KEY" error:**
- Make sure `.env.local` file exists in project root
- Check file name is exactly `.env.local` (not `env.txt` or `.env`)
- Restart dev server after creating/updating `.env.local`

**AI Assistant using hardcoded responses instead of real Gemini:**
- **Symptom**: AI responses are generic and don't seem intelligent/contextual
- **Cause**: Firebase environment variables are missing or incorrect
- **Solution**:
  1. Check that `.env.local` exists in project root
  2. Verify all `NEXT_PUBLIC_FIREBASE_*` variables are set correctly
  3. Check server console for error messages like `⚠️ Firebase AI not configured` or `❌ Firebase AI Error`
  4. Restart the dev server (`npm run dev`)
  5. Check that Firebase API Key has Gemini API enabled in Firebase Console
- **How to verify**: Look at server console logs – if you see the above errors, the AI is falling back to hardcoded responses

**"Permission denied" errors:**
- Make sure you're signed in with Firebase Auth
- Check that your user profile exists in Firestore `users` collection
- Contact team lead if you need to be added to Firebase project

## Next Steps

- Read [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for detailed Firebase setup
- Read [CONTRIBUTING.md](./CONTRIBUTING.md) for development guidelines
- See [ARCHITECTURE.md](./ARCHITECTURE.md) for system overview

