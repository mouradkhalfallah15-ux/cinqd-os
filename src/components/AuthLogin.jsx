import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { FiLock, FiMail, FiAlertCircle, FiCpu } from 'react-icons/fi';

const ERRORS = {
  'auth/invalid-credential':      'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  'auth/user-disabled':           'هذا الحساب معطّل. تواصل مع المسؤول.',
  'auth/too-many-requests':       'محاولات كثيرة جداً. حاول مجدداً بعد قليل.',
  'auth/network-request-failed':  'خطأ في الاتصال. تحقق من الإنترنت.',
};

export default function AuthLogin() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [checking, setChecking] = useState(true);

  // If already logged in, skip the login page
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        window.location.href = '/admin/dashboard';
      } else {
        setChecking(false);
      }
    });
    return () => unsub();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      window.location.href = '/admin/dashboard';
    } catch (err) {
      setError(ERRORS[err.code] || 'حدث خطأ غير متوقع. حاول مجدداً.');
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-950">
        <div className="text-cyan-400 text-xl flex items-center gap-3">
          <FiCpu className="animate-spin" />
          <span>جارٍ التحقق...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">
            <span className="text-cyan-400">CINQD</span> Industrial OS
          </h1>
          <p className="text-slate-400 mt-2 text-sm">تسجيل الدخول إلى لوحة التحكم</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 space-y-6"
        >
          {/* Error */}
          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3">
              <FiAlertCircle className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm text-slate-400 block">البريد الإلكتروني</label>
            <div className="relative">
              <FiMail className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="admin@cinqd.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pr-10 pl-4 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-sm text-slate-400 block">كلمة المرور</label>
            <div className="relative">
              <FiLock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading}
                placeholder="••••••••"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pr-10 pl-4 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors disabled:opacity-50"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-900 disabled:text-cyan-700 text-slate-950 font-bold py-3 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <FiCpu className="animate-spin" />
                جارٍ تسجيل الدخول...
              </>
            ) : (
              'تسجيل الدخول'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
