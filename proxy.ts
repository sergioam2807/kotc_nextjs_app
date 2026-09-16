import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Rutas accesibles sin sesión.
 *
 * Se comparan exactas a propósito. El bug anterior: `'/'` estaba en la lista y
 * la comparación era `pathname.startsWith(p)` — `startsWith('/')` es verdadero
 * para CUALQUIER ruta, así que toda la app quedaba pública y el redirect de
 * abajo era código muerto.
 */
const PUBLICAS_EXACTAS = new Set([
  '/',            // landing
  '/planes',      // precios + FAQ
  '/login',
  '/register',
  '/onboarding',
]);

/** Rutas públicas con parámetros. Acá sí hace falta comparar por prefijo. */
const PUBLICAS_PREFIJO = [
  '/auth/',       // callback de OAuth
  '/join/',       // aceptar invitación por token (llega antes de tener cuenta)
];

function esPublica(pathname: string): boolean {
  if (PUBLICAS_EXACTAS.has(pathname)) return true;
  return PUBLICAS_PREFIJO.some(prefijo => pathname.startsWith(prefijo));
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Las rutas de API no se redirigen: cada handler ya responde 401 en JSON.
  // Un redirect acá le devolvería HTML a un `fetch()` y el cliente fallaría al
  // parsear, escondiendo el error real detrás de un problema de sintaxis.
  const esApi = pathname.startsWith('/api/');

  if (!user && !esApi && !esPublica(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === '/login' || pathname === '/register')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
