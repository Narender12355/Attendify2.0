import React, { useState, useEffect, useMemo, useRef, createContext, useContext } from 'react';
import { Boundary, Chip, Icon, Logo } from './ui.jsx';
import { useData } from '../store/data.jsx';
import { initials } from '../lib/utils.js';
export function Shell({ me, nav, page, setPage, onLogout, badges = {}, children, toggleTheme, theme }) {
  const d = useData();
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return <div className="ios-dashboard min-h-screen md:flex">
    <aside className="ios-sidebar hidden md:flex flex-col w-64 flex-none p-5 sticky top-0 h-screen border-r border-line">
      <div className="flex items-center gap-3 mb-8 px-1"><Logo /><span className="text-xl font-extrabold tracking-tight">Attendify</span></div>
      <nav className="space-y-1.5 flex-1">{nav.map(n => <button key={n.id} onClick={() => setPage(n.id)} className={`nav-btn ${page === n.id ? 'on' : ''}`}><Icon name={n.icon} size={19} />{n.label}{badges[n.id] ? <span className="ml-auto chip tint-bad">{badges[n.id]}</span> : null}</button>)}</nav>
      <div className="card p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl grid place-items-center font-extrabold tint-accent flex-none">{initials(me.name)}</div>
        <div className="min-w-0"><div className="text-sm font-bold truncate">{me.name}</div><div className="text-xs text-muted capitalize">{me.role === 'student' ? 'Semester ' + me.semester : me.role === 'management' ? 'Management' : 'Teacher'}</div></div>
      </div>
    </aside>
    <div className="flex-1 min-w-0">
      <header className="ios-topbar sticky z-30 flex items-center justify-between gap-3 px-4 md:px-8 py-3 border-b border-line" style={{ top: 'env(safe-area-inset-top,0px)' }}>
        <div className="flex items-center gap-2.5 md:hidden"><Logo size={32} /><span className="font-extrabold tracking-tight">Attendify</span></div>
        <div className="hidden md:block text-sm text-muted font-semibold">{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        <div className="flex items-center gap-2">
          <Chip tn={online ? 'good' : 'warn'}><Icon name="wifi" size={12} />{online ? 'Live sync' : 'Offline'}</Chip>
          <button onClick={toggleTheme} className="btn btn-ghost !p-2.5" aria-label="Toggle theme"><Icon name={theme === 'light' ? 'moon' : 'sun'} size={18} /></button>
          <button onClick={onLogout} className="btn btn-ghost !p-2.5" aria-label="Log out"><Icon name="logout" size={18} /></button>
        </div>
      </header>
      <main key={page} className="fade-up max-w-5xl mx-auto px-4 md:px-8 py-5 md:py-8 pb-28 md:pb-10">
        {d.error && <div className="tint-warn rounded-xl px-4 py-3 mb-4 text-sm font-semibold flex items-center gap-2"><Icon name="alert" size={16} />Live sync interrupted. Showing the last data received.</div>}
        <Boundary>{children}</Boundary>
      </main>
    </div>
    <nav aria-label="Main navigation" className="ios-tabbar md:hidden fixed bottom-0 left-0 right-0 z-40 grid px-2 pt-2" style={{ gridTemplateColumns: `repeat(${nav.length},minmax(0,1fr))`, paddingBottom: 'calc(env(safe-area-inset-bottom,0px) + 8px)' }}>
      {nav.map(n => <button key={n.id} onClick={() => setPage(n.id)} aria-current={page === n.id ? 'page' : undefined} className={`ios-tab relative flex min-w-0 flex-col items-center gap-1 py-1.5 rounded-xl text-[11px] font-bold transition ${page === n.id ? 'is-active' : ''}`}>
        <span className="ios-tab-icon"><Icon name={n.icon} size={20} /></span><span className="ios-tab-label">{n.label}</span>
        {badges[n.id] ? <span className="absolute top-0 right-[22%] min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full text-[10px] text-white" style={{ background: 'var(--bad)' }}>{badges[n.id]}</span> : null}
      </button>)}
    </nav>
  </div>;
}
