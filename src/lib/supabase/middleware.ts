import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Pages accessibles sans être connecté. */
const PUBLIC_PATHS = ["/", "/connexion", "/inscription", "/auth"];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || (p !== "/" && pathname.startsWith(`${p}/`)));
}

/** Rafraîchit la session Supabase à chaque requête et protège les pages privées. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && (pathname === "/connexion" || pathname === "/inscription")) {
    const url = request.nextUrl.clone();
    url.pathname = "/tableau-de-bord";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
