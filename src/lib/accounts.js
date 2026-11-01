import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth, createUserWithEmailAndPassword, deleteUser, signOut,
  EmailAuthProvider, reauthenticateWithCredential, updatePassword
} from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, getFirestore, query, setDoc, where, writeBatch } from 'firebase/firestore';
import { auth, db, firebaseConfig, idToEmail } from './firebase.js';
import { semestersForYears, uid } from './utils.js';

/** A second Firebase app instance lets management provision accounts without signing out. */
function secondaryAuth() {
  const existing = getApps().find(a => a.name === 'secondary');
  return getAuth(existing || initializeApp(firebaseConfig, 'secondary'));
}

export async function createManagementAccount({ name, email, password, code }) {
  const sa = secondaryAuth();
  const sdb = getFirestore(sa.app);
  let cred;
  try {
    cred = await createUserWithEmailAndPassword(sa, email.trim().toLowerCase(), password);
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') throw new Error('An account with this email already exists. Try logging in.');
    throw e;
  }
  try {
    await setDoc(doc(sdb, 'users', cred.user.uid), {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: 'management',
      inviteCode: code,
      createdAt: Date.now()
    });
  } catch (e) {
    await deleteUser(cred.user).catch(() => {});
    throw e;
  } finally {
    await signOut(sa).catch(() => {});
  }
  return cred.user.uid;
}

export async function createStudentAccount({ name, collegeId, semester, branch, section, password, by }) {
  const sa = secondaryAuth();
  let cred;
  try {
    cred = await createUserWithEmailAndPassword(sa, idToEmail(collegeId), password);
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') {
      throw new Error('This college ID was registered before. Delete that user in Firebase Console > Authentication, then add again.');
    }
    throw e;
  }
  try {
    await setDoc(doc(db, 'users', cred.user.uid), {
      name: name.trim(),
      collegeId: collegeId.trim().toUpperCase(),
      role: 'student',
      semester: String(semester),
      branch: branch || 'CE',
      section: String(section || '').trim().toUpperCase(),
      createdBy: by,
      createdAt: Date.now()
    });
  } catch (e) {
    await deleteUser(cred.user).catch(() => {});
    throw e;
  } finally {
    await signOut(sa).catch(() => {});
  }
  return cred.user.uid;
}

export async function createTeacherAccount({ name, email, branches, years, password, by }) {
  const sa = secondaryAuth();
  let cred;
  try {
    cred = await createUserWithEmailAndPassword(sa, email.trim().toLowerCase(), password);
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') throw new Error('An account with this email already exists.');
    throw e;
  }
  try {
    const normalizedYears = [...new Set(years.map(String))];
    await setDoc(doc(db, 'users', cred.user.uid), {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: 'teacher',
      branches: [...new Set(branches)],
      years: normalizedYears,
      semesters: semestersForYears(normalizedYears),
      createdBy: by,
      createdAt: Date.now()
    });
  } catch (e) {
    await deleteUser(cred.user).catch(() => {});
    throw e;
  } finally {
    await signOut(sa).catch(() => {});
  }
  return cred.user.uid;
}

/** Removes the student's profile, progress and attendance. (The login itself stays in Firebase Auth but can no longer open the app.) */
export async function removeStudent(uid, branch) {
  const snap = await getDocs(query(collection(db, 'attendance'), where('studentId', '==', uid), where('branch', '==', branch)));
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  await deleteDoc(doc(db, 'progress', uid)).catch(() => {});
  await deleteDoc(doc(db, 'users', uid));
}

export async function changePassword(current, next) {
  const u = auth.currentUser;
  if (!u) throw new Error('You are signed out. Please log in again.');
  await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, current));
  await updatePassword(u, next);
}

export function friendlyAuthError(e, ctx = 'login') {
  const c = e && e.code;
  if (!c) return (e && e.message) || 'Something went wrong. Please try again.';
  switch (c) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return ctx === 'password' ? 'Current password is incorrect.' : 'Incorrect ID/email or password.';
    case 'auth/email-already-in-use': return 'An account with this email already exists. Try logging in.';
    case 'auth/weak-password': return 'Password must be at least 6 characters.';
    case 'auth/invalid-email': return 'That email address is not valid.';
    case 'auth/too-many-requests': return 'Too many attempts. Wait a few minutes and try again.';
    case 'auth/network-request-failed': return 'No internet connection. Check your network and retry.';
    case 'auth/operation-not-allowed': return 'Email/Password sign-in is not enabled in Firebase Console.';
    case 'auth/requires-recent-login': return 'Please log out and log in again, then retry.';
    case 'permission-denied': return 'Not allowed. Check your Firestore rules.';
    default: return String(e.message || 'Something went wrong.').replace('Firebase: ', '');
  }
}
