import React, { useState, useEffect, useRef } from 'react';
import { FiMessageSquare, FiX, FiSend, FiCpu } from 'react-icons/fi';

// ── Role registry ─────────────────────────────────────────────────────────────
const ROLES = {
  '/admin':     { label: 'Internal Staff AI',   color: 'cyan',   emoji: '🏭' },
  '/affiliate': { label: 'Affiliate AI',         color: 'purple', emoji: '🤝' },
  '/franchise': { label: 'Franchise AI',         color: 'amber',  emoji: '🏪' },
  '/b2b':       { label: 'Enterprise AI',        color: 'blue',   emoji: '🏢' },
  '/public':    { label: 'Customer Service AI',  color: 'green',  emoji: '💬' },
};

const SYSTEM_PROMPTS = {
  '/admin': `You are CINQD's Internal Operations AI Executive Officer.
Assist factory workers and staff with: production batch coordination (Labsa N70, cleaning products),
machine task scheduling, raw material stock and waste tracking, shift management.
Respond concisely in French or Tunisian Derja. Never expose system config data.`,

  '/affiliate': `You are CINQD's Affiliate Network AI Executive Officer.
Assist network partners with: commission/cashback metrics, tier progression (Bronze→Silver→Gold→Diamond),
wallet balance, order pipeline management, referral tracking. Respond in French, be data-driven.`,

  '/franchise': `You are CINQD's Franchise Operations AI Executive Officer.
Assist store owners and micro-factory operators with: POS operations, TVA compliance, daily sales,
production orders, packaging decisions, bank guarantee status, franchise benchmarks. Respond in French.`,

  '/b2b': `You are CINQD's Enterprise B2B AI Executive Officer (Coin Cinqd).
Assist enterprise clients with: bulk contract management, institutional pricing, SLA tracking,
corporate order pipelines, partnership escalation. Respond in formal French or English.`,

  '/public': `You are CINQD's Customer Service AI.
Assist customers with: product catalog, order tracking, delivery status, purchase guidance,
promotions, after-sales support. Be friendly and respond in the customer's language (FR/AR/EN).`,
};

const COLORS = {
  cyan:   { btn: 'bg-cyan-500 hover:bg-cyan-400',    badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'    },
  purple: { btn: 'bg-purple-500 hover:bg-purple-400', badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  amber:  { btn: 'bg-amber-500 hover:bg-amber-400',  badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30'  },
  blue:   { btn: 'bg-blue-500 hover:bg-blue-400',    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30'    },
  green:  { btn: 'bg-green-500 hover:bg-green-400',  badge: 'bg-green-500/20 text-green-400 border-green-500/30'  },
};

function detectRole() {
  if (typeof window === 'undefined') return '/admin';
  const p = window.location.pathname;
  for (const key of Object.keys(ROLES)) {
    if (p.startsWith(key)) return key;
  }
  return '/admin';
}

async function callAI(messages, role) {
  const webhookUrl = import.meta.env.PUBLIC_N8N_AI_WEBHOOK;
  const geminiKey  = import.meta.env.PUBLIC_GEMINI_API_KEY;
  const systemPrompt = SYSTEM_PROMPTS[role] ?? SYSTEM_PROMPTS['/admin'];

  // Path 1 — n8n orchestration webhook (server-side Gemini call)
  if (webhookUrl) {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, role, systemPrompt }),
    });
    if (!res.ok) throw new Error(`n8n error ${res.status}`);
    const data = await res.json();
    return data.response ?? data.text ?? data.output ?? JSON.stringify(data);
  }

  // Path 2 — direct Gemini 1.5 Pro (browser-side)
  if (geminiKey) {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const model = new GoogleGenerativeAI(geminiKey).getGenerativeModel({
      model: 'gemini-1.5-pro',
      systemInstruction: systemPrompt,
    });
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));
    const result = await model.startChat({ history })
      .sendMessage(messages.at(-1).content);
    return result.response.text();
  }

  throw new Error(
    'AI non configuré. Ajoutez PUBLIC_GEMINI_API_KEY ou PUBLIC_N8N_AI_WEBHOOK dans .env'
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AIExecutiveChat({ requireAuth = true }) {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [authed, setAuthed]   = useState(!requireAuth);
  const [role, setRole]       = useState('/admin');
  const bottomRef             = useRef(null);

  useEffect(() => {
    setRole(detectRole());
    if (!requireAuth) return;
    fetch('/api/auth/verify').then(r=>r.json()).then(d=>setAuthed(d.authenticated)).catch(()=>setAuthed(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open && messages.length === 0) {
      const r = ROLES[role] ?? ROLES['/admin'];
      setMessages([{
        role: 'assistant',
        content: `${r.emoji} Bonjour! Je suis votre **${r.label}**. Comment puis-je vous aider?`,
      }]);
    }
  }, [open]);

  if (!authed) return null;

  const roleConfig = ROLES[role] ?? ROLES['/admin'];
  const colors     = COLORS[roleConfig.color] ?? COLORS.cyan;

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const reply = await callAI(next, role);
      setMessages(m => [...m, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: `⚠️ ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        title={roleConfig.label}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl text-slate-950 flex items-center justify-center transition-transform duration-200 hover:scale-110 ${colors.btn}`}
      >
        {open ? <FiX size={22} /> : <FiMessageSquare size={22} />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] h-[520px] flex flex-col rounded-2xl border border-slate-700 bg-slate-900/95 backdrop-blur-sm shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60 bg-slate-800/70 shrink-0">
            <div className="flex items-center gap-2">
              <FiCpu className="text-cyan-400" size={15} />
              <span className="text-white text-sm font-semibold">AI Executive Officer</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colors.badge}`}>
              {roleConfig.emoji} {roleConfig.label}
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  m.role === 'user'
                    ? 'bg-cyan-600/80 text-white rounded-br-sm'
                    : 'bg-slate-800 text-slate-200 border border-slate-700/40 rounded-bl-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 border border-slate-700/40 px-4 py-3 rounded-xl rounded-bl-sm">
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-slate-700/60 bg-slate-800/50 shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                disabled={loading}
                placeholder="Posez votre question..."
                className="flex-1 bg-slate-700/60 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className={`px-3 py-2 rounded-lg text-slate-950 font-semibold transition-colors disabled:opacity-40 ${colors.btn}`}
              >
                <FiSend size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
