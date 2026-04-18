/**
 * Environment variable validation.
 * Fails fast on startup if required variables are missing.
 * This prevents silent failures where the app starts but certain
 * features are broken because a secret wasn't injected.
 */

const required = [
  'MONGODB_URI',
  'JWT_SECRET',
];

const optional = {
  PORT: '3001',
  NODE_ENV: 'development',
  FRONTEND_URL: 'http://localhost:3000',
  GEMINI_API_KEY: null,
};

export function validateEnv() {
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nCopy .env.example to .env and fill in all required values.');
    process.exit(1);
  }

  // Set defaults for optional vars
  for (const [key, value] of Object.entries(optional)) {
    if (!process.env[key] && value !== null) {
      process.env[key] = value;
    }
  }

  if (process.env.JWT_SECRET === 'dev-secret-change-in-production' && process.env.NODE_ENV === 'production') {
    console.error('❌ JWT_SECRET must be changed from the default value in production.');
    process.exit(1);
  }

  console.log(`✅ Environment validated (NODE_ENV=${process.env.NODE_ENV})`);
}
