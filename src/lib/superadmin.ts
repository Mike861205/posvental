import { cookies } from "next/headers";

export const SUPERADMIN_SESSION_COOKIE = "superadmin_session";

const FALLBACK_USER = "mike";
const FALLBACK_PASSWORD = "mike1986";
const FALLBACK_SESSION_TOKEN = "superadmin-session-mike";

export function getSuperadminUser() {
  return process.env.SUPERADMIN_USER ?? FALLBACK_USER;
}

export function getSuperadminPassword() {
  return process.env.SUPERADMIN_PASSWORD ?? FALLBACK_PASSWORD;
}

export function getSuperadminSessionToken() {
  return process.env.SUPERADMIN_SESSION_TOKEN ?? FALLBACK_SESSION_TOKEN;
}

export function isValidSuperadminCredentials(user: string, password: string) {
  return user === getSuperadminUser() && password === getSuperadminPassword();
}

export function isSuperadminSessionValue(value?: string) {
  if (!value) return false;
  return value === getSuperadminSessionToken();
}

export function isSuperadminSessionActive() {
  const value = cookies().get(SUPERADMIN_SESSION_COOKIE)?.value;
  return isSuperadminSessionValue(value);
}
