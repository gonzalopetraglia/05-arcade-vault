"use client";

import { useCallback, useSyncExternalStore } from "react";

export type LibraryViewMode = "grid" | "table";

const KEY = "av_games_view";
const DEFAULT: LibraryViewMode = "grid";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Otra pestaña cambiando la preferencia dispara `storage`; la propia pestaña
  // no lo recibe, y por eso `setView` avisa a mano.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): LibraryViewMode {
  try {
    return localStorage.getItem(KEY) === "table" ? "table" : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

/** En el HTML prerenderizado no hay localStorage: siempre la cuadrícula. */
function getServerSnapshot(): LibraryViewMode {
  return DEFAULT;
}

/**
 * Vista elegida para la biblioteca, recordada en `localStorage`.
 *
 * `useSyncExternalStore` en vez de leer en un efecto: React sabe que el primer
 * render debe usar el valor del servidor y aplicar el del navegador justo
 * después, sin parpadeo de hidratación ni setState dentro de un efecto.
 */
export function useStoredView(): [LibraryViewMode, (next: LibraryViewMode) => void] {
  const view = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setView = useCallback((next: LibraryViewMode) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    listeners.forEach((l) => l());
  }, []);

  return [view, setView];
}
