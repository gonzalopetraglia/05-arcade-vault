"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type SessionUser = { name: string };

export type SavedScore = {
  game: string;
  score: number;
  name: string;
  at: number;
};

type SessionValue = {
  user: SessionUser | null;
  scores: SavedScore[];
  signIn: (name: string) => void;
  signOut: () => void;
  saveScore: (entry: { game: string; score: number; name: string }) => void;
};

const USER_KEY = "av_user";
const SCORES_KEY = "av_scores";

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [scores, setScores] = useState<SavedScore[]>([]);

  // Hydrate from localStorage only after mount: the first render must match
  // the server HTML (signed out, no scores).
  useEffect(() => {
    try {
      const rawUser = localStorage.getItem(USER_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading localStorage during render would break hydration; the mount-time cascade is intentional and runs once
      if (rawUser) setUser(JSON.parse(rawUser));
    } catch {}
    try {
      const rawScores = localStorage.getItem(SCORES_KEY);
      if (rawScores) setScores(JSON.parse(rawScores));
    } catch {}
  }, []);

  const signIn = (name: string) => {
    const next = { name: name.toUpperCase().slice(0, 10) };
    setUser(next);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(next));
    } catch {}
  };

  const signOut = () => {
    setUser(null);
    try {
      localStorage.removeItem(USER_KEY);
    } catch {}
  };

  const saveScore = (entry: { game: string; score: number; name: string }) => {
    const row: SavedScore = { ...entry, at: Date.now() };
    setScores((prev) => {
      const next = [...prev, row];
      try {
        localStorage.setItem(SCORES_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return (
    <SessionContext.Provider value={{ user, scores, signIn, signOut, saveScore }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return ctx;
}
