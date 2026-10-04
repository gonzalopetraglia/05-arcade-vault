"use client";

import { useTheme } from "@/lib/theme";

/**
 * Interruptor claro/oscuro del nav. Es un switch y no un ciclo de tres
 * estados: "sistema" es solo el punto de partida hasta el primer clic.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const light = theme === "light";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={light}
      aria-label="Tema claro"
      title={light ? "Cambiar a tema oscuro" : "Cambiar a tema claro"}
      className="btn ghost theme-toggle"
      onClick={(e) => {
        setTheme(light ? "dark" : "light");
        // Igual que el selector de skin: tras un clic el foco vuelve a la
        // página para que espacio y flechas sigan siendo del juego.
        if (e.detail > 0) e.currentTarget.blur();
      }}
    >
      <span aria-hidden="true" className="theme-toggle-icon">
        {light ? "☀" : "☾"}
      </span>
      <span className="theme-toggle-text">{light ? "CLARO" : "OSCURO"}</span>
    </button>
  );
}
