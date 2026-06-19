import { logger } from "@/lib/logger";

export async function sendEmailConfirmation(params: { to: string; name?: string | null; token: string }) {
  const from = process.env.EMAIL_FROM ?? "noreply@vertica.com";
  logger.info({ ...params, from }, "Email confirmation placeholder send");
  return { queued: true };
}
