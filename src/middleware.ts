import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/user/") && !user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/host/") && !user) {
    return NextResponse.redirect(new URL("/auth/host/sign-in", request.url));
  }

  if (user && (pathname.startsWith("/user/") || pathname.startsWith("/host/"))) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !profile) {
      return NextResponse.rewrite(new URL("/not-found", request.url));
    }

    const expectedRole = pathname.startsWith("/host/") ? "host" : "user";
    if (profile.role !== expectedRole) {
      return NextResponse.redirect(new URL("/forbidden", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/user/:path*", "/host/:path*"],
};
