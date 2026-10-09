import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Proxy (antes "middleware"): corre antes de renderizar las rutas privadas.
 *
 * 1. Refresca la sesión de Supabase y reescribe las cookies.
 * 2. Si no hay usuario, redirige /panel/** a /acceso.
 *
 * La verificación de 2FA (AAL2) y del rol se hace además en el layout del
 * panel y, sobre todo, en la base de datos (RLS). El proxy es solo la primera
 * capa: nunca la única.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    // Sistema no configurado en este entorno: el panel y el acceso no están disponibles.
    return NextResponse.redirect(new URL("/", request.url));
  }

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // getClaims valida la firma del JWT; no confiar en getSession() en el servidor.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);

  if (!isAuthenticated && request.nextUrl.pathname.startsWith("/panel")) {
    const loginUrl = new URL("/acceso", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Las páginas privadas no se guardan en cachés intermedias.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/panel/:path*", "/acceso/:path*", "/auth/:path*"],
};
