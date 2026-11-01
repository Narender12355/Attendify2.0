import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase.js';
import { uid } from '../lib/utils.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

/**
 * Tracks the Firebase user and their profile document (users/{uid}), which holds
 * the role (student | teacher), name, college ID and semester.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);       // undefined = still checking
  const [profile, setProfile] = useState(undefined); // undefined = loading, null = no profile
  const [missing, setMissing] = useState(false);

  useEffect(() => onAuthStateChanged(auth, u => {
    setUser(u);
    setMissing(false);
    setProfile(u ? undefined : null);
  }), []);

  useEffect(() => {
    if (!user) return undefined;
    let timer;
    const off = onSnapshot(doc(db, 'users', user.uid), snap => {
      clearTimeout(timer);
      if (snap.exists()) { setProfile({ id: snap.id, ...snap.data() }); setMissing(false); }
      else { setProfile(null); timer = setTimeout(() => setMissing(true), 1800); } // short grace period while a new teacher profile is written
    }, () => { setProfile(null); setMissing(true); });
    return () => { off(); clearTimeout(timer); };
  }, [user && user.uid]);

  const loading = user === undefined || (!!user && profile === undefined) || (!!user && profile === null && !missing);
  const value = useMemo(() => ({ user, profile, missing, loading, logout: () => signOut(auth) }), [user, profile, missing, loading]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
