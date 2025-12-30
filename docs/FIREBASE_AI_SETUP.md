# Firebase AI Logic SDK Setup Guide

## ✅ What You've Done

You've set up Firebase AI Logic SDK which is **similar to direct API keys** but uses Firebase's backend infrastructure. This is actually a great choice because:

1. ✅ **Uses Firebase Backend** - More secure, API keys managed by Firebase
2. ✅ **Unified API** - Same interface across different AI providers
3. ✅ **Easy Integration** - Works with your existing Firebase setup
4. ✅ **Remote Config Support** - Can change models remotely later

## 📦 What's Installed

- ✅ Firebase SDK v12.7.0 (supports AI Logic SDK)
- ✅ Firebase AI Logic SDK (included in Firebase SDK)

## 🔧 What's Been Set Up

### 1. Firebase AI Helper (`lib/firebase-ai.js`)
- `generateText()` - Generate text from prompts
- `generateJSON()` - Generate structured JSON responses
- `generateWithHistory()` - Chat-like conversations with history

### 2. Firebase Initialization (`firebase.js`)
- AI service initialized with `getAI()` and `GoogleAIBackend()`
- Exported `ai` instance for use across the app

### 3. API Routes Updated (`app/api/ai/route.js`)
- **Coding Help (US012-01)**: Now uses real Firebase AI
- **Concept Explanation (US012-02)**: Now uses real Firebase AI
- Fallback to stubs if AI fails (for development)

## 🚀 Next Steps

### Step 1: Get Gemini API Key

1. Go to https://makersuite.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the API key

### Step 2: Configure Firebase Project

**Option A: Firebase Console (Recommended)**
1. Go to Firebase Console → Your Project → Project Settings
2. Scroll to "API Keys" section
3. Find or create a Web API key
4. Enable "Gemini API" for that key

**Option B: Environment Variable**
Add to `.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
```

**Note**: Firebase AI Logic SDK uses your Firebase project's API key, not a separate Gemini API key. The Gemini API is accessed through Firebase's backend.

### Step 3: Test It Out

1. Start your dev server: `npm run dev`
2. Go to `/ai/coding-help` or `/ai/explain`
3. Try asking a question
4. Check console for any errors

## 🔍 How It Works

### Similar to Direct API Keys?

**Yes, but better:**
- ✅ Uses Firebase's secure backend
- ✅ API keys managed by Firebase (more secure)
- ✅ Can use Firebase Remote Config to change models
- ✅ Unified API across providers

**Differences:**
- Uses Firebase project API key (not separate Gemini key)
- Calls go through Firebase backend
- Can add Firebase-specific features (Remote Config, Analytics)

### Code Example

```javascript
// Before (direct API):
import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// After (Firebase AI):
import { generateText } from '@/lib/firebase-ai';
const response = await generateText(prompt);
```

## 🐛 Troubleshooting

### Error: "getAI is not a function"
- **Fix**: Make sure Firebase SDK is v11+ (you have v12.7.0 ✅)

### Error: "API key not found"
- **Fix**: Check Firebase Console → Project Settings → API Keys
- Make sure Gemini API is enabled for your project

### Error: "Rate limit exceeded"
- **Fix**: Firebase AI uses the same rate limits as direct Gemini API
- Free tier: 60 requests/minute
- Add rate limiting if needed

### Fallback to Stubs
- If AI fails, the code falls back to stub responses
- Check console logs for error details
- This is intentional for development

## 📝 Environment Variables

You need:
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
# ... other Firebase config
```

**Note**: No separate `GEMINI_API_KEY` needed! Firebase AI uses your Firebase project's API key.

## 🎯 Next Features to Implement

1. **Learning Recommendations** - Update `app/api/ai/recommendations/route.js`
2. **Content Generation** - Update `app/components/AILearningHelper.jsx`
3. **Assessment Generation** - Update assessment creation routes

## 💡 Tips

- Use `generateWithHistory()` for chat-like features
- Use `generateJSON()` for structured responses
- Adjust `temperature` (0-1) for creativity vs accuracy
- Use `maxTokens` to limit response length

## 🔗 Resources

- [Firebase AI Logic SDK Docs](https://firebase.google.com/docs/ai)
- [Gemini Models](https://ai.google.dev/models/gemini)
- [Firebase Console](https://console.firebase.google.com)

