// ⚠️ NUNCA importes este archivo desde un componente cliente ("use client").
// Contiene la clave secreta de Supabase, que salta la RLS por completo. Solo
// puede usarse desde Route Handlers, y únicamente para el `INSERT` de
// puntuaciones: leer con esta clave dejaría la RLS sin ejercitar y convertiría
// cualquier error del handler en una fuga completa de datos.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente de servicio de Supabase. Salta la RLS.
 *
 * `persistSession: false` porque en el servidor no hay sesión de usuario que
 * guardar: cada request crea el cliente, lo usa y lo tira.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false } },
  );
}
