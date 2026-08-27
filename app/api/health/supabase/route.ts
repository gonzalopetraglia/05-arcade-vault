import { createClient } from "@/lib/supabase/server";

export type SupabaseHealth =
  | { ok: true; url: string; authService: "up"; claims: "none" | "present" }
  | { ok: false; error: "NOT_CONFIGURED" | "UNREACHABLE" };

function json(body: SupabaseHealth, status: number) {
  return Response.json(body, { status });
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    console.error(
      "[health/supabase] Faltan variables de entorno: " +
        [!url && "NEXT_PUBLIC_SUPABASE_URL", !key && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]
          .filter(Boolean)
          .join(", "),
    );
    return json({ ok: false, error: "NOT_CONFIGURED" }, 500);
  }

  try {
    const response = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key },
    });

    if (!response.ok) {
      console.error(
        `[health/supabase] /auth/v1/health respondió ${response.status}:`,
        await response.text(),
      );
      return json({ ok: false, error: "UNREACHABLE" }, 502);
    }
  } catch (cause) {
    console.error("[health/supabase] No se pudo alcanzar el proyecto:", cause);
    return json({ ok: false, error: "UNREACHABLE" }, 502);
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();

    // El cuerpo nunca incluye la clave: solo el host del proyecto.
    return json(
      {
        ok: true,
        url,
        authService: "up",
        claims: data?.claims ? "present" : "none",
      },
      200,
    );
  } catch (cause) {
    console.error("[health/supabase] Falló el cliente de servidor:", cause);
    return json({ ok: false, error: "UNREACHABLE" }, 502);
  }
}
