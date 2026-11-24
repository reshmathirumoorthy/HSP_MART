/**
 * Runs before every page request:
 * 1. Content Security Policy with a fresh nonce per request. Next.js reads the nonce from the request's CSP header and
 *    attaches it to its own scripts; scripts those load (e.g. Razorpay Checkout via next/script) are trusted through
 *    'strict-dynamic'. Inline <script> tags without the nonce cannot run.
 * 2. Optimistic sign-in gate: protected areas need a validly signed session cookie. Role checks are NOT done here —
 *    roles change (e.g. KYC promotes a customer to associate) and the DB-backed DAL (src/lib/auth/dal.ts) decides.
 */
import { NextResponse, type NextRequest } from "next/server";
import { readSession, SESSION_COOKIE } from "@/lib/auth/token";

const PROTECTED = ["/admin", "/partner", "/supplier", "/account"];

export function contentSecurityPolicy(nonce: string, dev = process.env.NODE_ENV === "development") {
  return [
    "default-src 'self'",
    // React's dev tooling needs eval; production never does.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // Components use React style={} attributes; scripts are the injection risk, not styles.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://images.unsplash.com",
    "font-src 'self'",
    "media-src 'self'",
    // Razorpay Checkout talks to its own API and logging endpoints.
    `connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com${dev ? " ws: http://localhost:*" : ""}`,
    "frame-src https://api.razorpay.com https://checkout.razorpay.com https://www.google.com https://maps.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const session = await readSession(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  // Every page; not the API (FastAPI sets its own headers), static assets, images or files in public/.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon|images|fonts|videos|animation|.*\\.[a-z0-9]+$).*)"],
};
