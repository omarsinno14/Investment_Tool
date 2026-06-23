/**
 * email.ts — email transport (Phase 11).
 *
 * Transport resolution order:
 *   1. Replit Resend connector / RESEND_API_KEY  → real delivery via Resend REST API
 *   2. no key configured                          → dev fallback that logs the email
 *
 * This module never throws to its callers — a failed email must never break the
 * underlying user action (register / reset / verify / etc).
 */
import { logger } from "./logger.js";

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function getApiKey(): string | undefined {
  return process.env.RESEND_API_KEY || process.env.RESEND_KEY || undefined;
}

function getFrom(): string {
  return process.env.EMAIL_FROM || "Vertica <onboarding@resend.dev>";
}

export function emailConfigured(): boolean {
  return Boolean(getApiKey());
}

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const apiKey = getApiKey();
  const to = Array.isArray(input.to) ? input.to : [input.to];

  if (!apiKey) {
    logger.info(
      { to, subject: input.subject },
      "[email] no RESEND_API_KEY configured — logging instead of sending",
    );
    return false;
  }

  try {
    const resp = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getFrom(),
        to,
        subject: input.subject,
        ...(input.html ? { html: input.html } : {}),
        ...(input.text ? { text: input.text } : {}),
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });

    if (!resp.ok) {
      const detail = await resp.text().catch(() => "");
      logger.error(
        { to, subject: input.subject, status: resp.status, detail },
        "[email] Resend API returned an error",
      );
      return false;
    }
    logger.info({ to, subject: input.subject }, "[email] sent");
    return true;
  } catch (e) {
    logger.error({ err: e, to, subject: input.subject }, "[email] send failed");
    return false;
  }
}

/** Comma-separated list of admin notification recipients. */
export function adminRecipients(): string[] {
  return (process.env.ADMIN_EMAILS || process.env.SUPPORT_EMAIL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
