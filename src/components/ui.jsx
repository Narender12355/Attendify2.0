import React, { useState, useEffect, useMemo, useRef, createContext, useContext } from 'react';
import { tone, uid } from '../lib/utils.js';
export const ToastCtx = createContext(() => {});

export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  const push = (msg, tn = 'good') => {
    const id = uid();
    setList(l => [...l, { id, msg, tn }]);
    setTimeout(() => setList(l => l.filter(x => x.id !== id)), 3200);
  };
  return <ToastCtx.Provider value={push}>
    {children}
    <div className="fixed left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4" style={{ top: 'calc(env(safe-area-inset-top,0px) + 12px)' }}>
      {list.map(t => <div key={t.id} className={`card pointer-events-auto px-4 py-3 text-sm font-semibold flex items-center gap-2 max-w-sm w-full`} style={{ animation: 'slideIn .3s both', background: 'var(--card-solid)' }}>
        <span className={`tint-${t.tn} rounded-full p-1`}><Icon name={t.tn === 'bad' ? 'alert' : 'check'} size={14} /></span>{t.msg}
      </div>)}
    </div>
  </ToastCtx.Provider>;
}

export const ICONS = {
  dash: ['M3 3h7v9H3z', 'M14 3h7v5h-7z', 'M14 12h7v9h-7z', 'M3 16h7v5H3z'],
  check: ['M20 6 9 17l-5-5'],
  book: ['M4 19.5A2.5 2.5 0 0 1 6.5 17H20', 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'],
  bell: ['M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9', 'M10.3 21a1.94 1.94 0 0 0 3.4 0'],
  logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'M16 17l5-5-5-5', 'M21 12H9'],
  users: ['M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M23 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
  cal: ['M8 2v4', 'M16 2v4', 'M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  trash: ['M3 6h18', 'M8 6V4h8v2', 'M19 6l-1 14H6L5 6'],
  download: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'],
  sun: ['M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z', 'M12 1v2', 'M12 21v2', 'M4.22 4.22l1.42 1.42', 'M18.36 18.36l1.42 1.42', 'M1 12h2', 'M21 12h2', 'M4.22 19.78l1.42-1.42', 'M18.36 5.64l1.42-1.42'],
  moon: ['M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'],
  alert: ['M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', 'M12 9v4', 'M12 17h.01'],
  chevron: ['M6 9l6 6 6-6'],
  clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 6v6l4 2'],
  cap: ['M22 10 12 5 2 10l10 5 10-5z', 'M6 12v5c3 2 9 2 12 0v-5'],
  flag: ['M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z', 'M4 22v-7'],
  clipboard: ['M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2', 'M9 2h6v4H9z', 'M9 14l2 2 4-4'],
  gear: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M12 2v3', 'M12 19v3', 'M2 12h3', 'M19 12h3', 'M4.9 4.9l2.1 2.1', 'M17 17l2.1 2.1', 'M4.9 19.1 7 17', 'M17 7l2.1-2.1'],
  sparkle: ['M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z'],
  key: ['M21 2l-2 2', 'M11.39 11.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78z', 'M11.39 11.61 15.5 7.5', 'M15.5 7.5l3 3L22 7l-3-3'],
  wifi: ['M5 12.55a11 11 0 0 1 14.08 0', 'M1.42 9a16 16 0 0 1 21.16 0', 'M8.53 16.11a6 6 0 0 1 6.95 0', 'M12 20h.01']
};

export function Icon({ name, size = 20, className = '', stroke = 2 }) {
  const paths = ICONS[name] || [];
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{paths.map((d, i) => <path key={i} d={d} />)}</svg>;
}

export function Logo({ size = 36 }) {
  return <img src={`${import.meta.env.BASE_URL}college-logo.webp`} alt="The Technological Institute of Textile & Sciences logo" className="flex-none object-contain" style={{ width: size, height: size }} />;
}

export const Card = ({ children, className = '', style, delay = 0 }) => <div className={`card fade-up ${className}`} style={{ animationDelay: delay + 'ms', ...style }}>{children}</div>;

export function Btn({ children, variant = 'primary', className = '', busy, ...rest }) {
  return <button className={`btn btn-${variant} ${className}`} disabled={busy || rest.disabled} {...rest}>{busy ? <Spinner size={16} /> : null}{children}</button>;
}

export function Spinner({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity=".25" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>;
}

export const Label = ({ children }) => <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">{children}</label>;

export function Select({ value, onChange, children, className = '' }) {
  return <select className={`field ${className}`} value={value} onChange={e => onChange(e.target.value)}>{children}</select>;
}

export const Chip = ({ tn = 'muted', children, className = '' }) => <span className={`chip tint-${tn} ${className}`}>{children}</span>;

export function Empty({ icon = 'sparkle', title, text, action }) {
  return <div className="text-center py-10 px-4">
    <div className="mx-auto mb-3 grid place-items-center w-14 h-14 rounded-2xl tint-accent"><Icon name={icon} size={26} /></div>
    <div className="font-bold">{title}</div>
    {text && <div className="text-sm text-muted mt-1 max-w-sm mx-auto">{text}</div>}
    {action && <div className="mt-4">{action}</div>}
  </div>;
}

export function SectionTitle({ children, right }) {
  return <div className="flex items-center justify-between mb-3"><h2 className="text-base font-extrabold tracking-tight">{children}</h2>{right}</div>;
}

export function Ring({ value, size = 150, stroke = 12, children }) {
  const tn = tone(value);
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const v = value == null ? 0 : Math.max(0, Math.min(100, value));
  const [shown, setShown] = useState(0);
  useEffect(() => { const t = setTimeout(() => setShown(v), 80); return () => clearTimeout(t); }, [v]);
  return <div className="relative flex-none" style={{ width: size, height: size }}>
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`var(--${tn})`} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (c * shown) / 100} style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1)', filter: `drop-shadow(0 0 8px var(--${tn}))` }} />
    </svg>
    <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
  </div>;
}

export function Bar({ value, marker = true }) {
  const tn = tone(value);
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW(value == null ? 0 : Math.min(100, value)), 80); return () => clearTimeout(t); }, [value]);
  return <div className="bar"><i style={{ width: w + '%', background: `var(--${tn})` }} />{marker && <span style={{ position: 'absolute', left: '75%', top: 0, bottom: 0, width: 2, background: 'var(--text)', opacity: .35 }} />}</div>;
}

export function Stepper({ value, onChange, min = 0, max = 15 }) {
  return <div className="inline-flex items-center gap-1 p-1 rounded-xl border border-line bg-field">
    <button className="btn btn-ghost !p-2" onClick={() => onChange(Math.max(min, value - 1))} aria-label="decrease"><Icon name="minus" size={16} /></button>
    <span className="w-9 text-center font-extrabold tabular-nums">{value}</span>
    <button className="btn btn-ghost !p-2" onClick={() => onChange(Math.min(max, value + 1))} aria-label="increase"><Icon name="plus" size={16} /></button>
  </div>;
}

export function Skeletons() {
  return <div className="space-y-4"><div className="skeleton h-44" /><div className="grid sm:grid-cols-2 gap-4"><div className="skeleton h-40" /><div className="skeleton h-40" /></div></div>;
}

export function Splash({ text = 'Loading Attendify' }) {
  return <div className="min-h-screen grid place-items-center"><div className="text-center"><div style={{ animation: 'pulse2 1.6s infinite' }} className="inline-block"><Logo size={56} /></div><div className="mt-4 text-sm font-semibold text-muted">{text}</div></div></div>;
}

export class Boundary extends React.Component {
  constructor(p) { super(p); this.state = { e: null }; }
  static getDerivedStateFromError(e) { return { e }; }
  render() {
    if (this.state.e) return <div className="card p-6 m-4 text-center"><div className="font-bold mb-1">Something went wrong</div><div className="text-sm text-muted mb-4">{String(this.state.e.message || this.state.e)}</div><Btn onClick={() => this.setState({ e: null })}>Try again</Btn></div>;
    return this.props.children;
  }
}
