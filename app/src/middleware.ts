import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/linkedin",  // LinkedIn OAuth redirect + callback
  "/api/slack",          // Slack interactive actions
  "/api/publish",        // QStash publish callbacks (verify via QStash signature)
  "/api/cron",           // Vercel Cron (verify via CRON_SECRET)
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths and static assets
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const session = req.cookies.get("session")?.value;
  if (!session || session !== process.env.APP_PASSWORD) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icon-).*)"],
};
