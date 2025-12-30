# Quick AI Implementation Guide

## Step 1: Get Gemini API Key (5 minutes)

1. Go to https://makersuite.google.com/app/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the API key
5. Add to `.env.local`:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

## Step 2: Install Dependencies

```bash
npm install @google/generative-ai
```

## Step 3: Create Gemini Client

Create `lib/gemini.js`:
```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateText(prompt, options = {}) {
  try {
    const model = genAI.getGenerativeModel({ 
      model: options.model || 'gemini-pro' 
    });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to generate AI response');
  }
}

export async function generateJSON(prompt, options = {}) {
  const text = await generateText(prompt, options);
  try {
    // Try to extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { response: text };
  } catch (error) {
    return { response: text };
  }
}
```

## Step 4: Update API Routes

Replace stub implementations in:
- `app/api/ai/recommendations/route.js`
- `app/api/ai/route.js` (coding_help, explain_concept actions)

## Step 5: Test

1. Test learning recommendations
2. Test concept explanation
3. Test coding help
4. Monitor API usage in Google Cloud Console

## Rate Limiting

Gemini free tier: 60 requests/minute
- Add simple in-memory rate limiting
- Or use a more robust solution like `express-rate-limit`

## Error Handling

Always wrap Gemini calls in try-catch:
```javascript
try {
  const response = await generateText(prompt);
  return NextResponse.json({ response });
} catch (error) {
  console.error('AI error:', error);
  return NextResponse.json(
    { error: 'AI service temporarily unavailable' },
    { status: 503 }
  );
}
```

