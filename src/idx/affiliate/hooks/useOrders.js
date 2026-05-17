import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc,
  doc, serverTimestamp, query, orderBy,
} from 'firebase/firestore';
import { db } from '../../../firebase';

export const useOrders = (uid) => {
  const [outbound, setOutbound] = useState([]);
  const [inbound, setInbound] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, 'affiliates', uid, 'orders'),
      orderBy('createdAt', 'desc'),
    );
    return onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setOutbound(all.filter((o) => o.direction === 'outbound'));
      setInbound(all.filter((o) => o.direction === 'inbound'));
      setLoading(false);
    });
  }, [uid]);

  const placeOutbound = async (orderData) => {
    await addDoc(collection(db, 'affiliates', uid, 'orders'), {
      ...orderData,
      direction: 'outbound',
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'affiliates', uid), { lastOrderAt: serverTimestamp() });
  };

  const updateOrderStatus = async (orderId, status) => {
    await updateDoc(
      doc(db, 'affiliates', uid, 'orders', orderId),
      { status, updatedAt: serverTimestamp() },
    );
  };

  return { outbound, inbound, loading, placeOutbound, updateOrderStatus };
};
