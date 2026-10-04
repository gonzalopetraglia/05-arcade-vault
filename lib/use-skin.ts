"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_SKIN, isSkinId, type Scheme, type SkinId } from "@/lib/skins";
import { useTheme } from "@/lib/theme";

const keyFor = (gameId: string) => `av_skin:${gameId}`;

// ── Skin guardada ─────────────────────────────────────────────────────────────

const skinListeners = new Set<() => void>();

// Respaldo para navegadores que bloquean localStorage (modo privado estricto):
// sin él, el selector no cambiaría nada porque la lectura siempre fallaría.
const memory = new Map<string, SkinId>();

function subscribeSkin(listener: () => void) {
  skinListeners.add(listener);
  // Otra pestaña cambiando la skin dispara `storage`; la propia pestaña no lo
  // recibe, y por eso `setSkin` avisa a mano.
  window.addEventListener("storage", listener);
  return () => {
    skinListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readSkin(gameId: string): SkinId {
  try {
    const raw = localStorage.getItem(keyFor(gameId));
    // Un valor viejo o manipulado a mano no debe dejar el juego sin paleta.
    if (isSkinId(raw)) return raw;
  } catch {}
  return memory.get(gameId) ?? DEFAULT_SKIN;
}

const serverSkin = (): SkinId => DEFAULT_SKIN;

/**
 * Skin elegida para un juego (recordada en `localStorage` como
 * `av_skin:<gameId>`) y el esquema claro/oscuro del sitio.
 *
 * `useSyncExternalStore` en vez de leer en un efecto, igual que
 * `useStoredView`: el primer render usa los valores del servidor (CLÁSICO y
 * oscuro) para que la hidratación cuadre, y justo después aplica los del
 * navegador, sin setState dentro de un efecto.
 */
export function useSkin(gameId: string): {
  skin: SkinId;
  setSkin: (next: SkinId) => void;
  scheme: Scheme;
} {
  const getSkin = useCallback(() => readSkin(gameId), [gameId]);
  const skin = useSyncExternalStore(subscribeSkin, getSkin, serverSkin);
  // El esquema es el tema del sitio (toggle del nav), no el del sistema: si
  // no, el canvas y la página podrían quedar uno claro y el otro oscuro.
  const { theme: scheme } = useTheme();

  const setSkin = useCallback(
    (next: SkinId) => {
      memory.set(gameId, next);
      try {
        localStorage.setItem(keyFor(gameId), next);
      } catch {}
      skinListeners.forEach((l) => l());
    },
    [gameId],
  );

  return { skin, setSkin, scheme };
}
