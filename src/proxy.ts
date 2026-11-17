/**
 * Optimistic gate: protected areas need a validly signed session cookie.
 * Role checks are NOT done here — roles change (e.g. KYC promotes a customer to associate)
 * and the DB-backed DAL (src/lib/auth/dal.ts) is the single source of truth.
 */
import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE } from "@/lib/auth/token";

export default async function proxy(req: NextRequest) {
  const session = await readSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/partner/:path*", "/supplier/:path*", "/account/:path*"],
};
