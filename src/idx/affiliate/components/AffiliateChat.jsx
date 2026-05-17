import React, { useState, useEffect, useRef } from 'react';
import {
  collection, onSnapshot, addDoc,
  serverTimestamp, query, orderBy, limit,
} from 'firebase/firestore';
import { db } from '../../../firebase';
import { FiMessageCircle, FiSend } from 'react-icons/fi';

const fmtTime = (ts) =>
  ts?.toDate?.().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) ?? '';

const AffiliateChat = ({ uid, displayName }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const q = query(
      collection(db, 'affiliates', uid, 'chat_messages'),
      orderBy('createdAt', 'asc'),
      limit(100),
    );
    return onSnapshot(q, (snap) =>
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
  }, [uid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'affiliates', uid, 'chat_messages'), {
        text: trimmed,
        sender: uid,
        senderName: displayName ?? 'Affilié',
        role: 'affiliate',
        createdAt: serverTimestamp(),
      });
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-2xl flex flex-col" style={{ height: '520px' }}>
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-700 flex-shrink-0">
        <FiMessageCircle className="text-cyan-400" />
        <h3 className="font-bold text-white text-sm">Chat — Support CINQD</h3>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-green-400">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> En ligne
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <p className="text-slate-500 text-xs text-center pt-10">
            Envoyez un message pour contacter le support CINQD.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === 'affiliate' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[76%] px-3.5 py-2.5 rounded-2xl text-sm ${
              m.role === 'affiliate'
                ? 'bg-cyan-700 text-white rounded-br-sm'
                : 'bg-slate-700 text-slate-200 rounded-bl-sm'
            }`}>
              {m.role !== 'affiliate' && (
                <p className="text-xs text-cyan-400 font-semibold mb-1">{m.senderName ?? 'Support'}</p>
              )}
              <p>{m.text}</p>
              <p className="text-xs opacity-50 mt-1 text-right">{fmtTime(m.createdAt)}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 px-4 py-3 border-t border-slate-700 flex-shrink-0">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Votre message..."
          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white px-3.5 py-2 rounded-xl transition-colors"
        >
          <FiSend />
        </button>
      </div>
    </div>
  );
};

export default AffiliateChat;
