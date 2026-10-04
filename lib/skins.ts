/**
 * Base compartida de skins: ids, nombres y la forma de una paleta por esquema.
 *
 * Sin React ni "use client" a propósito: los motores de los juegos son
 * framework-free y también importan estos tipos. Cada juego define su propia
 * paleta en `lib/games/<name>/skins.ts`; aquí solo vive lo común, para que el
 * selector y el hook no tengan que conocer los colores de ningún juego.
 */

export type SkinId = "clasico" | "neon" | "retro";

export const SKIN_IDS: readonly SkinId[] = ["clasico", "neon", "retro"];

/** CLÁSICO es el aspecto que el juego tenía antes de existir las skins. */
export const DEFAULT_SKIN: SkinId = "clasico";

export const SKIN_LABELS: Record<SkinId, string> = {
  clasico: "CLÁSICO",
  neon: "NEON",
  retro: "RETRO",
};

export type Scheme = "light" | "dark";

/** Una skin define su paleta para cada esquema de color del sitio. */
export type SkinDef<P> = { light: P; dark: P };

export type SkinSet<P> = Record<SkinId, SkinDef<P>>;

/** Valida un valor leído de fuera (localStorage) antes de fiarse de él. */
export function isSkinId(value: unknown): value is SkinId {
  return typeof value === "string" && (SKIN_IDS as readonly string[]).includes(value);
}
