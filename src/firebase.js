import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// ─── Env Var Validation ───────────────────────────────────────────────────────
const required = {
  apiKey:            import.meta.env.PUBLIC_FIREBASE_API_KEY,
  authDomain:        import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.PUBLIC_FIREBASE_APP_ID,
};

const missing = Object.entries(required)
  .filter(([, v]) => !v)
  .map(([k]) => `PUBLIC_FIREBASE_${k.replace(/([A-Z])/g, '_$1').toUpperCase()}`);

if (missing.length > 0) {
  throw new Error(`Missing required Firebase env vars: ${missing.join(', ')}`);
}

// ─── Firebase Init ────────────────────────────────────────────────────────────
const app = initializeApp(required);
const db = getFirestore(app);
const auth = getAuth(app);

// ─── App Check (browser only) ─────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  const siteKey = import.meta.env.PUBLIC_RECAPTCHA_SITE_KEY;

  if (!siteKey) {
    console.warn('[Firebase] PUBLIC_RECAPTCHA_SITE_KEY is not set — App Check is disabled.');
  } else {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true
    });
  }
}

export { db, app, auth };
