import React, { useState } from 'react';
import { changePassword, friendlyAuthError } from '../lib/accounts.js';
import { Btn, Card, Label, SectionTitle, useToast } from '../components/ui.jsx';
import { useAuth } from '../store/auth.jsx';
import { cid, initials, stuBranch } from '../lib/utils.js';

export function AccountPage() {
  const { profile: me } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ cur: '', next: '', again: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function save(e) {
    e.preventDefault(); setErr('');
    if (f.next.length < 6) return setErr('New password must be at least 6 characters.');
    if (f.next !== f.again) return setErr('New passwords do not match.');
    setBusy(true);
    try {
      await changePassword(f.cur, f.next);
      toast('Password updated');
      setF({ cur: '', next: '', again: '' });
    } catch (ex) { setErr(friendlyAuthError(ex, 'password')); } finally { setBusy(false); }
  }
  return <div className="space-y-5">
    <h1 className="text-2xl font-extrabold tracking-tight">Account</h1>
    <Card className="p-5 flex items-center gap-4">
      <div className="w-14 h-14 rounded-2xl grid place-items-center font-extrabold text-lg tint-accent flex-none">{initials(me.name)}</div>
      <div className="min-w-0">
        <div className="font-extrabold truncate">{me.name}</div>
        <div className="text-sm text-muted truncate">{me.role === 'student' ? 'College ID' : 'Email'}: <b className="text-ink">{me.role === 'student' ? cid(me).toUpperCase() : me.email}</b></div>
        {me.role === 'student' && <div className="text-sm text-muted">Semester {me.semester} - {stuBranch(me)}{me.section ? ' - Section ' + me.section : ''}</div>}
      </div>
    </Card>
    <Card className="p-5" delay={80}>
      <SectionTitle>Change password</SectionTitle>
      <form onSubmit={save} className="space-y-3" noValidate>
        <div><Label>Current password</Label><input type="password" className="field" value={f.cur} onChange={e => setF({ ...f, cur: e.target.value })} autoComplete="current-password" /></div>
        <div><Label>New password</Label><input type="password" className="field" value={f.next} onChange={e => setF({ ...f, next: e.target.value })} autoComplete="new-password" /></div>
        <div><Label>Repeat new password</Label><input type="password" className="field" value={f.again} onChange={e => setF({ ...f, again: e.target.value })} autoComplete="new-password" /></div>
        {err && <div className="tint-bad rounded-xl px-3.5 py-2.5 text-sm font-semibold">{err}</div>}
        <Btn type="submit" busy={busy} className="w-full">Update password</Btn>
      </form>
    </Card>
  </div>;
}
