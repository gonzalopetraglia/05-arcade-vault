/**
 * Constantes del tema que también necesita el layout (Server Component). Viven
 * fuera de `lib/theme.ts` porque ese módulo es "use client": importado desde
 * el servidor solo entregaría una referencia de cliente, no el string.
 */

export const STORAGE_KEY = "av_theme";
export const DARK_QUERY = "(prefers-color-scheme: dark)";

/**
 * Se ejecuta en `<head>` antes de que React hidrate. Sin él la página
 * pintaría oscura y saltaría a clara un instante después (flash). Sin
 * preferencia guardada manda el sistema.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(t!=="light"&&t!=="dark")t=matchMedia("${DARK_QUERY}").matches?"dark":"light";document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme="dark";}})();`;
