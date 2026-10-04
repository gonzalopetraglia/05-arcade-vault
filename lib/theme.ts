"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Scheme } from "@/lib/skins";
import { DARK_QUERY, STORAGE_KEY } from "@/lib/theme-script";

/**
 * Tema claro/oscuro del sitio. La fuente de verdad es el atributo
 * `data-theme` de `<html>`: lo pone `THEME_SCRIPT` antes del primer pintado
 * (ver `lib/theme-script.ts`) y lo cambia `setTheme`. Todo lo demás (CSS,
 * canvas de los juegos) solo lo lee.
 */

const listeners = new Set<() => void>();

function hasStoredPreference(): boolean {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    return t === "light" || t === "dark";
  } catch {
    return false;
  }
}

function apply(theme: Scheme) {
  document.documentElement.dataset.theme = theme;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Mientras el usuario no haya elegido, el sitio sigue al sistema en vivo.
  const mql = window.matchMedia(DARK_QUERY);
  const onSystem = () => {
    if (!hasStoredPreference()) apply(mql.matches ? "dark" : "light");
  };
  // Otra pestaña cambió el tema: se replica aquí.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    if (e.newValue === "light" || e.newValue === "dark") apply(e.newValue);
    else onSystem();
  };
  mql.addEventListener("change", onSystem);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    mql.removeEventListener("change", onSystem);
    window.removeEventListener("storage", onStorage);
  };
}

function read(): Scheme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/** El sitio nació oscuro: es lo que asume el HTML del servidor. */
const serverRead = (): Scheme => "dark";

export function useTheme(): { theme: Scheme; setTheme: (next: Scheme) => void } {
  const theme = useSyncExternalStore(subscribe, read, serverRead);

  const setTheme = useCallback((next: Scheme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    apply(next);
  }, []);

  return { theme, setTheme };
}
