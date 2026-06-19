import type { UserRole } from "@prisma/client";

export const SUPER_ADMIN_USERNAME = process.env.SUPER_ADMIN_USERNAME ?? "Omarsinno_";
export const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL ?? "O.sinno@outlook.com";

export function isAdmin(role?: UserRole | null) {
  return role === "ADMIN";
}

export function isSuperAdmin(profile?: { username?: string | null } | null) {
  return profile?.username === SUPER_ADMIN_USERNAME;
}
