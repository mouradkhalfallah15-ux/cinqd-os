import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { CHURN_INACTIVE_MONTHS } from '../config/defaults';

const monthsSince = (date) => {
  const now = new Date();
  return (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
};

export const useAffiliate = (uid) => {
  const [affiliate, setAffiliate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }

    const ref = doc(db, 'affiliates', uid);
    const unsub = onSnapshot(ref, async (snap) => {
      if (!snap.exists()) { setLoading(false); return; }
      const data = { id: snap.id, ...snap.data() };

      if (data.status === 'active' && data.lastOrderAt) {
        const months = monthsSince(data.lastOrderAt.toDate());
        if (months >= CHURN_INACTIVE_MONTHS) {
          await updateDoc(ref, { status: 'churned', churnedAt: serverTimestamp() });
          data.status = 'churned';
        }
      }

      setAffiliate(data);
      setLoading(false);
    }, (err) => { setError(err); setLoading(false); });

    return unsub;
  }, [uid]);

  return { affiliate, loading, error };
};
