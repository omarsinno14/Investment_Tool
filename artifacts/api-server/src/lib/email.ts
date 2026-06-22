/**
 * email.ts — email transport STUB (Phase 10).
 *
 * Real email transport (SMTP / provider integration) arrives in Phase 11.
 * For now this just logs the email that *would* be sent — NO SMTP, NO external
 * calls, NO new dependencies.
 */
import { logger } from "./logger.js";

export interface SendEmailInput {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  // Phase 11: replace this log with an actual transport (SMTP / provider).
  logger.info(
    { to: input.to, subject: input.subject },
    "[email stub] sendEmail called (no transport configured until Phase 11)",
  );
}
