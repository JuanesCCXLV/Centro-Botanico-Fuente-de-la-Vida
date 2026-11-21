import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, RUTA_LOGIN } from "@/lib/sesion-constantes";

// Verificación OPTIMISTA: solo mira si existe la cookie, para redirigir rápido.
// La verificación real (token válido, no expirado, usuario activo) está en requireAdmin().
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === RUTA_LOGIN) return NextResponse.next();

  if (!request.cookies.has(COOKIE_SESION)) {
    return NextResponse.redirect(new URL(RUTA_LOGIN, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
