import React, { useState, useEffect } from 'react';

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

export function withAuth(Component, { redirectTo = '/admin/login' } = {}) {
  const Protected = (props) => {
    const [ready, setReady] = useState(false);

    useEffect(() => {
      fetch('/api/auth/verify')
        .then(r => r.json())
        .then(d => {
          if (d.authenticated) {
            setReady(true);
          } else {
            window.location.replace(redirectTo);
          }
        })
        .catch(() => window.location.replace(redirectTo));
    }, []);

    if (!ready) return <Gate />;
    return <Component {...props} />;
  };

  Protected.displayName = `withAuth(${Component.displayName ?? Component.name ?? 'Component'})`;
  return Protected;
}
