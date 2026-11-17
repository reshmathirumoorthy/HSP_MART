/**
 * Data Access Layer: who is signed in, according to the backend. Proxy only does optimistic
 * redirects; the backend re-checks the session and role on every API call.
 */
import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { api, ApiError } from "@/lib/api";
import { homeFor, type Role } from "./token";

export type CurrentUser = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  role: Role;
  locale: "en" | "hi";
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  try {
    return await api.get<CurrentUser>("/auth/me");
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
});

export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

export async function requireRole(roles: Role[], next?: string): Promise<CurrentUser> {
  const user = await requireUser(next);
  if (!roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}
