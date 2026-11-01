import React, { useState, useEffect, useMemo, useRef, createContext, useContext } from 'react';
import { jsPDF } from 'jspdf';
import { Shell } from '../components/shell.jsx';
import { Bar, Btn, Card, Chip, Empty, Icon, Label, Ring, SectionTitle, Select, Stepper, useToast } from '../components/ui.jsx';
import { useData } from '../store/data.jsx';
import { savePdf } from '../lib/files.js';
import { buildAlerts, cid, computeStats, dayKey, daysUntil, fmtDate, fmtPct, insight, parseISO, predict, stuBranch, subjectsFor, todayISO, tone } from '../lib/utils.js';
import { AccountPage } from './account.jsx';
export function SubjectCard({ r, idx, onOpen }) {
  const tn = tone(r.p), ins = insight(r.attended, r.total);
  return <Card className="p-4 sm:p-5" delay={idx * 60}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><div className="font-extrabold truncate">{r.subject.name}</div><div className="text-xs text-muted font-semibold mt-0.5">{r.subject.code}{r.subject.teacher ? ' - ' + r.subject.teacher : ''}</div></div>
      <Chip tn={tn} className="!text-sm !px-3 !py-1">{fmtPct(r.p)}</Chip>
    </div>
    <div className="mt-4"><Bar value={r.p} /></div>
    <div className="flex justify-between text-xs text-muted font-semibold mt-2"><span>{r.attended} of {r.total} classes attended</span><span>Min 75%</span></div>
    <div className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold tint-${ins.tn}`}>{ins.text}</div>
    {onOpen && <button onClick={onOpen} className="mt-3 text-xs font-bold text-accent">View history</button>}
  </Card>;
}

export function Predictor({ st }) {
  const rows = st.rows.filter(r => r.total > 0);
  const [code, setCode] = useState('');
  const [x, setX] = useState(2);
  const r = rows.find(r => r.subject.code === code) || rows[0];
  if (!r) return null;
  const now = r.p, next = predict(r.attended, r.total, x);
  return <Card className="p-5" delay={120}>
    <div className="flex items-center gap-2 mb-1"><span className="tint-accent rounded-lg p-1.5"><Icon name="sparkle" size={16} /></span><h2 className="font-extrabold">Miss-class predictor</h2></div>
    <p className="text-xs text-muted mb-4">See what happens to your attendance if you skip classes.</p>
    <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
      <div><Label>Subject</Label><Select value={r.subject.code} onChange={setCode}>{rows.map(q => <option key={q.subject.code} value={q.subject.code}>{q.subject.name}</option>)}</Select></div>
      <div><Label>Classes missed</Label><Stepper value={x} onChange={setX} /></div>
    </div>
    <div className="mt-4 flex items-center justify-center gap-4 rounded-2xl border border-line p-4" style={{ background: 'var(--field)' }}>
      <div className="text-center"><div className="text-xs text-muted font-bold">NOW</div><div className={`text-2xl font-extrabold text-${tone(now)}`}>{fmtPct(now)}</div></div>
      <div className="text-muted">to</div>
      <div className="text-center"><div className="text-xs text-muted font-bold">AFTER</div><div className={`text-3xl font-extrabold text-${tone(next)}`}>{fmtPct(next)}</div></div>
    </div>
    <p className="text-sm text-center mt-3 font-semibold">If you miss {x} more {x === 1 ? 'class' : 'classes'} in {r.subject.name}, your attendance will fall to <span className={`text-${tone(next)}`}>{fmtPct(next)}</span>.</p>
  </Card>;
}

export function TodayClasses({ me }) {
  const d = useData();
  const key = dayKey(new Date());
  const tt = d.timetable[`${me.semester}_${stuBranch(me)}`] || d.timetable[String(me.semester)] || {};
  const slots = (tt.days || {})[key] || [];
  return <Card className="p-5" delay={180}>
    <SectionTitle right={<Chip tn="accent">{key}</Chip>}>Today's classes</SectionTitle>
    {slots.length === 0 ? <Empty icon="cal" title="No classes scheduled" text="Enjoy your free day, or check back after your teacher updates the timetable." /> : <div className="space-y-2.5">
      {slots.map((s, i) => {
        const sub = d.subjects.find(x => x.code === s.subject);
        const rec = d.attendance.find(a => a.subject === s.subject && a.date === todayISO() && a.studentId === me.id);
        const status = rec && rec.status;
        return <div key={i} className="flex items-center gap-3 rounded-xl border border-line p-3" style={{ background: 'var(--field)' }}>
          <div className="text-xs font-bold text-muted w-[84px] flex-none leading-tight">{s.time}</div>
          <div className="min-w-0 flex-1"><div className="font-bold text-sm truncate">{sub ? sub.name : s.subject}</div><div className="text-xs text-muted">{s.room || 'Room TBA'}</div></div>
          {status ? <Chip tn={status === 'P' ? 'good' : 'bad'}>{status === 'P' ? 'Present' : 'Absent'}</Chip> : <Chip tn="muted">Upcoming</Chip>}
        </div>;
      })}
    </div>}
  </Card>;
}

export function EventsList({ events, title = 'Upcoming sessionals and exams', limit, delay = 240 }) {
  const list = limit ? events.slice(0, limit) : events;
  const toneOf = t => (t === 'Exam' ? 'bad' : t === 'Sessional' ? 'warn' : t === 'Assignment' ? 'accent' : 'good');
  return <Card className="p-5" delay={delay}>
    <SectionTitle>{title}</SectionTitle>
    {list.length === 0 ? <Empty icon="flag" title="Nothing upcoming" text="New sessionals and exams posted by teachers will show up here." /> : <div className="space-y-2.5">
      {list.map(e => {
        const n = daysUntil(e.date);
        return <div key={e.id} className="flex items-center gap-3 rounded-xl border border-line p-3" style={{ background: 'var(--field)' }}>
          <div className={`w-12 h-12 rounded-xl flex-none flex flex-col items-center justify-center tint-${toneOf(e.type)}`}><div className="text-[10px] font-bold uppercase leading-none">{fmtDate(e.date, { month: 'short' })}</div><div className="text-lg font-extrabold leading-none mt-0.5">{parseISO(e.date).getDate()}</div></div>
          <div className="min-w-0 flex-1"><div className="font-bold text-sm truncate">{e.title}</div><div className="text-xs text-muted truncate">{e.type}{e.subject ? ' - ' + e.subject : ''}{e.note ? ' - ' + e.note : ''}</div></div>
          <Chip tn={n <= 3 ? 'bad' : n <= 7 ? 'warn' : 'muted'}>{n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n + ' days'}</Chip>
        </div>;
      })}
    </div>}
  </Card>;
}

export function StudentHome({ me, st, alerts, upcoming, go }) {
  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const tn = tone(st.p), ins = insight(st.attended, st.total);
  const low = st.rows.filter(r => r.total && r.p < 75);
  if (st.rows.length === 0) return <Card className="p-4"><Empty icon="book" title="No subjects for your semester yet" text={`Your teachers haven't added Semester ${me.semester} subjects yet. Once they do, everything shows up here instantly.`} /></Card>;
  return <div className="space-y-5">
    <div><div className="text-muted text-sm font-semibold">{greet}</div><h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">{me.name.split(' ')[0]} <span className="text-muted font-bold text-lg">- Semester {me.semester}</span></h1></div>
    <Card className="p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-6" style={{ background: `linear-gradient(135deg, var(--${tn === 'muted' ? 'accent' : tn}-soft, var(--card)), var(--card) 60%)` }}>
      <Ring value={st.p} size={150}><div><div className={`text-3xl font-extrabold text-${tn}`}>{fmtPct(st.p)}</div><div className="text-[11px] text-muted font-bold tracking-wider">OVERALL</div></div></Ring>
      <div className="flex-1 text-center sm:text-left">
        <div className="flex flex-wrap gap-2 justify-center sm:justify-start mb-2"><Chip tn={tn}>{tn === 'good' ? 'On track' : tn === 'warn' ? 'Needs attention' : tn === 'bad' ? 'At risk' : 'No data'}</Chip><Chip tn="muted">{st.attended} / {st.total} classes</Chip></div>
        <div className="text-lg font-extrabold">{st.total ? ins.text : 'Attendance will appear after your first marked class'}</div>
        <div className="text-sm text-muted mt-1">{low.length ? `${low.length} ${low.length === 1 ? 'subject is' : 'subjects are'} below the 75% requirement.` : st.total ? 'All subjects are above the 75% requirement.' : ''}</div>
        <div className="mt-4 flex flex-wrap gap-2 justify-center sm:justify-start"><Btn onClick={() => go('attendance')}>View history</Btn><Btn variant="ghost" onClick={() => go('alerts')}><Icon name="bell" size={16} />{alerts.length} alerts</Btn></div>
      </div>
    </Card>
    {low.length > 0 && <div className="tint-bad rounded-2xl px-4 py-3.5 flex gap-3 items-start fade-up"><Icon name="alert" size={20} className="flex-none mt-0.5" /><div className="text-sm"><b>Low attendance warning.</b> {low.map(r => r.subject.name).join(', ')} {low.length > 1 ? 'are' : 'is'} below 75%. You may be barred from the exam if this continues.</div></div>}
    <div><SectionTitle>Subject-wise attendance</SectionTitle><div className="grid sm:grid-cols-2 gap-4">{st.rows.map((r, i) => <SubjectCard key={r.subject.code} r={r} idx={i} onOpen={() => go('attendance', r.subject.code)} />)}</div></div>
    <div className="grid md:grid-cols-2 gap-4"><Predictor st={st} /><TodayClasses me={me} /></div>
    <EventsList events={upcoming} limit={4} />
  </div>;
}

export async function exportPdf(me, st) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const col = { good: [5, 150, 105], warn: [180, 83, 9], bad: [220, 38, 38], muted: [100, 116, 139] };
  doc.setFillColor(91, 75, 255); doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.text('Attendify', 14, 14);
  doc.setFontSize(10); doc.text('Attendance Report', 14, 22);
  doc.setTextColor(30, 41, 59); doc.setFontSize(11);
  let y = 42;
  [`Name: ${me.name}`, `College ID: ${cid(me).toUpperCase()}`, `Semester: ${me.semester}`, `Generated: ${new Date().toLocaleString()}`].forEach(t => { doc.text(t, 14, y); y += 6; });
  y += 4;
  const tn = tone(st.p);
  doc.setFontSize(13); doc.text('Overall attendance', 14, y); doc.setTextColor(...col[tn]); doc.setFontSize(20); doc.text(fmtPct(st.p), 196, y, { align: 'right' });
  doc.setTextColor(100, 116, 139); doc.setFontSize(10); doc.text(`${st.attended} of ${st.total} classes attended. Minimum required: 75%.`, 14, y + 6);
  y += 16;
  doc.setFillColor(241, 244, 249); doc.rect(14, y - 5, 182, 9, 'F');
  doc.setTextColor(30, 41, 59); doc.setFontSize(10); doc.setFont(undefined, 'bold');
  doc.text('Code', 17, y + 1); doc.text('Subject', 38, y + 1); doc.text('Attended', 120, y + 1); doc.text('Total', 146, y + 1); doc.text('%', 192, y + 1, { align: 'right' });
  doc.setFont(undefined, 'normal'); y += 10;
  st.rows.forEach(r => {
    if (y > 270) { doc.addPage(); y = 20; }
    doc.setTextColor(30, 41, 59); doc.text(r.subject.code, 17, y); doc.text(r.subject.name.slice(0, 38), 38, y);
    doc.text(String(r.attended), 124, y); doc.text(String(r.total), 148, y);
    doc.setTextColor(...col[tone(r.p)]); doc.setFont(undefined, 'bold'); doc.text(fmtPct(r.p), 192, y, { align: 'right' }); doc.setFont(undefined, 'normal');
    doc.setDrawColor(226, 232, 240); doc.line(14, y + 3, 196, y + 3); y += 9;
  });
  y += 4;
  if (y > 260) { doc.addPage(); y = 20; }
  doc.setTextColor(30, 41, 59); doc.setFontSize(12); doc.setFont(undefined, 'bold'); doc.text('Absence log', 14, y); doc.setFont(undefined, 'normal'); doc.setFontSize(9.5); y += 7;
  st.rows.forEach(r => {
    const ab = r.hist.filter(h => h.status === 'A').map(h => fmtDate(h.date, { day: 'numeric', month: 'short' }));
    const lines = doc.splitTextToSize(`${r.subject.name}: ${ab.length ? ab.join(', ') : 'No absences'}`, 180);
    if (y + lines.length * 5 > 280) { doc.addPage(); y = 20; }
    doc.setTextColor(71, 85, 105); doc.text(lines, 14, y); y += lines.length * 5 + 2;
  });
  const filename = `Attendify_${me.name.replace(/\s+/g, '_')}_${todayISO()}.pdf`;
  await savePdf(doc, filename);
}

export function StudentAttendance({ me, st, initial }) {
  const toast = useToast();
  const [code, setCode] = useState(initial || (st.rows[0] && st.rows[0].subject.code));
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (initial) setCode(initial); }, [initial]);
  const r = st.rows.find(x => x.subject.code === code) || st.rows[0];
  if (!r) return <Card className="p-4"><Empty icon="book" title="No subjects yet" text="Your attendance history will appear once teachers add subjects." /></Card>;
  async function doExport() {
    setBusy(true);
    try { await exportPdf(me, st); toast('Report ready'); } catch (e) { toast(e.message || 'Could not create PDF', 'bad'); } finally { setBusy(false); }
  }
  const byMonth = {};
  r.hist.forEach(h => { const k = parseISO(h.date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }); (byMonth[k] = byMonth[k] || []).push(h); });
  return <div className="space-y-5">
    <div className="flex items-center justify-between gap-3"><h1 className="text-2xl font-extrabold tracking-tight">Attendance history</h1><Btn onClick={doExport} busy={busy}><Icon name="download" size={16} />PDF report</Btn></div>
    <div className="scroll-x flex gap-2 pb-1">{st.rows.map(x => <button key={x.subject.code} onClick={() => setCode(x.subject.code)} className={`flex-none px-4 py-2 rounded-xl border text-sm font-bold transition ${x.subject.code === r.subject.code ? 'border-accent tint-accent' : 'border-line bg-field text-muted'}`}>{x.subject.name} <span className={`ml-1 text-${tone(x.p)}`}>{fmtPct(x.p)}</span></button>)}</div>
    <SubjectCard r={r} idx={0} />
    <Card className="p-5" delay={100}>
      <SectionTitle right={<span className="flex gap-3 text-xs font-bold"><span className="text-good">Present {r.attended}</span><span className="text-bad">Absent {r.total - r.attended}</span></span>}>Class by class</SectionTitle>
      {r.hist.length === 0 ? <Empty icon="clipboard" title="No classes recorded" text="When your teacher marks attendance for this subject it will appear here." /> : <>
        <div className="flex flex-wrap gap-1.5 mb-5">{r.hist.slice(0, 40).reverse().map((h, i) => <span key={i} title={h.date} className={`w-5 h-5 rounded-md ${h.status === 'P' ? 'tint-good' : 'tint-bad'}`} style={{ opacity: .9 }} />)}</div>
        {Object.entries(byMonth).map(([m, list]) => <div key={m} className="mb-4 last:mb-0"><div className="text-xs font-bold uppercase tracking-wider text-muted mb-2">{m}</div><div className="space-y-1.5">{list.map(h => <div key={h.date} className="flex items-center justify-between rounded-xl px-3.5 py-2.5 border border-line" style={{ background: 'var(--field)' }}><span className="text-sm font-semibold">{fmtDate(h.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span><Chip tn={h.status === 'P' ? 'good' : 'bad'}>{h.status === 'P' ? 'Present' : 'Absent'}</Chip></div>)}</div></div>)}</>}
    </Card>
  </div>;
}

export function SyllabusView({ subjects, studentId, editable }) {
  const d = useData();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [open, setOpen] = useState({});
  const sub = subjects.find(s => s.code === code) || subjects[0];
  if (!sub) return <Card className="p-4"><Empty icon="book" title="No subjects yet" text="Syllabus appears once subjects are added for your semester." /></Card>;
  const units = (d.syllabus[sub.code] || {}).units || [];
  const done = (d.progress[studentId] || {}).done || {};
  const all = units.flatMap(u => u.topics);
  const cnt = all.filter(t => done[t.id]).length;
  const pctDone = all.length ? (cnt / all.length) * 100 : 0;
  async function toggle(tid) {
    const next = { ...done }; if (next[tid]) delete next[tid]; else next[tid] = true;
    try { await d.api.set('progress/' + studentId, { done: next }); } catch (e) { toast('Could not save progress', 'bad'); }
  }
  // overall across subjects
  const overall = subjects.map(s => { const t = ((d.syllabus[s.code] || {}).units || []).flatMap(u => u.topics); return { s, total: t.length, done: t.filter(x => done[x.id]).length }; });
  const oT = overall.reduce((n, o) => n + o.total, 0), oD = overall.reduce((n, o) => n + o.done, 0);
  return <div className="space-y-5">
    <h1 className="text-2xl font-extrabold tracking-tight">Syllabus tracker</h1>
    <div className="scroll-x flex gap-2 pb-1">{subjects.map(s => <button key={s.code} onClick={() => setCode(s.code)} className={`flex-none px-4 py-2 rounded-xl border text-sm font-bold transition ${s.code === sub.code ? 'border-accent tint-accent' : 'border-line bg-field text-muted'}`}>{s.name}</button>)}</div>
    <Card className="p-5 flex items-center gap-5">
      <Ring value={pctDone} size={92} stroke={9}><div className="text-lg font-extrabold">{Math.round(pctDone)}%</div></Ring>
      <div className="min-w-0"><div className="font-extrabold truncate">{sub.name}</div><div className="text-sm text-muted">{cnt} of {all.length} topics completed</div><div className="text-xs text-muted mt-1">All subjects: {oD} / {oT} topics ({oT ? Math.round((oD / oT) * 100) : 0}%)</div></div>
    </Card>
    {units.length === 0 ? <Card className="p-4"><Empty icon="book" title="Syllabus not published yet" text="Your teacher hasn't added topics for this subject yet." /></Card> : units.map((u, i) => {
      const ud = u.topics.filter(t => done[t.id]).length;
      const isOpen = open[u.id] !== false;
      return <Card key={u.id} className="overflow-hidden" delay={i * 50}>
        <button onClick={() => setOpen(o => ({ ...o, [u.id]: !isOpen }))} className="w-full flex items-center gap-3 p-4 text-left">
          <div className="w-9 h-9 rounded-xl tint-accent grid place-items-center font-extrabold text-sm flex-none">{i + 1}</div>
          <div className="min-w-0 flex-1"><div className="font-bold truncate">{u.title}</div><div className="text-xs text-muted">{ud}/{u.topics.length} topics</div></div>
          <Icon name="chevron" size={18} className={`text-muted transition ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && <div className="px-4 pb-4 space-y-1.5">{u.topics.map(t => <label key={t.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 border border-line cursor-pointer" style={{ background: 'var(--field)' }}>
          <input type="checkbox" className="tick" checked={!!done[t.id]} onChange={() => toggle(t.id)} />
          <span className={`text-sm font-semibold ${done[t.id] ? 'line-through text-muted' : ''}`}>{t.title}</span>
        </label>)}</div>}
      </Card>;
    })}
  </div>;
}

export function AlertsPage({ alerts }) {
  return <div className="space-y-4">
    <h1 className="text-2xl font-extrabold tracking-tight">Notifications</h1>
    {alerts.length === 0 ? <Card className="p-4"><Empty icon="check" title="You're all caught up" text="Low-attendance warnings, predictions and exam reminders will show here." /></Card> :
      alerts.map((a, i) => <Card key={a.id} className="p-4 flex gap-3.5 items-start" delay={i * 50}>
        <span className={`tint-${a.tn} rounded-xl p-2.5 flex-none`}><Icon name={a.icon} size={20} /></span>
        <div><div className="font-bold">{a.title}</div><div className="text-sm text-muted mt-0.5 leading-relaxed">{a.text}</div></div>
      </Card>)}
  </div>;
}

export function StudentApp({ me, onLogout, toggleTheme, theme }) {
  const d = useData();
  const [page, setPageRaw] = useState('home');
  const [focus, setFocus] = useState(null);
  const setPage = (p, f) => { setPageRaw(p); setFocus(f || null); window.scrollTo({ top: 0 }); };
  const subjects = useMemo(() => subjectsFor(d.subjects, me.semester, stuBranch(me)), [d.subjects, me.semester, me.branch]);
  const st = useMemo(() => computeStats(me.id, subjects, d.attendance), [me.id, subjects, d.attendance]);
  const upcoming = useMemo(() => d.events.filter(e => (e.branch == null || e.branch === stuBranch(me)) && daysUntil(e.date) >= 0 && (e.semester === 'all' || String(e.semester) === String(me.semester))), [d.events, me.semester, me.branch]);
  const alerts = useMemo(() => buildAlerts(st, upcoming), [st, upcoming]);
  const nav = [{ id: 'home', label: 'Home', icon: 'dash' }, { id: 'attendance', label: 'Attendance', icon: 'check' }, { id: 'syllabus', label: 'Syllabus', icon: 'book' }, { id: 'alerts', label: 'Alerts', icon: 'bell' }, { id: 'account', label: 'Account', icon: 'cap' }];
  return <Shell me={me} nav={nav} page={page} setPage={setPage} onLogout={onLogout} badges={{ alerts: alerts.length || 0 }} toggleTheme={toggleTheme} theme={theme}>
    {page === 'home' && <StudentHome me={me} st={st} alerts={alerts} upcoming={upcoming} go={setPage} />}
    {page === 'attendance' && <StudentAttendance me={me} st={st} initial={focus} />}
    {page === 'syllabus' && <SyllabusView subjects={subjects} studentId={me.id} />}
    {page === 'alerts' && <AlertsPage alerts={alerts} />}
    {page === 'account' && <AccountPage me={me} />}
  </Shell>;
}
