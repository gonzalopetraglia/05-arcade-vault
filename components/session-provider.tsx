"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { PostScoreResponse } from "@/app/api/scores/route";

export type SessionUser = { name: string };

type SessionValue = {
  user: SessionUser | null;
  signIn: (name: string) => void;
  signOut: () => void;
  /**
   * Guarda la puntuación en la base a través de POST /api/scores.
   *
   * Devuelve la respuesta del servidor en vez de tragársela: quien llama
   * necesita saber si falló para no decirle al jugador que su marca está en el
   * salón cuando no ha llegado.
   */
  saveScore: (entry: { game: string; score: number; name: string }) => Promise<PostScoreResponse>;
};

const USER_KEY = "av_user";

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);

  // Hydrate from localStorage only after mount: the first render must match
  // the server HTML (signed out).
  useEffect(() => {
    try {
      const rawUser = localStorage.getItem(USER_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading localStorage during render would break hydration; the mount-time cascade is intentional and runs once
      if (rawUser) setUser(JSON.parse(rawUser));
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

  // Nada de localStorage aquí: con dos fuentes, el salón y el navegador
  // divergirían al primer fallo de red y no habría forma de saber cuál vale.
  const saveScore = async (entry: {
    game: string;
    score: number;
    name: string;
  }): Promise<PostScoreResponse> => {
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      return (await res.json()) as PostScoreResponse;
    } catch {
      // Red caída o respuesta ilegible: para quien llama es indistinguible de
      // un fallo del servidor, y lo que importa es que no se guardó.
      return { ok: false, error: "DB_ERROR" };
    }
  };

  return (
    <SessionContext.Provider value={{ user, signIn, signOut, saveScore }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession debe usarse dentro de <SessionProvider>");
  return ctx;
}
