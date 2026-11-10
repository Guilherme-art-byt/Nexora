import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { publicRoutes, routes } from '@/lib/routes';
import type { Database } from '@/lib/supabase/database.types';

/**
 * Renova a sessão (cookies) a cada navegação e faz o redirecionamento otimista:
 * sem sessão → boas-vindas; com sessão em tela pública → conversas.
 * A proteção real dos dados é a RLS no banco.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims);
  const { pathname } = request.nextUrl;
  const isPublic = publicRoutes.includes(pathname);

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = '';
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  };

  if (!isAuthenticated && !isPublic) {
    return redirectTo(routes.welcome);
  }
  if (isAuthenticated && isPublic) {
    return redirectTo(routes.conversations);
  }
  return response;
}

export const config = {
  matcher: [
    // Tudo, exceto arquivos estáticos e internos do Next.
    '/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
};
