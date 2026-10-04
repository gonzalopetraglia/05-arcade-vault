"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(pointer: coarse)";

function subscribe(listener: () => void) {
  // Emular un móvil en DevTools, o acoplar un ratón a una tablet, cambia el
  // puntero principal sin recargar: el valor tiene que seguirlo en vivo.
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", listener);
  return () => mql.removeEventListener("change", listener);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

/** El servidor no sabe qué puntero hay: asume escritorio. */
const getServerSnapshot = (): boolean => false;

/**
 * Si el puntero principal es grueso (dedo). Solo activa comportamiento; el
 * layout táctil lo decide el CSS con `@media (pointer: coarse)`, para que el
 * primer render del servidor no muestre el HUD y luego salte.
 *
 * `useSyncExternalStore` en vez de leer en un efecto: el primer render usa
 * `false`, igual que el HTML del servidor, y el valor real llega justo después
 * sin aviso de hidratación.
 */
export function useCoarsePointer(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
