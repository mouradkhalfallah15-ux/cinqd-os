import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase';

const Gate = () => (
  <div style={{
    minHeight: '100vh',
    background: '#020617',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}>
    <div style={{
      width: 32, height: 32,
      border: '2px solid #22d3ee',
      borderTopColor: 'transparent',
      borderRadius: '50%',
      animation: 'cinqd-spin 0.8s linear infinite',
    }} />
    <style>{`@keyframes cinqd-spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

/**
 * Wraps a component so it only renders for authenticated Firebase users.
 * Unauthenticated visitors are immediately redirected to `redirectTo`.
 *
 * Usage (gateway level):
 *   export const AffiliateDashboard = withAuth(AffiliateDashboardBase);
 */
export function withAuth(Component, { redirectTo = '/admin/login' } = {}) {
  const Protected = (props) => {
    // 'pending' while Firebase resolves, 'ok' when authenticated
    const [ready, setReady] = useState(false);

    useEffect(() => {
      return onAuthStateChanged(auth, (user) => {
        if (user) {
          setReady(true);
        } else {
          window.location.replace(redirectTo);
        }
      });
    }, []);

    if (!ready) return <Gate />;
    return <Component {...props} />;
  };

  Protected.displayName = `withAuth(${Component.displayName ?? Component.name ?? 'Component'})`;
  return Protected;
}
