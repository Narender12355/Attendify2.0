import React, { useState } from 'react';
import { configured } from './lib/firebase.js';
import { Boundary, Btn, Card, Icon, Logo, Splash, ToastProvider } from './components/ui.jsx';
import { AuthProvider, useAuth } from './store/auth.jsx';
import { DataProvider, useData } from './store/data.jsx';
import { friendlyAuthError } from './lib/accounts.js';
import { ManagementApp, TeacherApp } from './pages/teacher.jsx';
import { AuthScreen } from './pages/auth.jsx';
import { StudentApp } from './pages/student.jsx';

function SetupNeeded() {
  return <div className="min-h-screen grid place-items-center p-4"><Card className="p-6 max-w-md">
    <div className="flex items-center gap-3 mb-3"><Logo /><div className="font-extrabold text-lg">Firebase is not configured</div></div>
    <p className="text-sm text-muted leading-relaxed">Copy <b className="text-ink">.env.example</b> to <b className="text-ink">.env</b>, paste your Firebase web app keys, then restart the dev server. Full steps are in README.md.</p>
  </Card></div>;
}

function NoAccount() {
  const { logout } = useAuth();
  return <div className="min-h-screen grid place-items-center p-4"><Card className="p-6 max-w-sm text-center">
    <div className="mx-auto mb-3 grid place-items-center w-14 h-14 rounded-2xl tint-warn"><Icon name="alert" size={26} /></div>
    <div className="font-extrabold text-lg">Account not set up</div>
    <p className="text-sm text-muted mt-1">This login has no profile. Ask management to restore or recreate your account.</p>
    <Btn className="mt-4" onClick={logout}>Back to login</Btn>
  </Card></div>;
}

function DataGate({ me, children }) {
  const d = useData();
  if (d.loading && d.error) {
    return <div className="min-h-screen grid place-items-center p-4"><Card className="p-6 max-w-sm text-center">
      <div className="font-extrabold text-lg">Could not load data</div>
      <p className="text-sm text-muted mt-1">{friendlyAuthError(d.error)}</p>
      <Btn className="mt-4" onClick={() => window.location.reload()}>Retry</Btn>
    </Card></div>;
  }
  if (d.loading) return <Splash text="Syncing your data" />;
  return children;
}

function Gate() {
  const { user, profile, missing, loading, logout } = useAuth();
  const [theme, setTheme] = useState(() => {
    try { const t = localStorage.getItem('attendify_theme'); if (t) { document.documentElement.setAttribute('data-theme', t); return t; } } catch (e) { /* ignore */ }
    return document.documentElement.getAttribute('data-theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  });
  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next); setTheme(next);
    try { localStorage.setItem('attendify_theme', next); } catch (e) { /* ignore */ }
  };
  if (loading) return <Splash />;
  if (!user) return <AuthScreen />;
  if (missing || !profile) return <NoAccount />;
  const Dash = profile.role === 'management' ? ManagementApp : profile.role === 'teacher' ? TeacherApp : StudentApp;
  return <DataProvider me={profile} key={profile.id}>
    <DataGate me={profile}><Dash me={profile} onLogout={logout} toggleTheme={toggleTheme} theme={theme} /></DataGate>
  </DataProvider>;
}

export function App() {
  if (!configured) return <SetupNeeded />;
  return <ToastProvider><AuthProvider><Boundary><Gate /></Boundary></AuthProvider></ToastProvider>;
}
