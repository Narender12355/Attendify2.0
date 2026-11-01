export const MIN_ATT = 75;

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const EVENT_TYPES = ['Sessional', 'Exam', 'Assignment', 'Event'];

export const SLOT_TIMES = ['09:00 - 10:00', '10:00 - 11:00', '11:15 - 12:15', '12:15 - 13:15', '14:00 - 15:00', '15:00 - 16:00'];

export const pad = n => String(n).padStart(2, '0');

export const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayISO = () => iso(new Date());

export const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

export const daysUntil = s => Math.round((parseISO(s) - parseISO(todayISO())) / 864e5);

export const fmtDate = (s, o) => parseISO(s).toLocaleDateString(undefined, o || { day: 'numeric', month: 'short' });

export const dayKey = d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];

export const uid = () => Math.random().toString(36).slice(2, 9);

export const fmtPct = p => (p == null ? '--' : (Math.round(p * 10) / 10).toFixed(p % 1 === 0 ? 0 : 1) + '%');

export const initials = n => (n || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

export const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 'es'}`;

export const tone = p => (p == null ? 'muted' : p >= 75 ? 'good' : p >= 65 ? 'warn' : 'bad');

export const cid = a => (a && (a.collegeId || a.email || a.id)) || '';

export const ID_RE = /^[a-z0-9][a-z0-9._-]*$/;
export const EMAIL_RE = /^[a-z0-9._+\-~:]+@[a-z0-9.\-]+\.[a-z]{2,}$/;

/* ---------- attendance maths ---------- */
export function computeStats(studentId, subjects, attendance) {
  const rows = subjects.map(s => {
    const hist = attendance
      .filter(a => a.subject === s.code && a.studentId === studentId)
      .map(a => ({ date: a.date, status: a.status }))
      .sort((x, y) => y.date.localeCompare(x.date));
    const attended = hist.filter(h => h.status === 'P').length;
    const total = hist.length;
    return { subject: s, attended, total, p: total ? (attended / total) * 100 : null, hist };
  });
  const A = rows.reduce((n, r) => n + r.attended, 0), T = rows.reduce((n, r) => n + r.total, 0);
  return { rows, attended: A, total: T, p: T ? (A / T) * 100 : null };
}

export const predict = (a, t, x) => (t + x ? (a / (t + x)) * 100 : null);

export function insight(a, t) {
  if (!t) return { text: 'No classes held yet', tn: 'muted' };
  const p = (a / t) * 100;
  if (p >= MIN_ATT) {
    const safe = Math.floor(a / 0.75 - t + 1e-9);
    return safe > 0
      ? { text: `You can skip ${plural(safe, 'class')} and stay above 75%`, tn: 'good' }
      : { text: 'Right at the limit. Avoid skipping.', tn: 'warn' };
  }
  const need = Math.ceil((0.75 * t - a) / 0.25 - 1e-9);
  return { text: `Attend the next ${plural(need, 'class')} in a row to reach 75%`, tn: p >= 65 ? 'warn' : 'bad' };
}

export function buildAlerts(st, events) {
  const out = [];
  st.rows.forEach(r => {
    if (!r.total) return;
    const ins = insight(r.attended, r.total);
    if (r.p < 75) out.push({ id: 'low' + r.subject.code, tn: r.p < 65 ? 'bad' : 'warn', icon: 'alert', title: `${r.subject.name}: ${fmtPct(r.p)}`, text: `Below the 75% requirement. ${ins.text}.` });
    else if (predict(r.attended, r.total, 1) < 75) out.push({ id: 'edge' + r.subject.code, tn: 'warn', icon: 'flag', title: `${r.subject.name}: on the edge`, text: `If you miss 1 more class, your attendance will fall to ${fmtPct(predict(r.attended, r.total, 1))}.` });
    else if (predict(r.attended, r.total, 2) < 75) out.push({ id: 'edge2' + r.subject.code, tn: 'warn', icon: 'flag', title: `${r.subject.name}: careful`, text: `If you miss 2 more classes, your attendance will fall to ${fmtPct(predict(r.attended, r.total, 2))}.` });
  });
  events.filter(e => daysUntil(e.date) <= 7).forEach(e => {
    const n = daysUntil(e.date);
    out.push({ id: 'ev' + e.id, tn: 'accent', icon: 'cal', title: `${e.title}${n === 0 ? ' is today' : n === 1 ? ' is tomorrow' : ` in ${n} days`}`, text: `${e.type}${e.subject ? ' - ' + e.subject : ''} on ${fmtDate(e.date, { weekday: 'short', day: 'numeric', month: 'short' })}.${e.note ? ' ' + e.note : ''}` });
  });
  return out;
}

export const BRANCHES = [
  { id: 'CE', label: 'Computer Engineering' }, { id: 'AI', label: 'Artificial Intelligence' },
  { id: 'ECE', label: 'Electronics' }, { id: 'EE', label: 'Electrical' },
  { id: 'ME', label: 'Mechanical' }, { id: 'FA', label: 'Fashion and Apparel' },
  { id: 'TT', label: 'Textile Technology' }, { id: 'TC', label: 'Textile Chemistry' },
  { id: 'OTHER', label: 'Other' }
];
export const teacherBranches = teacher => {
  const assigned = Array.isArray(teacher && teacher.branches) ? teacher.branches : (teacher && teacher.branch ? [teacher.branch] : []);
  return [...new Set(assigned.filter(id => BRANCHES.some(branch => branch.id === id)))];
};
export const YEARS = ['1', '2', '3', '4'];
export const semestersForYears = years => [...new Set((years || []).filter(year => YEARS.includes(String(year))).flatMap(year => {
  const first = (Number(year) - 1) * 2 + 1;
  return [String(first), String(first + 1)];
}))];
export const teacherSemesters = teacher => {
  const semesters = Array.isArray(teacher && teacher.semesters) ? teacher.semesters : semestersForYears(teacher && teacher.years);
  return [...new Set(semesters.map(String).filter(semester => ['1', '2', '3', '4', '5', '6', '7', '8'].includes(semester)))];
};
/** Students saved without a branch are treated as Computer Engineering. */
export const stuBranch = s => (s && s.branch) || 'CE';
/** Subjects a student of this semester + branch studies (subjects marked ALL apply to every branch). */
export const subjectsFor = (subjects, sem, branch) => subjects.filter(s => String(s.semester) === String(sem) && (!s.branch || s.branch === 'ALL' || s.branch === branch));
/** Does a student match a {sem, branch, section} filter? 'all' means no filter. */
export const inGroup = (s, g) =>
  (g.sem === 'all' || String(s.semester) === String(g.sem)) &&
  (g.branch === 'all' || stuBranch(s) === g.branch) &&
  (g.section === 'all' || (s.section || '') === g.section);
