import type { ProfilerOnRenderCallback } from "react";

export type PerfSample = {
  /** Renders por id de <Profiler>: "shell", "hud", "screen", "gamepad". */
  renders: Record<string, number>;
  /** Duración de cada frame en ms, medida con un rAF propio (no el del motor). */
  frames: number[];
};

declare global {
  interface Window {
    __avPerf?: PerfSample & { reset(): void };
  }
}

// Una sesión de 20 s son ~1200 frames; el tope solo evita crecer sin fin si
// alguien deja la pestaña abierta con ?perf=1.
const MAX_FRAMES = 20_000;

let enabled: boolean | null = null;
// Varios <Profiler> con el mismo id (el shell está repartido en trozos, el HUD
// sale dos veces) se disparan en el mismo commit: cuentan una sola vez.
const lastCommit: Record<string, number> = {};

/** true solo con NODE_ENV !== "production" y ?perf=1 en la URL. */
export function perfEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (typeof window === "undefined") return false;
  if (enabled === null) {
    enabled = new URLSearchParams(window.location.search).get("perf") === "1";
    if (enabled) install();
  }
  return enabled;
}

/** Instala `window.__avPerf` y arranca el muestreo de frames, una vez. */
function install() {
  const sample: PerfSample & { reset(): void } = {
    renders: {},
    frames: [],
    reset() {
      sample.renders = {};
      sample.frames = [];
      for (const id in lastCommit) delete lastCommit[id];
    },
  };
  window.__avPerf = sample;

  // rAF propio e independiente del motor: mide lo que ve el jugador, sea cual
  // sea el juego, sin tocar ningún motor.
  let last = performance.now();
  const tick = (now: number) => {
    if (sample.frames.length < MAX_FRAMES) sample.frames.push(now - last);
    last = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** `onRender` común a todos los <Profiler> del shell. */
export const onPerfRender: ProfilerOnRenderCallback = (
  id,
  _phase,
  _actual,
  _base,
  _start,
  commitTime,
) => {
  const sample = window.__avPerf;
  if (!sample || lastCommit[id] === commitTime) return;
  lastCommit[id] = commitTime;
  sample.renders[id] = (sample.renders[id] ?? 0) + 1;
};
