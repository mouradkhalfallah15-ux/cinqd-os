import React, { useState, useEffect } from 'react';
import { FiAlertTriangle, FiCpu, FiLock, FiMail, FiZap } from 'react-icons/fi';

export default function AuthLogin() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch('/api/auth/verify')
      .then(r => r.json())
      .then(d => { if (d.authenticated) window.location.href = '/admin/dashboard'; })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Authentication failed.'); return; }
      window.location.href = '/admin/dashboard';
    } catch {
      setError('Connection error. Check your network.');
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="flex items-center gap-3 text-cyan-400">
          <FiCpu className="animate-spin text-xl" />
          <span className="font-semibold text-sm">Verifying session…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">

      {/* Header — mirrors dashboard header */}
      <header className="border-b border-slate-800 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center">
          <FiZap className="text-cyan-400 text-sm" />
        </div>
        <div>
          <p className="text-sm font-black text-white tracking-tight">
            <span className="text-cyan-400">CINQD</span> Industrial OS
          </p>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest">Cinqd Global Dataset · Enterprise v2</p>
        </div>
      </header>

      {/* Login card */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">

          {/* Title */}
          <div>
            <h2 className="text-xl font-black text-white">Sign in</h2>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">Administrator access</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl px-4 py-3">
              <FiAlertTriangle className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                Email
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-sm" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="admin@cinqd.com"
                  className="w-full bg-slate-900/60 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 rounded-xl py-2.5 pl-9 pr-4 text-white text-sm placeholder-slate-700 outline-none transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-sm" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="••••••••"
                  className="w-full bg-slate-900/60 border border-slate-800 hover:border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 rounded-xl py-2.5 pl-9 pr-4 text-white text-sm placeholder-slate-700 outline-none transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-cyan-400 hover:bg-cyan-300 disabled:bg-cyan-900 disabled:text-cyan-700 text-slate-950 text-sm font-black rounded-xl py-2.5 transition-colors duration-150"
            >
              {loading ? <><FiCpu className="animate-spin" /> Signing in…</> : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-[10px] text-slate-700 uppercase tracking-widest">
            Secured · Local Auth · PostgreSQL
          </p>
        </div>
      </div>
    </div>
  );
}
