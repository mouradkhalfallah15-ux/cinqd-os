
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.PUBLIC_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.PUBLIC_FIREBASE_APP_ID || ""
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Activation de App Check
if (typeof window !== "undefined") {
  // On utilise reCAPTCHA v3. Il faudra configurer le siteKey dans Firebase Console.
  const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.PUBLIC_RECAPTCHA_SITE_KEY || '6Lc_YOUR_SITE_KEY'),
    isTokenAutoRefreshEnabled: true
  });
}

export { db, app };
