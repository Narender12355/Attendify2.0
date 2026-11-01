import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { collection, deleteDoc, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { teacherBranches, teacherSemesters } from '../lib/utils.js';

const DataCtx = createContext(null);
export const useData = () => useContext(DataCtx);

const pathRef = path => doc(db, ...path.split('/'));
const api = { set: (path, data) => setDoc(pathRef(path), data), del: path => deleteDoc(pathRef(path)) };
const KEYS = ['accounts', 'subjects', 'attendance', 'events', 'syllabus', 'progress', 'timetable'];
const rows = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }));
const byId = arr => Object.fromEntries((arr || []).map(x => [x.id, x]));

/**
 * Live Firestore data for the signed-in user. Teacher data is scoped to their assigned branches;
 * students only receive their own attendance and progress.
 */
export function DataProvider({ me, children }) {
  const [st, setSt] = useState({});
  const [error, setError] = useState(null);
  const isTeacher = me.role === 'teacher';
  const isManagement = me.role === 'management';
  const branches = isTeacher ? teacherBranches(me) : [];
  const semesters = isTeacher ? teacherSemesters(me) : [];
  const branchKey = branches.join('|');
  const semesterKey = semesters.join('|');
  const assigned = branches.length > 0 && semesters.length > 0;
  const subjectCodes = (st.subjects || []).map(subject => subject.code).join('|');
  const studentIds = (st.accounts || []).map(account => account.id).join('|');

  useEffect(() => {
    setSt({ _branches: branchKey, _semesters: semesterKey }); setError(null);
    const put = (key, value) => setSt(s => ({ ...s, [key]: value }));
    const onErr = e => setError(e);
    const offs = [];
    if (isManagement) {
      ['users', 'subjects', 'attendance', 'events', 'syllabus', 'progress', 'timetable'].forEach(name => {
        const key = name === 'users' ? 'accounts' : name;
        offs.push(onSnapshot(collection(db, name), snap => put(key, rows(snap)), onErr));
      });
    } else if (isTeacher) {
      if (!assigned) {
        KEYS.forEach(key => put(key, []));
        return undefined;
      }
      put('syllabus', []); put('timetable', []); put('progress', []);
      const scopedRows = {};
      const putPartition = (key, partition, snap) => {
        scopedRows[key] = { ...(scopedRows[key] || {}), [partition]: rows(snap) };
        put(key, [...new Map(Object.values(scopedRows[key]).flat().map(row => [row.id, row])).values()]);
      };
      branches.forEach(branch => {
        semesters.forEach(semester => {
          const partition = `${branch}_${semester}`;
          const semesterQuery = (name, key, extra = []) => {
            const filters = [where('branch', '==', branch), where('semester', '==', semester), ...extra];
            offs.push(onSnapshot(query(collection(db, name), ...filters), snap => putPartition(key, partition, snap), onErr));
          };
          semesterQuery('users', 'accounts', [where('role', '==', 'student')]);
          semesterQuery('subjects', 'subjects');
          semesterQuery('attendance', 'attendance');
          semesterQuery('events', 'events');
          const ref = doc(db, 'timetable', `${semester}_${branch}`);
          offs.push(onSnapshot(ref, snap => setSt(current => {
            const timetables = (current.timetable || []).filter(item => item.id !== snap.id);
            return { ...current, timetable: snap.exists() ? [...timetables, { id: snap.id, ...snap.data() }] : timetables };
          }), onErr));
        });
      });
    } else if (!isManagement) {
      ['subjects', 'events', 'syllabus', 'timetable'].forEach(n =>
        offs.push(onSnapshot(collection(db, n), snap => put(n, rows(snap)), onErr)));
      put('accounts', [me]);
      offs.push(onSnapshot(query(collection(db, 'attendance'), where('studentId', '==', me.id)), snap => put('attendance', rows(snap)), onErr));
      offs.push(onSnapshot(doc(db, 'progress', me.id), snap => put('progress', snap.exists() ? [{ id: snap.id, ...snap.data() }] : []), onErr));
    }
    return () => offs.forEach(off => off());
  }, [me.id, isTeacher, isManagement, branchKey, semesterKey, assigned]);

  useEffect(() => {
    if (!isTeacher || !assigned || st._branches !== branchKey || st.subjects === undefined) return undefined;
    const codes = subjectCodes ? subjectCodes.split('|') : [];
    if (!codes.length) { setSt(s => ({ ...s, syllabus: [] })); return undefined; }
    const syllabusById = {};
    setSt(s => ({ ...s, syllabus: [] }));
    const offs = codes.map(code => onSnapshot(doc(db, 'syllabus', code), snap => {
      if (snap.exists()) syllabusById[code] = { id: snap.id, ...snap.data() };
      else delete syllabusById[code];
      setSt(s => ({ ...s, syllabus: Object.values(syllabusById) }));
    }, setError));
    return () => offs.forEach(off => off());
  }, [isTeacher, assigned, branchKey, st._branches, subjectCodes]);

  useEffect(() => {
    if (!isTeacher || !assigned || st._branches !== branchKey || st.accounts === undefined) return undefined;
    const ids = studentIds ? studentIds.split('|') : [];
    if (!ids.length) { setSt(s => ({ ...s, progress: [] })); return undefined; }
    const progressById = {};
    setSt(s => ({ ...s, progress: [] }));
    const offs = ids.map(id => onSnapshot(doc(db, 'progress', id), snap => {
      if (snap.exists()) progressById[id] = { id: snap.id, ...snap.data() };
      else delete progressById[id];
      setSt(s => ({ ...s, progress: Object.values(progressById) }));
    }, setError));
    return () => offs.forEach(off => off());
  }, [isTeacher, assigned, branchKey, st._branches, studentIds]);

  const loading = KEYS.some(k => st[k] === undefined);
  const value = useMemo(() => ({
    loading, error, api,
    accounts: st.accounts || [],
    subjects: (st.subjects || []).slice().sort((a, b) => a.code.localeCompare(b.code)),
    attendance: st.attendance || [],
    events: (st.events || []).slice().sort((a, b) => a.date.localeCompare(b.date)),
    syllabus: byId(st.syllabus), progress: byId(st.progress), timetable: byId(st.timetable)
  }), [st, loading, error]);

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}
