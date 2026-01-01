import { initializeApp, getApps, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app;
let adminDb = null;

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY ? process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined;

try {
  if (!getApps().length) {
    if (clientEmail && privateKey && projectId) {
      console.log('🔧 Initializing Firebase Admin SDK with service account credentials...');
      app = initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), projectId });
      adminDb = getFirestore();
      console.log('✅ Firebase Admin SDK initialized successfully');
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('🔧 Initializing Firebase Admin SDK with GOOGLE_APPLICATION_CREDENTIALS...');
      app = initializeApp({ credential: applicationDefault(), projectId });
      adminDb = getFirestore();
      console.log('✅ Firebase Admin SDK initialized successfully');
    } else {
      // Admin SDK not configured - client-side Firestore will be used instead
      console.warn('⚠️  Firebase Admin SDK not configured. Server-side operations may fail with permission errors.');
      console.warn('   To fix: Add FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY to .env');
      console.warn('   See docs/FIREBASE_ADMIN_SETUP.md for setup instructions');
    }
  } else {
    app = getApps()[0];
    adminDb = getFirestore();
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:', error.message);
  console.error('   Check your FIREBASE_ADMIN_* environment variables in .env file');
  console.error('   See docs/FIREBASE_ADMIN_SETUP.md for setup instructions');
}

export { adminDb };
