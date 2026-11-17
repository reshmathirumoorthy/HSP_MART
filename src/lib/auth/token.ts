/** Signed session cookie (no DB access — safe to import from proxy.ts). */
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "hsp_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type Role =
  | "customer"
  | "associate"
  | "franchise"
  | "enterprise_partner"
  | "hsp_admin"
  | "hsp_finance"
  | "hsp_procurement"
  | "supplier";

export type SessionPayload = { sid: string; uid: string; role: Role };

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("SESSION_SECRET must be at least 32 characters");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload, expiresAt: Date) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(key());
}

export async function readSession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export const STAFF_ROLES: Role[] = ["hsp_admin", "hsp_finance", "hsp_procurement"];
export const PARTNER_ROLES: Role[] = ["associate", "franchise", "enterprise_partner"];

/** Where each role lands after sign-in, and which area prefix it may enter. */
export function homeFor(role: Role): string {
  if (STAFF_ROLES.includes(role)) return "/admin";
  if (PARTNER_ROLES.includes(role)) return "/partner";
  if (role === "supplier") return "/supplier";
  return "/account";
}

export function canEnter(role: Role, pathname: string): boolean {
  if (pathname.startsWith("/admin")) return STAFF_ROLES.includes(role);
  if (pathname.startsWith("/partner")) return PARTNER_ROLES.includes(role);
  if (pathname.startsWith("/supplier")) return role === "supplier";
  return true;
}
