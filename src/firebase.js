import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

let db, app;

if (typeof window !== 'undefined') {
  const required = {
    apiKey:            import.meta.env.PUBLIC_FIREBASE_API_KEY,
    authDomain:        import.meta.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId:         import.meta.env.PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket:     import.meta.env.PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId:             import.meta.env.PUBLIC_FIREBASE_APP_ID,
  };

  app = getApps().length ? getApps()[0] : initializeApp(required);
  db  = getFirestore(app);
}

export { db, app };
