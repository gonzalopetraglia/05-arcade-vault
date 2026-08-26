import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca el token de sesión y reescribe las cookies en la respuesta.
 *
 * Solo refresca: no redirige a nadie ni protege ninguna ruta.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: no escribas código entre `createServerClient` y `getClaims()`.
  // Un fallo sutil aquí hace muy difícil depurar sesiones que se cierran solas.
  // Nunca uses `getSession()` en código de servidor: no garantiza revalidar el token.
  await supabase.auth.getClaims();

  // IMPORTANTE: devuelve `supabaseResponse` tal cual. Si creas una respuesta
  // nueva, cópiale antes las cookies o el navegador y el servidor dejarán de
  // estar sincronizados y la sesión se cortará antes de tiempo.
  return supabaseResponse;
}
