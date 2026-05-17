import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebase';

export const useWallet = (uid) => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(doc(db, 'affiliates', uid), (snap) => {
      if (snap.exists()) setBalance(snap.data().walletBalance ?? 0);
      setLoading(false);
    });
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'affiliates', uid, 'wallet_transactions'),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(q, (snap) => {
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [uid]);

  const credit = async (amount, reason, meta = {}) => {
    await addDoc(collection(db, 'affiliates', uid, 'wallet_transactions'), {
      type: 'credit', amount, reason, ...meta, createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'affiliates', uid), { walletBalance: increment(amount) });
  };

  const debit = async (amount, reason, meta = {}) => {
    await addDoc(collection(db, 'affiliates', uid, 'wallet_transactions'), {
      type: 'debit', amount, reason, ...meta, createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'affiliates', uid), { walletBalance: increment(-amount) });
  };

  return { balance, transactions, loading, credit, debit };
};
