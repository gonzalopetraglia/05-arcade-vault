import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Cliente de Supabase para Server Components y Route Handlers.
 *
 * Crea uno por request: nunca guardes el resultado en una variable de módulo,
 * porque el almacén de cookies pertenece a la request en curso.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Escribir cookies desde un Server Component lanza siempre.
            // Se ignora a propósito: el proxy ya refresca la sesión.
          }
        },
      },
    },
  );
}
