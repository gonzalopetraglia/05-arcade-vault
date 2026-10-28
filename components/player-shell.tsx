"use client";

import Link from "next/link";
import {
  Profiler,
  memo,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useSession } from "@/components/session-provider";
import { SkinSelector } from "@/components/skin-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import { TouchGamepad, type GamepadConfig } from "@/components/touch-gamepad";
import type { Game } from "@/lib/games";
import { onPerfRender, perfEnabled } from "@/lib/perf";
import { useCoarsePointer } from "@/lib/use-coarse-pointer";
import type { SkinId } from "@/lib/skins";

export type HudValues = { score: number; lives: number; level: number };

/** Lo que el player recibe en `hudRef.current` para empujar valores al HUD. */
export type HudHandle = { set(v: HudValues): void };

type Props = {
  game: Game;
  /** Valores del HUD por props, para los juegos que aún no usan `hudRef`. */
  score?: number;
  lives?: number;
  level?: number;
  /** Si llega, el HUD se alimenta por aquí y se ignoran score/lives/level. */
  hudRef?: RefObject<HudHandle | null>;
  /** Puntuación del modal de fin de partida; si falta, se usa `score`. */
  finalScore?: number;
  paused: boolean;
  over: boolean;
  onTogglePause: () => void;
  onEnd: () => void;
  onRestart: () => void;
  /**
   * Skin activa y su setter. Opcionales: el selector solo aparece si llegan
   * las dos, así los juegos sin skins se ven exactamente como antes. El shell
   * nunca ve la paleta; eso es cosa del player.
   */
  skin?: SkinId;
  onSkinChange?: (id: SkinId) => void;
  /** Mando táctil. Si falta, el layout táctil no se activa y el juego se ve como hoy. */
  gamepad?: GamepadConfig;
  /** Lo que se ve dentro de la pantalla del CRT. */
  children: ReactNode;
};

/**
 * <Profiler> de `lib/perf.ts`, solo en desarrollo con ?perf=1; si no, los hijos
 * tal cual. Nunca anidar dos: el `onRender` de fuera también se dispararía con
 * los renders de dentro, y "shell" contaría los del HUD.
 */
function Probe({ id, children }: { id: string; children: ReactNode }) {
  if (!perfEnabled()) return children;
  return (
    <Profiler id={id} onRender={onPerfRender}>
      {children}
    </Profiler>
  );
}

/**
 * Reparto de `hudRef.set` entre las dos instancias de `HudStats` (cabecera y
 * menú de pausa). Guarda el último valor: el menú de pausa se monta después y
 * tiene que nacer con la partida tal como está.
 */
type HudHub = { last: HudValues; subs: Set<(v: HudValues) => void> };

const HUD_START: HudValues = { score: 0, lives: 0, level: 1 };

/**
 * Puntuación, vidas y nivel, con estado propio: un punto re-renderiza solo
 * esto, no el shell, el mando ni la pantalla del juego. Con `hub` escucha lo
 * que el player empuja por `hudRef`; sin él, pinta las props tal cual.
 */
const HudStats = memo(function HudStats({
  hub,
  score,
  lives,
  level,
  name,
  className,
}: {
  hub?: HudHub;
  score?: number;
  lives?: number;
  level?: number;
  /** Solo la cabecera muestra al jugador; el menú de pausa no. */
  name?: string;
  /** La cabecera va sin clase, en fila; el menú de pausa trae la suya. */
  className?: string;
}) {
  const [pushed, setPushed] = useState<HudValues>(() => hub?.last ?? HUD_START);

  // Layout y no pasivo: el motor emite su primer estado en el efecto pasivo
  // del canvas, y para entonces la suscripción ya tiene que existir.
  useLayoutEffect(() => {
    if (!hub) return;
    hub.subs.add(setPushed);
    return () => {
      hub.subs.delete(setPushed);
    };
  }, [hub]);

  const v = hub ? pushed : { score: score ?? 0, lives: lives ?? 0, level: level ?? 1 };

  return (
    <div
      className={className}
      style={className ? undefined : { display: "flex", gap: 24, flexWrap: "wrap" }}
    >
      {name !== undefined && (
        <div className="hud-stat">
          <div className="l">Jugador</div>
          <div className="v" style={{ color: "var(--ink)" }}>
            {name}
          </div>
        </div>
      )}
      <div className="hud-stat">
        <div className="l">Puntuación</div>
        <div className="v">{v.score.toLocaleString("es-ES")}</div>
      </div>
      <div className="hud-stat lives">
        <div className="l">Vidas</div>
        <div className="v">{"♥ ".repeat(v.lives).trim() || "—"}</div>
      </div>
      <div className="hud-stat level">
        <div className="l">Nivel</div>
        <div className="v">{String(v.level).padStart(2, "0")}</div>
      </div>
    </div>
  );
});

/**
 * Envoltorio común a todos los players: cabecera de HUD, marco CRT, botones,
 * cartel de pausa y modal de fin de partida con guardado. Cada juego pone
 * dentro su pantalla y le pasa sus valores; el shell nunca calcula la
 * puntuación ni el nivel por su cuenta.
 */
export function PlayerShell({
  game,
  score,
  lives,
  level,
  hudRef,
  finalScore,
  paused,
  over,
  onTogglePause,
  onEnd,
  onRestart,
  skin,
  onSkinChange,
  gamepad,
  children,
}: Props) {
  const { user, saveScore } = useSession();
  const coarse = useCoarsePointer();
  const touch = coarse && gamepad !== undefined;
  const playerRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  // Solo cuenta en táctil: hasta el primer toque el motor espera en pausa.
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // null means "not edited yet": fall back to the session name, which only
  // becomes known after the provider hydrates from localStorage.
  const [typedName, setTypedName] = useState<string | null>(null);

  const name = typedName ?? user?.name ?? "INVITADO";

  // Solo existe si el player usa `hudRef`: sin él, HudStats pinta las props.
  const [hub] = useState<HudHub | undefined>(() =>
    hudRef ? { last: HUD_START, subs: new Set() } : undefined,
  );
  useImperativeHandle(
    hudRef,
    () => ({
      set(v: HudValues) {
        // Los motores también avisan cuando solo cambia su `status` (muerte,
        // respawn): con los mismos tres números el HUD no tiene nada que pintar.
        if (!hub) return;
        const { last } = hub;
        if (v.score === last.score && v.lives === last.lives && v.level === last.level) return;
        hub.last = v;
        hub.subs.forEach((sub) => sub(v));
      },
    }),
    [hub],
  );
  const hudProps = hub ? { hub } : { score, lives, level };
  const endScore = finalScore ?? score ?? 0;

  // Con el mando en pantalla, un dedo que se sale de un botón haría scroll,
  // zoom o pull-to-refresh. La clase va en <html> porque es quien hace scroll;
  // se retira al desmontar, así SALIR devuelve la página a la normalidad.
  useEffect(() => {
    if (!touch) return;
    const root = document.documentElement;
    root.classList.add("av-touch-lock");
    return () => root.classList.remove("av-touch-lock");
  }, [touch]);

  // Por ref, como los callbacks de los canvas: un player que aún no lo tenga
  // estable lo cambia de identidad al pausar, y los efectos de abajo se
  // desuscribirían y volverían a suscribir por eso.
  const togglePauseRef = useRef(onTogglePause);
  useEffect(() => {
    togglePauseRef.current = onTogglePause;
  });

  // En móvil el juego arrancaría mientras el jugador aún hace scroll o mira
  // el mando: hasta el primer toque el motor se pausa, sin tocar su `start()`.
  // Sin ref de "ya pausado": el doble montaje de desarrollo crea un segundo
  // motor que también hay que pausar, y la condición basta para no repetir
  // (en cuanto `paused` es true, o el jugador ya tocó, no hace nada).
  useEffect(() => {
    if (touch && !started && !paused) togglePauseRef.current();
  }, [touch, started, paused]);

  const start = () => {
    setStarted(true);
    if (paused) onTogglePause();
  };

  const waiting = touch && !started;

  // Girar el móvil recoloca la pantalla y el mando bajo los dedos: se pausa
  // para que el jugador no pierda una vida mientras se reubica.
  useEffect(() => {
    if (!touch) return;
    const mql = window.matchMedia("(orientation: portrait)");
    const onRotate = () => {
      if (!paused && !over && started) togglePauseRef.current();
    };
    mql.addEventListener("change", onRotate);
    return () => mql.removeEventListener("change", onRotate);
  }, [touch, paused, over, started]);

  // El estado sale del evento y no del clic: el jugador también sale de
  // pantalla completa con el gesto o el botón atrás del sistema.
  useEffect(() => {
    if (!touch) return;
    const sync = () => setFullscreen(document.fullscreenElement === playerRef.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, [touch]);

  // iPhone no tiene Fullscreen API fuera de <video>: allí el icono no existe.
  // Solo se lee con `touch`, que en el servidor y al hidratar es falso.
  const canFullscreen = touch && document.fullscreenEnabled;

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void playerRef.current?.requestFullscreen();
  };

  const restart = () => {
    setSaved(false);
    setSaveError(null);
    onRestart();
  };

  /** Mensajes de la API traducidos a algo que el jugador pueda leer. */
  const SAVE_ERRORS: Record<string, string> = {
    INVALID_BODY: "NOMBRE O PUNTUACIÓN NO VÁLIDOS",
    UNKNOWN_GAME: "ESTE JUEGO NO EXISTE EN EL VAULT",
    RATE_LIMITED: "DEMASIADOS INTENTOS · ESPERA UN MINUTO",
    DB_ERROR: "NO SE PUDO GUARDAR · REINTENTA",
  };

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    const result = await saveScore({ game: game.id, score: endScore, name });
    setSaving(false);
    // Solo se marca como guardada si el servidor lo confirma: cerrar el modal
    // con la puntuación perdida sería mentirle al jugador.
    if (result.ok) setSaved(true);
    else setSaveError(SAVE_ERRORS[result.error] ?? SAVE_ERRORS.DB_ERROR);
  };

  return (
    <div
      ref={playerRef}
      className={gamepad ? "av-player has-gamepad fade-in" : "av-player fade-in"}
    >
      <div className="player-hud">
        <Probe id="hud">
          <HudStats {...hudProps} name={name} />
        </Probe>
        <Probe id="shell">
          {/* En táctil el HUD está oculto y el selector vive en el menú de pausa;
            uno solo en el DOM para no repetir el id de su etiqueta. */}
          {skin && onSkinChange && !touch && <SkinSelector value={skin} onChange={onSkinChange} />}
          <div className="hud-actions">
            <button className="btn yellow" onClick={onTogglePause}>
              {paused ? "REANUDAR" : "PAUSA"}
            </button>
            <button className="btn magenta" onClick={onEnd}>
              FIN
            </button>
            <Link className="btn ghost" href={`/games/${game.id}`}>
              SALIR
            </Link>
          </div>
        </Probe>
      </div>

      <div className="crt">
        <div className="crt-screen">
          <Probe id="screen">{children}</Probe>
          {/* Sin HUD en táctil, pausa y pantalla completa viven sobre la
              pantalla, en la esquina donde el mando no llega. */}
          {/* Mientras espera el primer toque los iconos no salen: ⏸
              reanudaría el motor por debajo del cartel. */}
          {touch && !waiting && (
            <div className="screen-icons">
              <button
                type="button"
                className="screen-icon"
                aria-label={paused ? "Reanudar" : "Pausa"}
                onClick={onTogglePause}
              >
                <svg viewBox="0 0 16 16" aria-hidden>
                  <rect x="3" y="2" width="3.5" height="12" />
                  <rect x="9.5" y="2" width="3.5" height="12" />
                </svg>
              </button>
              {canFullscreen && (
                <button
                  type="button"
                  className="screen-icon"
                  aria-label={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                  onClick={toggleFullscreen}
                >
                  <svg viewBox="0 0 16 16" aria-hidden>
                    {fullscreen ? (
                      <path d="M6 1v5H1M10 1v5h5M6 15v-5H1M10 15v-5h5" />
                    ) : (
                      <path d="M1 6V1h5M15 6V1h-5M1 10v5h5M15 10v5h-5" />
                    )}
                  </svg>
                </button>
              )}
            </div>
          )}
          {waiting && (
            <button type="button" className="crt-content tap-to-start" onClick={start}>
              <span className="pixel neon-cyan tap-to-start-label">TOCA PARA EMPEZAR</span>
            </button>
          )}
          {paused && touch && !waiting && (
            // Sin HUD, la pausa es el único sitio donde ver la partida y salir.
            <div className="crt-content pause-menu" style={{ zIndex: 5 }}>
              <div className="pause-menu-inner">
                <div className="pixel neon-yellow pause-menu-title">EN PAUSA</div>
                <Probe id="hud">
                  <HudStats {...hudProps} className="pause-menu-stats" />
                </Probe>
                {/* La nav queda tapada en táctil: el tema se cambia aquí. La
                    skin solo si el juego tiene skins. */}
                <div className="pause-menu-settings">
                  {skin && onSkinChange && <SkinSelector value={skin} onChange={onSkinChange} />}
                  <ThemeToggle />
                </div>
                <div className="pause-menu-actions">
                  <button className="btn yellow" onClick={onTogglePause}>
                    REANUDAR
                  </button>
                  <button className="btn magenta" onClick={onEnd}>
                    FIN
                  </button>
                  <Link className="btn ghost" href={`/games/${game.id}`}>
                    SALIR
                  </Link>
                </div>
              </div>
            </div>
          )}
          {paused && !touch && (
            <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <Probe id="shell">
          <div className="crt-bottom">
            <span className="led">SEÑAL OK</span>
            <span>{game.title} · CRT-83 · 60 HZ</span>
            <span>CARGA · 1MB</span>
          </div>
        </Probe>
      </div>

      {/* Siempre en el DOM; el CSS solo lo enseña con puntero grueso, así el
          HTML del servidor ya trae el layout correcto y no hay salto. */}
      {gamepad && (
        <Probe id="gamepad">
          <TouchGamepad config={gamepad} />
        </Probe>
      )}

      <Probe id="shell">
        {over && (
          <div className="modal-bd">
            <div className="modal">
              <h2>FIN DEL JUEGO</h2>
              <div className="final-label">PUNTUACIÓN FINAL</div>
              <div className="final">{endScore.toLocaleString("es-ES")}</div>
              {!saved ? (
                <>
                  <div className="input-row">
                    <input
                      value={name}
                      onChange={(e) => setTypedName(e.target.value.toUpperCase().slice(0, 10))}
                      placeholder="TUS INICIALES"
                      disabled={saving}
                    />
                    <button className="btn yellow" onClick={save} disabled={saving}>
                      {saving ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
                    </button>
                  </div>
                  {saveError && <div className="toast-error">▸ {saveError}</div>}
                </>
              ) : (
                <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
              )}
              <div className="actions">
                <button className="btn" onClick={restart}>
                  JUGAR DE NUEVO
                </button>
                <Link className="btn magenta" href="/games">
                  VOLVER AL VAULT
                </Link>
              </div>
            </div>
          </div>
        )}
      </Probe>
    </div>
  );
}
