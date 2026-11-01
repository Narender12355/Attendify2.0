import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, idToEmail } from '../lib/firebase.js';
import { createManagementAccount, friendlyAuthError } from '../lib/accounts.js';
import { Btn, Card, Icon, Label, Logo } from '../components/ui.jsx';
import { EMAIL_RE, ID_RE } from '../lib/utils.js';

export function AuthScreen() {
  const [mode, setMode] = useState('login');
  const [role, setRole] = useState('student');
  const [f, setF] = useState({ name: '', email: '', collegeId: '', password: '', code: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }));
  const isStudent = role === 'student';
  const isManagement = role === 'management';
  const pickRole = r => { setRole(r); setErr(''); setMode(r === 'management' ? 'signup' : 'login'); };

  async function submit(e) {
    e.preventDefault(); setErr('');
    const sid = f.collegeId.trim().toLowerCase();
    const email = f.email.trim().toLowerCase();
    if (isStudent) { if (!ID_RE.test(sid)) return setErr('Enter your college ID.'); }
    else if (!EMAIL_RE.test(email)) return setErr('Enter a valid email address.');
    if (!f.password) return setErr('Enter your password.');
    if (mode === 'signup') {
      if (!f.name.trim()) return setErr('Please enter your full name.');
      if (f.password.length < 6) return setErr('Password must be at least 6 characters.');
      if (!isManagement) return setErr('Management creates teacher accounts.');
      if (!/^\d{4}$/.test(f.code)) return setErr('Enter the 4-digit management access code.');
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, isStudent ? idToEmail(sid) : email, f.password);
      } else {
        await createManagementAccount({ name: f.name, email, password: f.password, code: f.code.trim() });
        await signInWithEmailAndPassword(auth, email, f.password);
      }
    } catch (ex) {
      setErr(ex.code === 'permission-denied'
        ? 'Firestore blocked management signup. Publish the latest firestore.rules and confirm config/management has code as a string matching the 4-digit code.'
        : friendlyAuthError(ex));
    } finally { setBusy(false); }
  }

  return <div className="min-h-screen flex items-center justify-center p-4 py-8">
    <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">
      <div className="fade-up hidden md:block pr-6">
        <div className="flex items-center gap-3 mb-8"><Logo size={46} /><span className="text-3xl font-extrabold tracking-tight">Attendify</span></div>
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight">Your attendance,<br /><span style={{ background: 'linear-gradient(90deg,var(--accent),var(--accent2))', WebkitBackgroundClip: 'text', color: 'transparent' }}>always in control.</span></h1>
        <p className="text-muted mt-4 leading-relaxed">Live attendance, smart low-attendance alerts, syllabus tracking and exam reminders, all updated in real time by your teachers.</p>
        <div className="mt-8 grid grid-cols-2 gap-3 text-sm font-semibold">
          {[['dash', 'Subject-wise tracking'], ['bell', 'Smart alerts'], ['sparkle', 'Miss-class predictor'], ['book', 'Syllabus progress']].map(([i, t]) => <div key={t} className="card px-4 py-3 flex items-center gap-2.5"><span className="tint-accent rounded-lg p-1.5"><Icon name={i} size={16} /></span>{t}</div>)}
        </div>
      </div>
      <Card className="p-6 sm:p-8 w-full max-w-md mx-auto md:mx-0 md:ml-auto">
        <div className="flex items-center gap-3 mb-6 md:hidden"><Logo /><span className="text-2xl font-extrabold tracking-tight">Attendify</span></div>
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[['student', 'cap', 'Student'], ['teacher', 'clipboard', 'Teacher'], ['management', 'gear', 'Management']].map(([r, i, t]) => <button key={r} onClick={() => pickRole(r)} className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-bold transition ${role === r ? 'border-accent tint-accent' : 'border-line text-muted bg-field'}`}><Icon name={i} size={16} />{t}</button>)}
        </div>
        {isManagement && <div className="flex p-1 rounded-xl bg-field border border-line mb-5">
          {['login', 'signup'].map(m => <button key={m} onClick={() => { setMode(m); setErr(''); }} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${mode === m ? 'tint-accent' : 'text-muted'}`}>{m === 'login' ? 'Log in' : 'Sign up'}</button>)}
        </div>}
        <form onSubmit={submit} className="space-y-3.5" noValidate>
          {mode === 'signup' && isManagement && <div><Label>Full name</Label><input className="field" placeholder="e.g. Office administrator" value={f.name} onChange={set('name')} autoComplete="name" /></div>}
          {isStudent
            ? <div><Label>College ID</Label><input className="field" placeholder="e.g. CSE24-014" value={f.collegeId} onChange={set('collegeId')} autoComplete="username" autoCapitalize="characters" /></div>
            : <div><Label>Email</Label><input className="field" type="email" inputMode="email" placeholder="you@college.edu" value={f.email} onChange={set('email')} autoComplete="email" autoCapitalize="none" /></div>}
          <div><Label>Password</Label><input className="field" type="password" placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'} value={f.password} onChange={set('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} /></div>
          {mode === 'signup' && isManagement && <div><Label>Management access code</Label><input className="field" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="4-digit code" value={f.code} onChange={set('code')} autoComplete="one-time-code" /></div>}
          {isStudent && <div className="tint-muted rounded-xl px-3.5 py-2.5 text-xs font-semibold">Management creates student accounts. Use the college ID and password provided by your office, then change your password under Account.</div>}
          {role === 'teacher' && <div className="tint-muted rounded-xl px-3.5 py-2.5 text-xs font-semibold">Management creates teacher accounts and assigns branches and study years.</div>}
          {err && <div className="tint-bad rounded-xl px-3.5 py-2.5 text-sm font-semibold flex gap-2 items-start"><Icon name="alert" size={16} className="mt-0.5 flex-none" />{err}</div>}
          <Btn type="submit" busy={busy} className="w-full !py-3.5">{mode === 'login' ? 'Log in' : 'Create account'}</Btn>
        </form>
      </Card>
    </div>
  </div>;
}
