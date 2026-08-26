import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente de Supabase para componentes de navegador ("use client").
 *
 * `createBrowserClient` ya devuelve una instancia singleton, así que llamar a
 * esta función desde varios componentes no crea varios clientes.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
