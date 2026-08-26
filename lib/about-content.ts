export type HighlightIconKind = "HEART" | "BROWSER" | "PLANT";

export type AboutHighlight = {
  icon: HighlightIconKind;
  text: string;
  color: "cyan" | "magenta" | "green";
};

export type ContactTip = {
  text: string;
  led: "green" | "yellow" | "magenta";
};

export const ABOUT_MISSION =
  "ARCADE VAULT nació del amor por los videojuegos clásicos. Nuestra misión es preservar y celebrar los arcades que definieron una generación, haciéndolos accesibles para todos, en cualquier lugar y sin costo.";

export const ABOUT_HIGHLIGHTS: AboutHighlight[] = [
  { icon: "HEART", text: "HECHO CON ❤️ PARA JUGADORES", color: "magenta" },
  {
    icon: "BROWSER",
    text: "JUEGOS EN HTML — CORREN EN CUALQUIER NAVEGADOR",
    color: "cyan",
  },
  { icon: "PLANT", text: "PROYECTO EN CONSTANTE CRECIMIENTO", color: "green" },
];

export const ABOUT_TIPS: ContactTip[] = [
  { text: "RESPUESTA EN 24-48H", led: "green" },
  { text: "SUGERENCIAS BIENVENIDAS", led: "yellow" },
  { text: "SIN SPAM, JAMÁS", led: "magenta" },
];
