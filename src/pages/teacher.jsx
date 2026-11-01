import React, { useState, useEffect, useMemo, useRef, createContext, useContext } from 'react';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { Shell } from '../components/shell.jsx';
import { Bar, Btn, Card, Chip, Empty, Icon, Label, SectionTitle, Select, useToast } from '../components/ui.jsx';
import { useData } from '../store/data.jsx';
import { createStudentAccount, createTeacherAccount, friendlyAuthError, removeStudent } from '../lib/accounts.js';
import { BRANCHES, DAYS, EVENT_TYPES, EMAIL_RE, ID_RE, SLOT_TIMES, YEARS, cid, computeStats, daysUntil, fmtDate, fmtPct, inGroup, initials, iso, semestersForYears, stuBranch, subjectsFor, teacherBranches, teacherSemesters, todayISO, tone, uid } from '../lib/utils.js';
import { AccountPage } from './account.jsx';
export function TeacherOverview({ go, me }) {
  const d = useData();
  const [q, setQ] = useState('');
  const allStudents = d.accounts.filter(a => a.role === 'student');
  const branches = teacherBranches(me);
  const semesters = teacherSemesters(me);
  const [group, setGroup] = useState({ sem: 'all', branch: branches.length > 1 ? 'all' : branches[0], section: 'all' });
  const [subCode, setSubCode] = useState('all');
  const subOptions = d.subjects.filter(x => (group.sem === 'all' || String(x.semester) === group.sem) && (group.branch === 'all' || !x.branch || x.branch === 'ALL' || x.branch === group.branch));
  const activeSub = subCode === 'all' ? null : (subOptions.find(x => x.code === subCode) || null);
  const students = allStudents.filter(s => inGroup(s, group) && (!activeSub || subjectsFor(d.subjects, s.semester, stuBranch(s)).some(y => y.code === activeSub.code))).sort((a, b) => a.name.localeCompare(b.name));
  const rows = useMemo(() => {
    const byStudent = {};
    d.attendance.forEach(a => { (byStudent[a.studentId] = byStudent[a.studentId] || []).push(a); });
    return students.map(s => {
      const subs = activeSub ? [activeSub] : subjectsFor(d.subjects, s.semester, stuBranch(s));
      return { s, st: computeStats(s.id, subs, byStudent[s.id] || []) };
    });
  }, [students.length, group, activeSub, d.subjects, d.attendance, d.accounts]);
  const weekAgo = iso(new Date(Date.now() - 7 * 864e5));
  const marked = new Set(d.attendance.filter(a => a.date >= weekAgo).map(a => a.subject + a.date)).size;
  const withData = rows.filter(r => r.st.p != null);
  const avg = withData.length ? withData.reduce((n, r) => n + r.st.p, 0) / withData.length : null;
  const atRisk = withData.filter(r => r.st.p < 75).sort((a, b) => a.st.p - b.st.p);
  const stat = (icon, label, val, tn = 'accent') => <Card className="p-4"><span className={`tint-${tn} rounded-xl p-2 inline-block mb-3`}><Icon name={icon} size={18} /></span><div className="text-2xl font-extrabold">{val}</div><div className="text-xs text-muted font-bold">{label}</div></Card>;
  const list = rows.filter(r => r.s.name.toLowerCase().includes(q.toLowerCase()) || cid(r.s).toLowerCase().includes(q.toLowerCase()));
  return <div className="space-y-5">
    <div><div className="text-muted text-sm font-semibold">Teacher dashboard</div><h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Class overview</h1></div>
    <Card className="p-4 space-y-3"><GroupFilter value={group} onChange={setGroup} students={allStudents} branches={branches} semesters={semesters} />
      <div><Label>Subject</Label><Select value={activeSub ? activeSub.code : 'all'} onChange={setSubCode}><option value="all">All subjects (overall)</option>{subOptions.map(x => <option key={x.code} value={x.code}>{x.name}{group.sem === 'all' ? ' (Sem ' + x.semester + ')' : ''}</option>)}</Select></div>
    </Card>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stat('users', 'Students', students.length)}{stat('book', activeSub ? 'Subject' : 'Subjects', activeSub ? 1 : subOptions.length, 'accent')}{stat('clipboard', 'Sessions this week', marked, 'good')}{stat('check', activeSub ? 'Subject average' : 'Average attendance', fmtPct(avg), tone(avg))}
    </div>
    {d.subjects.length === 0 && <Card className="p-4"><Empty icon="sparkle" title="Let's set things up" text="Management adds students and assigns your branch and study years. You can add subjects in Setup." action={<Btn onClick={() => go('setup')}>Open Setup</Btn>} /></Card>}
    {atRisk.length > 0 && <Card className="p-5"><SectionTitle right={<Chip tn="bad">{atRisk.length} below 75%</Chip>}>Students at risk</SectionTitle>
      <div className="space-y-2">{atRisk.slice(0, 6).map(r => <div key={r.s.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 border border-line" style={{ background: 'var(--field)' }}><div className="w-9 h-9 rounded-lg tint-bad grid place-items-center text-xs font-extrabold">{initials(r.s.name)}</div><div className="flex-1 min-w-0"><div className="text-sm font-bold truncate">{r.s.name}</div><div className="text-xs text-muted">Semester {r.s.semester}</div></div><Chip tn={tone(r.st.p)}>{fmtPct(r.st.p)}</Chip></div>)}</div></Card>}
    <Card className="p-5">
      <SectionTitle>All students</SectionTitle>
      <input className="field mb-3" placeholder="Search by name or college ID" value={q} onChange={e => setQ(e.target.value)} />
      {students.length === 0 ? <Empty icon="users" title="No students in these assignments" text="Management adds student accounts and assigns their branch, semester and section." /> : <div className="space-y-2">{list.map(r => <div key={r.s.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 border border-line" style={{ background: 'var(--field)' }}>
        <div className="w-9 h-9 rounded-lg tint-accent grid place-items-center text-xs font-extrabold flex-none">{initials(r.s.name)}</div>
        <div className="flex-1 min-w-0"><div className="text-sm font-bold truncate">{r.s.name}</div><div className="text-xs text-muted truncate">Sem {r.s.semester} - {stuBranch(r.s)}{r.s.section ? ' - Sec ' + r.s.section : ''} - {cid(r.s).toUpperCase()}{activeSub ? ' - ' + r.st.attended + '/' + r.st.total + ' classes' : ''}</div></div>
        <div className="w-24 hidden sm:block"><Bar value={r.st.p} marker={false} /></div>
        <Chip tn={tone(r.st.p)}>{fmtPct(r.st.p)}</Chip>
      </div>)}</div>}
    </Card>
  </div>;
}

export function SyllabusManager({ me }) {
  const d = useData();
  const toast = useToast();
  const [code, setCode] = useState('');
  const [unitTitle, setUnitTitle] = useState('');
  const [topicDraft, setTopicDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const sub = d.subjects.find(s => s.code === code) || d.subjects[0];
  if (!sub) return <Card className="p-4"><Empty icon="book" title="Add subjects first" text="Create subjects in Setup, then build their syllabus here." /></Card>;
  const units = (d.syllabus[sub.code] || {}).units || [];
  const students = d.accounts.filter(a => a.role === 'student' && String(a.semester) === String(sub.semester) && (!sub.branch || sub.branch === 'ALL' || stuBranch(a) === sub.branch));
  const allT = units.flatMap(u => u.topics);
  const classAvg = students.length && allT.length ? students.reduce((n, s) => n + allT.filter(t => ((d.progress[s.id] || {}).done || {})[t.id]).length / allT.length, 0) / students.length * 100 : null;
  async function save(next, msg) {
    setBusy(true);
    try { await d.api.set('syllabus/' + sub.code, { units: next }); if (msg) toast(msg); } catch (e) { toast('Could not save syllabus', 'bad'); } finally { setBusy(false); }
  }
  const addUnit = () => { if (!unitTitle.trim()) return; save([...units, { id: uid(), title: unitTitle.trim(), topics: [] }], 'Unit added'); setUnitTitle(''); };
  const addTopic = u => { const t = (topicDraft[u.id] || '').trim(); if (!t) return; save(units.map(x => x.id === u.id ? { ...x, topics: [...x.topics, { id: uid(), title: t }] } : x), 'Topic added'); setTopicDraft(s => ({ ...s, [u.id]: '' })); };
  return <div className="space-y-5">
    <h1 className="text-2xl font-extrabold tracking-tight">Syllabus manager</h1>
    <Card className="p-5"><Label>Subject</Label><Select value={sub.code} onChange={setCode}>{d.subjects.map(s => <option key={s.code} value={s.code}>{s.name} (Sem {s.semester})</option>)}</Select>
      <div className="mt-4 flex items-center gap-3"><div className="flex-1"><div className="flex justify-between text-xs font-bold text-muted mb-1.5"><span>Class average completion</span><span>{classAvg == null ? '--' : Math.round(classAvg) + '%'}</span></div><div className="bar"><i style={{ width: (classAvg || 0) + '%', background: 'var(--accent)' }} /></div></div></div>
    </Card>
    {units.map((u, i) => <Card key={u.id} className="p-5" delay={i * 40}>
      <div className="flex items-center gap-3 mb-3"><div className="w-8 h-8 rounded-lg tint-accent grid place-items-center text-sm font-extrabold flex-none">{i + 1}</div><div className="font-extrabold flex-1 min-w-0 truncate">{u.title}</div>
        <button className="btn btn-danger !p-2" aria-label="Delete unit" onClick={() => save(units.filter(x => x.id !== u.id), 'Unit removed')}><Icon name="trash" size={16} /></button></div>
      <div className="space-y-1.5 mb-3">{u.topics.map(t => <div key={t.id} className="flex items-center gap-2 rounded-xl px-3 py-2 border border-line" style={{ background: 'var(--field)' }}><span className="text-sm font-semibold flex-1 min-w-0">{t.title}</span><button className="text-muted hover:text-bad" aria-label="Delete topic" onClick={() => save(units.map(x => x.id === u.id ? { ...x, topics: x.topics.filter(y => y.id !== t.id) } : x))}><Icon name="trash" size={15} /></button></div>)}{u.topics.length === 0 && <div className="text-xs text-muted">No topics yet.</div>}</div>
      <div className="flex gap-2"><input className="field" placeholder="Add a topic" value={topicDraft[u.id] || ''} onChange={e => setTopicDraft(s => ({ ...s, [u.id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addTopic(u)} /><Btn onClick={() => addTopic(u)} disabled={busy}><Icon name="plus" size={16} /></Btn></div>
    </Card>)}
    <Card className="p-5"><Label>New unit</Label><div className="flex gap-2"><input className="field" placeholder="e.g. Unit 4: Graphs" value={unitTitle} onChange={e => setUnitTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addUnit()} /><Btn onClick={addUnit} disabled={busy}><Icon name="plus" size={16} />Add</Btn></div></Card>
  </div>;
}

export function EventsManager({ me }) {
  const d = useData();
  const toast = useToast();
  const branches = teacherBranches(me);
  const semesters = teacherSemesters(me);
  const [f, setF] = useState({ title: '', type: 'Sessional', subject: '', semester: semesters[0], branch: branches[0], date: iso(new Date(Date.now() + 7 * 864e5)), note: '' });
  const [busy, setBusy] = useState(false);
  const set = k => v => setF(x => ({ ...x, [k]: v }));
  async function add() {
    if (!f.title.trim()) return toast('Give the event a title', 'bad');
    if (!f.date) return toast('Pick a date', 'bad');
    setBusy(true);
    try { const id = uid(); await d.api.set('events/' + id, { ...f, title: f.title.trim(), note: f.note.trim(), by: me.id }); toast('Event published to students'); setF(x => ({ ...x, title: '', note: '' })); }
    catch (e) { toast('Could not publish event', 'bad'); } finally { setBusy(false); }
  }
  async function remove(id) { try { await d.api.del('events/' + id); toast('Event removed'); } catch (e) { toast('Could not delete', 'bad'); } }
  return <div className="space-y-5">
    <h1 className="text-2xl font-extrabold tracking-tight">Upcoming events</h1>
    <Card className="p-5 space-y-3">
      <div><Label>Title</Label><input className="field" placeholder="e.g. Sessional I - Data Structures" value={f.title} onChange={e => set('title')(e.target.value)} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Type</Label><Select value={f.type} onChange={set('type')}>{EVENT_TYPES.map(t => <option key={t}>{t}</option>)}</Select></div>
        <div><Label>Date</Label><input type="date" className="field" value={f.date} min={todayISO()} onChange={e => set('date')(e.target.value)} /></div>
        <div><Label>Branch</Label><Select value={f.branch} onChange={set('branch')}>{branches.map(id => <option key={id} value={id}>{BRANCHES.find(branch => branch.id === id)?.label || id}</option>)}</Select></div>
        <div><Label>Subject</Label><Select value={f.subject} onChange={set('subject')}><option value="">General</option>{d.subjects.map(s => <option key={s.code} value={s.name}>{s.name}</option>)}</Select></div>
        <div><Label>For</Label><Select value={f.semester} onChange={set('semester')}>{semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}</Select></div>
      </div>
      <div><Label>Note (optional)</Label><input className="field" placeholder="Syllabus, venue, timings..." value={f.note} onChange={e => set('note')(e.target.value)} /></div>
      <Btn className="w-full !py-3.5" onClick={add} busy={busy}><Icon name="plus" size={16} />Publish event</Btn>
    </Card>
    <Card className="p-5" delay={80}><SectionTitle>Scheduled</SectionTitle>
      {d.events.length === 0 ? <Empty icon="flag" title="No events yet" text="Published events appear instantly on every student's dashboard." /> : <div className="space-y-2">{d.events.map(e => <div key={e.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 border border-line" style={{ background: 'var(--field)' }}>
        <div className="flex-1 min-w-0"><div className="text-sm font-bold truncate">{e.title}</div><div className="text-xs text-muted">{e.type} - {BRANCHES.find(branch => branch.id === e.branch)?.label || e.branch} - {fmtDate(e.date, { day: 'numeric', month: 'short', year: 'numeric' })} - {e.semester === 'all' ? 'All semesters' : 'Sem ' + e.semester}</div></div>
        {daysUntil(e.date) < 0 && <Chip tn="muted">Past</Chip>}
        <button className="btn btn-danger !p-2" aria-label="Delete event" onClick={() => remove(e.id)}><Icon name="trash" size={16} /></button>
      </div>)}</div>}
    </Card>
  </div>;
}

export function SetupPage({ me }) {
  const d = useData();
  const toast = useToast();
  const isManagement = me.role === 'management';
  const branches = isManagement ? BRANCHES.map(branch => branch.id) : teacherBranches(me);
  const semesters = isManagement ? ['1', '2', '3', '4', '5', '6', '7', '8'] : teacherSemesters(me);
  const [sf, setSf] = useState({ code: '', name: '', teacher: '', semester: semesters[0], branch: branches[0], credits: '4' });
  const [sem, setSem] = useState(semesters[0]);
  const [day, setDay] = useState('Mon');
  const [slot, setSlot] = useState({ time: SLOT_TIMES[0], subject: '', room: '' });
  const [ttBranch, setTtBranch] = useState(branches[0]);
  const semSubjects = subjectsFor(d.subjects, sem, ttBranch);
  const ttKey = `${sem}_${ttBranch}`;
  const tt = (d.timetable[ttKey] || {}).days || {};
  async function addSubject() {
    const code = sf.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!code || !sf.name.trim()) return toast('Subject code and name are required', 'bad');
    try { await d.api.set('subjects/' + code, { code, name: sf.name.trim(), teacher: sf.teacher.trim(), semester: sf.semester, branch: sf.branch, credits: Number(sf.credits) || 3 }); toast('Subject added'); setSf(x => ({ ...x, code: '', name: '', teacher: '' })); }
    catch (e) { toast('Could not add subject', 'bad'); }
  }
  async function delSubject(code) { try { await d.api.del('subjects/' + code); toast('Subject removed'); } catch (e) { toast('Could not delete', 'bad'); } }
  async function saveTT(days) { try { await d.api.set('timetable/' + ttKey, { days, branch: ttBranch }); } catch (e) { toast('Could not save timetable', 'bad'); } }
  async function addSlot() {
    const subject = slot.subject || (semSubjects[0] && semSubjects[0].code);
    if (!subject) return toast('Add a subject for this semester first', 'bad');
    await saveTT({ ...tt, [day]: [...(tt[day] || []), { time: slot.time, subject, room: slot.room.trim() }] });
    toast('Class added to timetable');
  }
  return <div className="space-y-5">
    <h1 className="text-2xl font-extrabold tracking-tight">{isManagement ? 'Academic setup' : 'Setup'}</h1>
    <Card className="p-5 space-y-3" delay={60}>
      <SectionTitle>Add subject</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Code</Label><input className="field" placeholder="CS301" value={sf.code} onChange={e => setSf({ ...sf, code: e.target.value })} autoCapitalize="characters" /></div>
        <div><Label>Semester</Label><Select value={sf.semester} onChange={v => setSf({ ...sf, semester: v })}>{semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}</Select></div>
      </div>
      <div><Label>Subject name</Label><input className="field" placeholder="Operating Systems" value={sf.name} onChange={e => setSf({ ...sf, name: e.target.value })} /></div>
      <div><Label>Branch</Label><Select value={sf.branch} onChange={v => setSf({ ...sf, branch: v })}>{branches.map(id => <option key={id} value={id}>{BRANCHES.find(branch => branch.id === id)?.label || id}</option>)}</Select></div>
      <div><Label>Teacher (optional)</Label><input className="field" placeholder="Prof. Sharma" value={sf.teacher} onChange={e => setSf({ ...sf, teacher: e.target.value })} /></div>
      <Btn onClick={addSubject} className="w-full"><Icon name="plus" size={16} />Add subject</Btn>
      {d.subjects.length > 0 && <div className="pt-2 space-y-2">{d.subjects.map(s => <div key={s.code} className="flex items-center gap-3 rounded-xl px-3 py-2.5 border border-line" style={{ background: 'var(--field)' }}>
        <Chip tn="accent">Sem {s.semester}{s.branch && s.branch !== 'ALL' ? ' - ' + s.branch : ''}</Chip><div className="flex-1 min-w-0"><div className="text-sm font-bold truncate">{s.name}</div><div className="text-xs text-muted">{s.code}{s.teacher ? ' - ' + s.teacher : ''}</div></div>
        <button className="btn btn-danger !p-2" aria-label="Delete subject" onClick={() => delSubject(s.code)}><Icon name="trash" size={16} /></button></div>)}</div>}
    </Card>
    <Card className="p-5 space-y-3" delay={120}>
      <SectionTitle>Timetable</SectionTitle>
      <div className="grid grid-cols-2 gap-3"><div><Label>Semester</Label><Select value={sem} onChange={setSem}>{semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}</Select></div><div><Label>Branch</Label><Select value={ttBranch} onChange={setTtBranch}>{branches.map(id => <option key={id} value={id}>{BRANCHES.find(branch => branch.id === id)?.label || id}</option>)}</Select></div></div>
      <div className="scroll-x flex gap-2">{DAYS.map(dk => <button key={dk} onClick={() => setDay(dk)} className={`flex-none px-4 py-2 rounded-xl border text-sm font-bold ${day === dk ? 'border-accent tint-accent' : 'border-line bg-field text-muted'}`}>{dk} <span className="opacity-60">{(tt[dk] || []).length || ''}</span></button>)}</div>
      <div className="space-y-2">{(tt[day] || []).map((s, i) => <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5 border border-line" style={{ background: 'var(--field)' }}>
        <div className="text-xs font-bold text-muted w-[84px] flex-none">{s.time}</div><div className="flex-1 min-w-0 text-sm font-bold truncate">{(d.subjects.find(x => x.code === s.subject) || {}).name || s.subject}<span className="text-xs text-muted font-semibold"> {s.room}</span></div>
        <button className="btn btn-danger !p-2" aria-label="Remove class" onClick={() => saveTT({ ...tt, [day]: tt[day].filter((_, j) => j !== i) })}><Icon name="trash" size={16} /></button></div>)}
        {(tt[day] || []).length === 0 && <div className="text-xs text-muted">No classes on {day}.</div>}</div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Time</Label><Select value={slot.time} onChange={v => setSlot({ ...slot, time: v })}>{SLOT_TIMES.map(t => <option key={t}>{t}</option>)}</Select></div>
        <div><Label>Room</Label><input className="field" placeholder="LH-2" value={slot.room} onChange={e => setSlot({ ...slot, room: e.target.value })} /></div>
      </div>
      <div><Label>Subject</Label><Select value={slot.subject || (semSubjects[0] && semSubjects[0].code) || ''} onChange={v => setSlot({ ...slot, subject: v })}>{semSubjects.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</Select></div>
      <Btn onClick={addSlot} className="w-full" variant="ghost"><Icon name="plus" size={16} />Add class to {day}</Btn>
    </Card>
    {!isManagement && <AccountPage />}
  </div>;
}

function TeacherManager({ me }) {
  const d = useData();
  const toast = useToast();
  const [f, setF] = useState({ name: '', email: '', password: genPw(), branches: [], years: [] });
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState(null);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({ branches: [], years: [] });
  const teachers = d.accounts.filter(account => account.role === 'teacher').sort((a, b) => a.name.localeCompare(b.name));
  const toggle = (values, value) => values.includes(value) ? values.filter(item => item !== value) : [...values, value];
  async function addTeacher() {
    if (!f.name.trim()) return toast('Enter the teacher name', 'bad');
    if (!EMAIL_RE.test(f.email.trim().toLowerCase())) return toast('Enter a valid email address', 'bad');
    if (f.password.length < 6) return toast('Password must be at least 6 characters', 'bad');
    if (!f.branches.length || !f.years.length) return toast('Assign at least one branch and year', 'bad');
    setBusy(true);
    try {
      await createTeacherAccount({ ...f, by: me.id });
      setMade({ email: f.email.trim().toLowerCase(), password: f.password });
      setF({ name: '', email: '', password: genPw(), branches: [], years: [] });
      toast('Teacher account created');
    } catch (e) { toast(friendlyAuthError(e), 'bad'); }
    finally { setBusy(false); }
  }
  async function saveAssignment(id) {
    if (!draft.branches.length || !draft.years.length) return toast('Keep at least one branch and year assigned', 'bad');
    try {
      await updateDoc(doc(db, 'users', id), { branches: draft.branches, years: draft.years, semesters: semestersForYears(draft.years) });
      setEditing(null); toast('Teacher assignment updated');
    } catch (e) { toast('Could not update teacher assignment', 'bad'); }
  }
  return <div className="space-y-5">
    <h1 className="text-2xl font-extrabold tracking-tight">Teacher access</h1>
    {made && <Card className="p-4 tint-good"><div className="font-extrabold">Teacher login created</div><div className="text-sm mt-1">Email: {made.email}</div><div className="text-sm">Starting password: {made.password}</div><div className="text-xs mt-2">Share these credentials securely. The teacher can change the password under Account.</div></Card>}
    <Card className="p-5 space-y-3">
      <SectionTitle>Add teacher</SectionTitle>
      <div><Label>Full name</Label><input className="field" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} autoComplete="name" /></div>
      <div><Label>Email</Label><input className="field" type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} autoComplete="email" /></div>
      <div><Label>Starting password</Label><div className="flex gap-2"><input className="field" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /><Btn variant="ghost" onClick={() => setF({ ...f, password: genPw() })}>Generate</Btn></div></div>
      <div><Label>Assigned branches</Label><div className="grid grid-cols-2 gap-2">{BRANCHES.map(branch => <label key={branch.id} className="flex items-center gap-2 rounded-lg border border-line bg-field px-3 py-2 text-sm font-semibold"><input type="checkbox" checked={f.branches.includes(branch.id)} onChange={() => setF({ ...f, branches: toggle(f.branches, branch.id) })} />{branch.label}</label>)}</div></div>
      <div><Label>Assigned study years</Label><div className="grid grid-cols-4 gap-2">{YEARS.map(year => <label key={year} className="flex items-center gap-2 rounded-lg border border-line bg-field px-3 py-2 text-sm font-semibold"><input type="checkbox" checked={f.years.includes(year)} onChange={() => setF({ ...f, years: toggle(f.years, year) })} />Year {year}</label>)}</div></div>
      <Btn className="w-full" onClick={addTeacher} busy={busy}><Icon name="plus" size={16} />Create teacher account</Btn>
    </Card>
    <Card className="p-5 space-y-3">
      <SectionTitle right={<Chip tn="accent">{teachers.length}</Chip>}>Teachers</SectionTitle>
      {teachers.length === 0 ? <Empty icon="users" title="No teachers yet" text="Create the first teacher account above." /> : teachers.map(teacher => <div key={teacher.id} className="rounded-xl border border-line p-3" style={{ background: 'var(--field)' }}>
        <div className="flex items-center gap-3"><div className="flex-1 min-w-0"><div className="font-bold truncate">{teacher.name}</div><div className="text-xs text-muted truncate">{teacher.email}</div><div className="text-xs text-muted mt-1">{teacherBranches(teacher).map(id => BRANCHES.find(branch => branch.id === id)?.label || id).join(', ') || 'No branches'} · {(teacher.years || []).map(year => `Year ${year}`).join(', ') || 'No years'}</div></div><Btn variant="ghost" onClick={() => { setEditing(editing === teacher.id ? null : teacher.id); setDraft({ branches: teacherBranches(teacher), years: (teacher.years || []).map(String) }); }}>{editing === teacher.id ? 'Cancel' : 'Assign'}</Btn></div>
        {editing === teacher.id && <div className="mt-3 space-y-3"><div><Label>Branches</Label><div className="grid grid-cols-2 gap-2">{BRANCHES.map(branch => <label key={branch.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-semibold"><input type="checkbox" checked={draft.branches.includes(branch.id)} onChange={() => setDraft(current => ({ ...current, branches: toggle(current.branches, branch.id) }))} />{branch.label}</label>)}</div></div><div><Label>Study years</Label><div className="grid grid-cols-4 gap-2">{YEARS.map(year => <label key={year} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-semibold"><input type="checkbox" checked={draft.years.includes(year)} onChange={() => setDraft(current => ({ ...current, years: toggle(current.years, year) }))} />Year {year}</label>)}</div></div><Btn className="w-full" onClick={() => saveAssignment(teacher.id)}>Save assignment</Btn></div>}
      </div>)}
    </Card>
  </div>;
}

function TeacherAssignmentRequired({ onLogout }) {
  return <div className="min-h-screen grid place-items-center p-4"><Card className="p-6 w-full max-w-md"><h1 className="text-xl font-extrabold">Teacher assignment required</h1><p className="text-sm text-muted mt-2">Management must assign your branches and study years before you can access student or academic records.</p><Btn variant="ghost" className="mt-4" onClick={onLogout}>Log out</Btn></Card></div>;
}

export function TeacherApp({ me, onLogout, toggleTheme, theme }) {
  const [page, setPageRaw] = useState('overview');
  const setPage = p => { setPageRaw(p); window.scrollTo({ top: 0 }); };
  if (!teacherBranches(me).length || !teacherSemesters(me).length) return <TeacherAssignmentRequired onLogout={onLogout} />;
  const nav = [{ id: 'overview', label: 'Overview', icon: 'dash' }, { id: 'mark', label: 'Attend', icon: 'clipboard' }, { id: 'syllabus', label: 'Syllabus', icon: 'book' }, { id: 'events', label: 'Events', icon: 'cal' }];
  return <Shell me={me} nav={nav} page={page} setPage={setPage} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
    {page === 'overview' && <TeacherOverview go={setPage} me={me} />}
    {page === 'mark' && <AttendanceHub me={me} />}
    {page === 'syllabus' && <SyllabusManager me={me} />}
    {page === 'events' && <EventsManager me={me} />}
  </Shell>;
}

export function ManagementApp({ me, onLogout, toggleTheme, theme }) {
  const [page, setPageRaw] = useState('teachers');
  const setPage = p => { setPageRaw(p); window.scrollTo({ top: 0 }); };
  const nav = [{ id: 'teachers', label: 'Teachers', icon: 'clipboard' }, { id: 'students', label: 'Students', icon: 'users' }, { id: 'setup', label: 'Academic setup', icon: 'gear' }];
  return <Shell me={me} nav={nav} page={page} setPage={setPage} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
    {page === 'teachers' && <TeacherManager me={me} />}
    {page === 'students' && <StudentsManager me={me} />}
    {page === 'setup' && <SetupPage me={me} />}
  </Shell>;
}

const GROUP_KEY = 'attendify_group';
function loadGroup(dflt, branches, semesters) {
  try {
    const saved = { ...dflt, ...JSON.parse(localStorage.getItem(GROUP_KEY) || '{}') };
    const branch = saved.branch === 'all' && dflt.branch === 'all' ? 'all' : branches.includes(saved.branch) ? saved.branch : dflt.branch;
    const sem = saved.sem === 'all' && dflt.sem === 'all' ? 'all' : semesters.includes(saved.sem) ? saved.sem : dflt.sem;
    return { ...saved, branch, sem };
  } catch (e) { return dflt; }
}
const semOptions = [1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={String(s)}>Semester {s}</option>);

/** Semester / Branch / Section picker used to find a class of students. */
function GroupFilter({ value, onChange, students, allowAll = true, branches = BRANCHES.map(branch => branch.id), semesters = ['1', '2', '3', '4', '5', '6', '7', '8'] }) {
  const sections = useMemo(() => [...new Set(students.filter(s => inGroup(s, { ...value, section: 'all' })).map(s => s.section).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [students, value.sem, value.branch]);
  const allOpt = allowAll ? [<option key="all" value="all">All</option>] : [];
  return <div className="grid grid-cols-3 gap-2">
    <div><Label>Semester</Label><Select value={value.sem} onChange={v => onChange({ ...value, sem: v, section: 'all' })}>{allowAll && <option value="all">All assigned</option>}{semesters.map(s => <option key={s} value={s}>Sem {s}</option>)}</Select></div>
    <div><Label>Branch</Label><Select value={value.branch} onChange={v => onChange({ ...value, branch: v, section: 'all' })}>{allowAll && <option value="all">All assigned</option>}{branches.map(id => <option key={id} value={id}>{id}</option>)}</Select></div>
    <div><Label>Section</Label><Select value={value.section} onChange={v => onChange({ ...value, section: v })}><option value="all">All</option>{sections.map(s => <option key={s} value={s}>{s}</option>)}</Select></div>
  </div>;
}

export function MarkAttendance({ me }) {
  const d = useData();
  const toast = useToast();
  const branches = teacherBranches(me);
  const semesters = teacherSemesters(me);
  const [group, setGroupRaw] = useState(() => loadGroup({ sem: semesters[0], branch: branches[0], section: 'all' }, branches, semesters));
  const setGroup = g => { setGroupRaw(g); try { localStorage.setItem(GROUP_KEY, JSON.stringify(g)); } catch (e) { /* ignore */ } };
  const [code, setCode] = useState('');
  const [date, setDate] = useState(todayISO());
  const [rec, setRec] = useState({});
  const [busy, setBusy] = useState(false);
  const allStudents = useMemo(() => d.accounts.filter(a => a.role === 'student'), [d.accounts]);
  const students = useMemo(() => allStudents.filter(s => inGroup(s, group)).sort((a, b) => cid(a).localeCompare(cid(b), undefined, { numeric: true })), [allStudents, group]);
  const subs = useMemo(() => subjectsFor(d.subjects, group.sem, group.branch), [d.subjects, group.sem, group.branch]);
  const sub = subs.find(s => s.code === code) || subs[0];
  const existing = useMemo(() => {
    const m = {};
    if (sub) d.attendance.forEach(a => { if (a.subject === sub.code && a.date === date) m[a.studentId] = a.status; });
    return m;
  }, [d.attendance, sub, date]);
  const key = `${sub ? sub.code : ''}_${date}_${group.sem}_${group.branch}_${group.section}`;
  const sig = students.map(s => s.id).join('|');
  const hasRecord = Object.keys(existing).length > 0;
  useEffect(() => {
    const next = {};
    students.forEach(s => { next[s.id] = existing[s.id] || 'P'; });
    setRec(next);
  }, [key, sig, hasRecord]); // eslint-disable-line
  const present = students.filter(s => rec[s.id] === 'P').length;
  async function save() {
    if (!sub) return toast('Add a subject for this semester and branch first', 'bad');
    if (date > todayISO()) return toast('You cannot mark attendance for a future date', 'bad');
    if (!students.length) return toast('No students in this group yet', 'bad');
    setBusy(true);
    try {
      for (let i = 0; i < students.length; i += 400) {
        const batch = writeBatch(db);
        students.slice(i, i + 400).forEach(s => batch.set(doc(db, 'attendance', `${sub.code}_${date}_${s.id}`), {
          subject: sub.code, date, semester: String(s.semester), branch: stuBranch(s), section: s.section || '',
          studentId: s.id, status: rec[s.id] || 'P', by: me.id
        }));
        await batch.commit();
      }
      toast(`Attendance saved: ${present}/${students.length} present`);
    } catch (e) { toast('Could not save. Please try again.', 'bad'); } finally { setBusy(false); }
  }
  const setAll = v => { const n = {}; students.forEach(s => { n[s.id] = v; }); setRec(n); };
  const groupText = `Sem ${group.sem} - ${group.branch}${group.section !== 'all' ? ' - Section ' + group.section : ' - all sections'}`;
  return <div className="space-y-5">
    <h1 className="text-2xl font-extrabold tracking-tight">Mark attendance</h1>
    <Card className="p-5 space-y-3">
      <SectionTitle>Find your class</SectionTitle>
      <GroupFilter value={group} onChange={setGroup} students={allStudents} allowAll={false} branches={branches} semesters={semesters} />
      <div className="grid sm:grid-cols-2 gap-3">
        <div><Label>Subject</Label><Select value={sub ? sub.code : ''} onChange={setCode}>{subs.length === 0 ? <option value="">No subjects</option> : subs.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</Select></div>
        <div><Label>Date</Label><input type="date" className="field" value={date} max={todayISO()} onChange={e => e.target.value && setDate(e.target.value)} /></div>
      </div>
    </Card>
    <Card className="p-5" delay={80}>
      {!sub ? <Empty icon="book" title="No subjects for this class" text="Add a subject for this semester and branch in Setup, then come back." /> : <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div><div className="font-extrabold">{students.length} students</div><div className="text-xs text-muted font-semibold">{groupText}</div><div className="text-xs text-muted font-semibold">{present} present, {students.length - present} absent{hasRecord ? ' - editing saved record' : ''}</div></div>
        <div className="flex gap-2"><Btn variant="ghost" onClick={() => setAll('P')}>All present</Btn><Btn variant="ghost" onClick={() => setAll('A')}>All absent</Btn></div>
      </div>
      {students.length === 0 ? <Empty icon="users" title="No students in this group" text="Choose another assigned class or ask management to add these students." /> : <div className="space-y-2">{students.map(s => <div key={s.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 border border-line" style={{ background: 'var(--field)' }}>
        <div className={`w-9 h-9 rounded-lg grid place-items-center text-xs font-extrabold flex-none ${rec[s.id] === 'P' ? 'tint-good' : 'tint-bad'}`}>{initials(s.name)}</div>
        <div className="flex-1 min-w-0"><div className="text-sm font-bold truncate">{s.name}</div><div className="text-xs text-muted truncate">{cid(s).toUpperCase()}{s.section ? ' - Sec ' + s.section : ''}</div></div>
        <div className="flex p-0.5 rounded-xl border border-line flex-none">
          <button onClick={() => setRec(r => ({ ...r, [s.id]: 'P' }))} className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition ${rec[s.id] === 'P' ? 'tint-good' : 'text-muted'}`}>P</button>
          <button onClick={() => setRec(r => ({ ...r, [s.id]: 'A' }))} className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition ${rec[s.id] === 'A' ? 'tint-bad' : 'text-muted'}`}>A</button>
        </div>
      </div>)}</div>}
      <Btn className="w-full mt-5 !py-3.5" onClick={save} busy={busy} disabled={!students.length}>Save attendance</Btn></>}
    </Card>
  </div>;
}

/** One row per student: classes attended / held for a subject. */
function subjectReportRows(sub, students, attendance) {
  const map = {};
  students.forEach(s => { map[s.id] = { s, attended: 0, total: 0 }; });
  attendance.forEach(a => {
    if (a.subject !== sub.code) return;
    const r = map[a.studentId];
    if (!r) return;
    r.total++;
    if (a.status === 'P') r.attended++;
  });
  return Object.values(map).map(r => ({ ...r, p: r.total ? (r.attended / r.total) * 100 : null }));
}

function SubjectReport({ me }) {
  const d = useData();
  const branches = teacherBranches(me);
  const semesters = teacherSemesters(me);
  const [group, setGroupRaw] = useState(() => loadGroup({ sem: semesters[0], branch: branches[0], section: 'all' }, branches, semesters));
  const setGroup = g => { setGroupRaw(g); try { localStorage.setItem(GROUP_KEY, JSON.stringify(g)); } catch (e) { /* ignore */ } };
  const [code, setCode] = useState('');
  const [q, setQ] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const allStudents = useMemo(() => d.accounts.filter(a => a.role === 'student'), [d.accounts]);
  const students = useMemo(() => allStudents.filter(s => inGroup(s, group)), [allStudents, group]);
  const subs = useMemo(() => subjectsFor(d.subjects, group.sem, group.branch), [d.subjects, group.sem, group.branch]);
  const sub = subs.find(s => s.code === code) || subs[0];
  const rows = useMemo(() => (sub ? subjectReportRows(sub, students, d.attendance) : []), [sub, students, d.attendance]);
  const withData = rows.filter(r => r.p != null);
  const avg = withData.length ? withData.reduce((n, r) => n + r.p, 0) / withData.length : null;
  const low = withData.filter(r => r.p < 75).length;
  const held = rows.reduce((n, r) => Math.max(n, r.total), 0);
  const sections = useMemo(() => {
    const m = {};
    rows.forEach(r => { const k = r.s.section || 'No section'; (m[k] = m[k] || []).push(r); });
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })).map(([k, list]) => {
      const wd = list.filter(r => r.p != null);
      return { k, n: list.length, avg: wd.length ? wd.reduce((n, r) => n + r.p, 0) / wd.length : null, low: wd.filter(r => r.p < 75).length };
    });
  }, [rows]);
  const needle = q.toLowerCase();
  const shown = rows.filter(r => (!onlyLow || (r.p != null && r.p < 75)) && (r.s.name.toLowerCase().includes(needle) || cid(r.s).toLowerCase().includes(needle)))
    .sort((a, b) => (a.p == null ? 101 : a.p) - (b.p == null ? 101 : b.p));
  const tile = (label, val, tn) => <div className="rounded-xl border border-line p-3 text-center" style={{ background: 'var(--field)' }}><div className={`text-xl font-extrabold text-${tn}`}>{val}</div><div className="text-[11px] text-muted font-bold">{label}</div></div>;
  return <div className="space-y-5">
    <h1 className="text-2xl font-extrabold tracking-tight">Subject report</h1>
    <Card className="p-5 space-y-3">
      <SectionTitle>Choose subject and sections</SectionTitle>
      <GroupFilter value={group} onChange={setGroup} students={allStudents} allowAll={false} branches={branches} semesters={semesters} />
      <div><Label>Subject</Label><Select value={sub ? sub.code : ''} onChange={setCode}>{subs.length === 0 ? <option value="">No subjects</option> : subs.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</Select></div>
      <div className="text-xs text-muted font-semibold">Leave Section on All to compare every section, or pick one section. You can view any section, not only your own.</div>
    </Card>
    {!sub ? <Card className="p-4"><Empty icon="book" title="No subjects for this class" text="Add a subject for this semester and branch in Setup." /></Card> : <>
    <Card className="p-5" delay={60}>
      <div className="grid grid-cols-3 gap-2">{tile('Students', rows.length, 'accent')}{tile('Average', fmtPct(avg), tone(avg))}{tile('Below 75%', low, low ? 'bad' : 'good')}</div>
      <div className="text-xs text-muted font-semibold mt-3 text-center">{sub.name} - up to {held} classes recorded</div>
    </Card>
    {sections.length > 1 && <Card className="p-5" delay={100}>
      <SectionTitle>Section-wise</SectionTitle>
      <div className="space-y-3">{sections.map(x => <div key={x.k}>
        <div className="flex items-center justify-between text-sm font-bold mb-1.5"><span>{x.k === 'No section' ? x.k : 'Section ' + x.k} <span className="text-xs text-muted font-semibold">{x.n} students{x.low ? ', ' + x.low + ' below 75%' : ''}</span></span><Chip tn={tone(x.avg)}>{fmtPct(x.avg)}</Chip></div>
        <Bar value={x.avg} />
      </div>)}</div>
    </Card>}
    <Card className="p-5 space-y-3" delay={140}>
      <SectionTitle right={<Chip tn="muted">{shown.length} shown</Chip>}>Students (lowest first)</SectionTitle>
      <div className="flex gap-2"><input className="field" placeholder="Search name or college ID" value={q} onChange={e => setQ(e.target.value)} /><button onClick={() => setOnlyLow(v => !v)} className={`btn flex-none ${onlyLow ? 'tint-bad' : 'btn-ghost'}`}>Below 75%</button></div>
      {rows.length === 0 ? <Empty icon="users" title="No students in this group" text="Pick a different semester, branch or section." /> : shown.length === 0 ? <div className="text-sm text-muted text-center py-6">No matches.</div> : <div className="space-y-2">{shown.map(r => <div key={r.s.id} className="rounded-xl border border-line px-3 py-2.5" style={{ background: 'var(--field)' }}>
        <div className="flex items-center gap-3"><div className={`w-9 h-9 rounded-lg grid place-items-center text-xs font-extrabold flex-none tint-${tone(r.p)}`}>{initials(r.s.name)}</div>
          <div className="flex-1 min-w-0"><div className="text-sm font-bold truncate">{r.s.name}</div><div className="text-xs text-muted truncate">{cid(r.s).toUpperCase()}{r.s.section ? ' - Sec ' + r.s.section : ''} - {r.attended}/{r.total} classes</div></div>
          <Chip tn={tone(r.p)}>{fmtPct(r.p)}</Chip></div>
        <div className="mt-2"><Bar value={r.p} marker={false} /></div>
      </div>)}</div>}
    </Card></>}
  </div>;
}

function AttendanceHub({ me }) {
  const [tab, setTab] = useState('mark');
  return <div className="space-y-5">
    <div className="flex p-1 rounded-xl bg-field border border-line">{[['mark', 'Mark attendance'], ['report', 'Subject report']].map(([id, l]) => <button key={id} onClick={() => setTab(id)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${tab === id ? 'tint-accent' : 'text-muted'}`}>{l}</button>)}</div>
    {tab === 'mark' ? <MarkAttendance me={me} /> : <SubjectReport me={me} />}
  </div>;
}

const PW_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';
function genPw() { const a = new Uint32Array(8); crypto.getRandomValues(a); return [...a].map(n => PW_CHARS[n % PW_CHARS.length]).join(''); }
async function copyText(t) { try { await navigator.clipboard.writeText(t); return true; } catch (e) { return false; } }
const secOk = v => /^[A-Za-z0-9]{0,4}$/.test(String(v).trim());

export function StudentsManager({ me }) {
  const d = useData();
  const toast = useToast();
  const branches = me.role === 'management' ? BRANCHES.map(branch => branch.id) : teacherBranches(me);
  const all = useMemo(() => d.accounts.filter(a => a.role === 'student'), [d.accounts]);
  const [f, setF] = useState({ name: '', cid: '', semester: '1', branch: branches[0], section: '', pw: genPw() });
  const [bulk, setBulk] = useState({ semester: '1', branch: branches[0], section: '', pw: genPw(), text: '' });
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState(null);
  const [q, setQ] = useState('');
  const [group, setGroupRaw] = useState({ sem: 'all', branch: branches.length > 1 ? 'all' : branches[0], section: 'all' });
  const [confirmDel, setConfirmDel] = useState(null);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});
  const knownSections = useMemo(() => [...new Set(all.map(s => s.section).filter(Boolean))].sort(), [all]);
  const setGroup = g => setGroupRaw({ ...g, branch: g.branch === 'all' || branches.includes(g.branch) ? g.branch : branches[0] });

  async function addOne() {
    const id = f.cid.trim().toLowerCase();
    if (!f.name.trim()) return toast('Enter the student\'s name', 'bad');
    if (!ID_RE.test(id)) return toast('Enter a valid college ID (letters, numbers, - or _)', 'bad');
    if (!secOk(f.section)) return toast('Section can use letters and numbers (max 4)', 'bad');
    if (f.pw.length < 6) return toast('Password must be at least 6 characters', 'bad');
    if (all.some(s => cid(s).toLowerCase() === id)) return toast('That college ID already exists', 'bad');
    setBusy(true);
    try {
      await createStudentAccount({ name: f.name, collegeId: f.cid, semester: f.semester, branch: f.branch, section: f.section, password: f.pw, by: me.id });
      setMade({ title: 'Student added', lines: [`${f.name.trim()}  |  ID: ${f.cid.trim().toUpperCase()}  |  Password: ${f.pw}`] });
      toast('Student added');
      setF(x => ({ ...x, name: '', cid: '', pw: genPw() }));
    } catch (e) { toast(friendlyAuthError(e), 'bad'); } finally { setBusy(false); }
  }
  async function addBulk() {
    if (bulk.pw.length < 6) return toast('Password must be at least 6 characters', 'bad');
    if (!secOk(bulk.section)) return toast('Section can use letters and numbers (max 4)', 'bad');
    const seen = new Set(all.map(s => cid(s).toLowerCase()));
    const todo = [];
    let skipped = 0;
    bulk.text.split('\n').forEach(line => {
      const parts = line.split(/[,\t]/);
      const raw = (parts[0] || '').trim(), name = parts.slice(1).join(' ').trim();
      if (!raw && !name) return;
      const id = raw.toLowerCase();
      if (!ID_RE.test(id) || !name || seen.has(id)) { skipped++; return; }
      seen.add(id); todo.push([name, raw]);
    });
    if (!todo.length) return toast(skipped ? 'Nothing to add: check the format and duplicates' : 'Paste at least one line', 'bad');
    setBusy(true);
    const done = [], failed = [];
    for (const [name, raw] of todo) {
      try {
        await createStudentAccount({ name, collegeId: raw, semester: bulk.semester, branch: bulk.branch, section: bulk.section, password: bulk.pw, by: me.id });
        done.push(`${name}  |  ID: ${raw.toUpperCase()}`);
      } catch (e) { failed.push(`${raw.toUpperCase()}: ${friendlyAuthError(e)}`); }
    }
    setMade({ title: `${done.length} students added${failed.length ? `, ${failed.length} failed` : ''}`, note: `Everyone's starting password: ${bulk.pw}`, lines: [...done, ...failed.map(x => 'FAILED - ' + x)] });
    toast(`${done.length} added${failed.length ? `, ${failed.length} failed` : ''}`, failed.length ? 'bad' : 'good');
    if (done.length) setBulk(x => ({ ...x, text: '', pw: genPw() }));
    setBusy(false);
  }
  async function removeOne(s) {
    if (confirmDel !== s.id) { setConfirmDel(s.id); setTimeout(() => setConfirmDel(c => (c === s.id ? null : c)), 3500); return; }
    try { await removeStudent(s.id, stuBranch(s)); toast('Student removed'); setConfirmDel(null); } catch (e) { toast('Could not remove student', 'bad'); }
  }
  async function saveEdit(s) {
    if (!secOk(draft.section)) return toast('Section can use letters and numbers (max 4)', 'bad');
    try {
      await updateDoc(doc(db, 'users', s.id), { semester: draft.semester, branch: draft.branch, section: draft.section.trim().toUpperCase() });
      toast('Student updated'); setEditing(null);
    } catch (e) { toast('Could not update student', 'bad'); }
  }
  const list = all.filter(s => inGroup(s, group) && (s.name.toLowerCase().includes(q.toLowerCase()) || cid(s).toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => cid(a).localeCompare(cid(b), undefined, { numeric: true }));
  const secInput = (val, onInput) => <input className="field" list="known-sections" placeholder="1, 2 or A" value={val} onChange={e => onInput(e.target.value)} autoCapitalize="characters" maxLength="4" />;

  return <div className="space-y-5">
    <h1 className="text-2xl font-extrabold tracking-tight">Students</h1>
    <datalist id="known-sections">{knownSections.map(s => <option key={s} value={s} />)}</datalist>
    {made && <Card className="p-5" style={{ borderColor: 'var(--good)' }}>
      <SectionTitle right={<button className="text-xs font-bold text-muted" onClick={() => setMade(null)}>Dismiss</button>}>{made.title}</SectionTitle>
      <div className="text-xs text-muted mb-2 font-semibold">Share these login details with the students. Passwords are not shown again.</div>
      {made.note && <div className="tint-good rounded-xl px-3 py-2 text-sm font-bold mb-2">{made.note}</div>}
      <div className="rounded-xl border border-line p-3 text-sm font-semibold space-y-1 max-h-48 overflow-y-auto" style={{ background: 'var(--field)' }}>{made.lines.map((l, i) => <div key={i} className="break-words">{l}</div>)}</div>
      <Btn variant="ghost" className="mt-3" onClick={async () => toast((await copyText((made.note ? made.note + '\n' : '') + made.lines.join('\n'))) ? 'Copied' : 'Copy not available here', 'good')}>Copy details</Btn>
    </Card>}
    <Card className="p-5 space-y-3">
      <SectionTitle>Add a student</SectionTitle>
      <div><Label>Full name</Label><input className="field" placeholder="e.g. Aarav Sharma" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></div>
      <div><Label>College ID</Label><input className="field" placeholder="CSE24-014" value={f.cid} onChange={e => setF({ ...f, cid: e.target.value })} autoCapitalize="characters" /></div>
      <div className="grid grid-cols-3 gap-2">
        <div><Label>Semester</Label><Select value={f.semester} onChange={v => setF({ ...f, semester: v })}>{semOptions}</Select></div>
        <div><Label>Branch</Label><Select value={f.branch} onChange={v => setF({ ...f, branch: v })}>{branches.map(id => <option key={id} value={id}>{BRANCHES.find(branch => branch.id === id)?.label || id}</option>)}</Select></div>
        <div><Label>Section</Label>{secInput(f.section, v => setF({ ...f, section: v }))}</div>
      </div>
      <div><Label>Password</Label><div className="flex gap-2"><input className="field" value={f.pw} onChange={e => setF({ ...f, pw: e.target.value })} /><Btn variant="ghost" onClick={() => setF({ ...f, pw: genPw() })}>Generate</Btn></div></div>
      <Btn className="w-full" onClick={addOne} busy={busy}><Icon name="plus" size={16} />Add student</Btn>
    </Card>
    <Card className="p-5 space-y-3" delay={60}>
      <SectionTitle>Add a whole class at once</SectionTitle>
      <div className="text-xs text-muted font-semibold">Choose the semester, branch and section, then paste one student per line as <b className="text-ink">College ID, Full name</b>. They all get the same starting password and can change it under Account.</div>
      <div className="grid grid-cols-3 gap-2">
        <div><Label>Semester</Label><Select value={bulk.semester} onChange={v => setBulk({ ...bulk, semester: v })}>{semOptions}</Select></div>
        <div><Label>Branch</Label><Select value={bulk.branch} onChange={v => setBulk({ ...bulk, branch: v })}>{branches.map(id => <option key={id} value={id}>{BRANCHES.find(branch => branch.id === id)?.label || id}</option>)}</Select></div>
        <div><Label>Section</Label>{secInput(bulk.section, v => setBulk({ ...bulk, section: v }))}</div>
      </div>
      <div><Label>Starting password</Label><input className="field" value={bulk.pw} onChange={e => setBulk({ ...bulk, pw: e.target.value })} /></div>
      <textarea className="field" rows="5" placeholder={'CSE24-001, Aarav Sharma\nCSE24-002, Riya Kapoor'} value={bulk.text} onChange={e => setBulk({ ...bulk, text: e.target.value })} style={{ resize: 'vertical' }} />
      <Btn variant="ghost" className="w-full" onClick={addBulk} busy={busy}><Icon name="users" size={16} />Add all</Btn>
    </Card>
    <Card className="p-5 space-y-3" delay={120}>
      <SectionTitle right={<Chip tn="accent">{list.length} of {all.length}</Chip>}>Find students</SectionTitle>
      <GroupFilter value={group} onChange={setGroup} students={all} branches={branches} />
      <input className="field" placeholder="Search name or college ID" value={q} onChange={e => setQ(e.target.value)} />
      {all.length === 0 ? <Empty icon="users" title="No students yet" text="Add your first student above. They can log in right away." /> : list.length === 0 ? <div className="text-sm text-muted text-center py-6">No matches.</div> : <div className="space-y-2">{list.map(s => <div key={s.id} className="rounded-xl border border-line" style={{ background: 'var(--field)' }}>
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-9 h-9 rounded-lg tint-accent grid place-items-center text-xs font-extrabold flex-none">{initials(s.name)}</div>
          <div className="flex-1 min-w-0"><div className="text-sm font-bold truncate">{s.name}</div><div className="text-xs text-muted truncate">{cid(s).toUpperCase()} - Sem {s.semester} - {stuBranch(s)}{s.section ? ' - Sec ' + s.section : ''}</div></div>
          <button className="btn btn-ghost !p-2" aria-label="Edit student" onClick={() => { setEditing(editing === s.id ? null : s.id); setDraft({ semester: String(s.semester), branch: stuBranch(s), section: s.section || '' }); }}><Icon name="gear" size={16} /></button>
          <button className={`btn btn-danger ${confirmDel === s.id ? '' : '!p-2'}`} aria-label="Remove student" onClick={() => removeOne(s)}>{confirmDel === s.id ? 'Confirm?' : <Icon name="trash" size={16} />}</button>
        </div>
        {editing === s.id && <div className="px-3 pb-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Semester</Label><Select value={draft.semester} onChange={v => setDraft({ ...draft, semester: v })}>{semOptions}</Select></div>
            <div><Label>Branch</Label><Select value={draft.branch} onChange={v => setDraft({ ...draft, branch: v })}>{branches.map(id => <option key={id} value={id}>{BRANCHES.find(branch => branch.id === id)?.label || id}</option>)}</Select></div>
            <div><Label>Section</Label>{secInput(draft.section, v => setDraft({ ...draft, section: v }))}</div>
          </div>
          <Btn className="w-full" onClick={() => saveEdit(s)}>Save changes</Btn>
        </div>}
      </div>)}</div>}
    </Card>
  </div>;
}
