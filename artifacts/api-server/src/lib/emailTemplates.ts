/**
 * emailTemplates.ts — branded "Bourgeois Minimal" HTML email templates.
 *
 * Every template returns { subject, html, text }. The shared layout keeps the
 * palette consistent: Espresso ink on Cashmere/Cream surfaces with a Bronze
 * accent and an Olive primary action.
 */

const PALETTE = {
  espresso: "#15110D",
  cashmere: "#F4EFE6",
  cream: "#FFFDF8",
  taupe: "#D6C7B3",
  bronze: "#A7793D",
  olive: "#4F5D3B",
  dusty: "#A8A29E",
};

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const APP_NAME = "Vertica";

function appUrl(): string {
  return (
    process.env.WEB_APP_URL ||
    process.env.PUBLIC_WEB_URL ||
    "https://vertica.app"
  ).replace(/\/$/, "");
}

interface LayoutOpts {
  heading: string;
  intro?: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  footnote?: string;
}

function layout(opts: LayoutOpts): string {
  const { heading, intro, bodyHtml, cta, footnote } = opts;
  const ctaHtml = cta
    ? `<tr><td style="padding:8px 0 4px;">
         <a href="${cta.url}" style="display:inline-block;background:${PALETTE.olive};color:${PALETTE.cream};text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:10px;letter-spacing:.2px;">${cta.label}</a>
       </td></tr>`
    : "";
  const introHtml = intro
    ? `<p style="margin:0 0 18px;color:${PALETTE.espresso};font-size:15px;line-height:1.65;">${intro}</p>`
    : "";
  const footHtml = footnote
    ? `<p style="margin:18px 0 0;color:${PALETTE.dusty};font-size:12px;line-height:1.6;">${footnote}</p>`
    : "";

  return `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${PALETTE.cashmere};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PALETTE.cashmere};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${PALETTE.cream};border:1px solid ${PALETTE.taupe};border-radius:16px;overflow:hidden;">
        <tr><td style="padding:26px 32px 18px;border-bottom:1px solid ${PALETTE.taupe};">
          <span style="font-size:20px;font-weight:700;letter-spacing:3px;color:${PALETTE.espresso};text-transform:uppercase;">${APP_NAME}</span>
          <span style="display:block;margin-top:4px;color:${PALETTE.bronze};font-size:11px;letter-spacing:2px;text-transform:uppercase;">The Private Investment Network</span>
        </td></tr>
        <tr><td style="padding:30px 32px 32px;">
          <h1 style="margin:0 0 14px;color:${PALETTE.espresso};font-size:22px;font-weight:700;line-height:1.3;">${heading}</h1>
          ${introHtml}
          ${bodyHtml}
          <table role="presentation" cellpadding="0" cellspacing="0">${ctaHtml}</table>
          ${footHtml}
        </td></tr>
        <tr><td style="padding:18px 32px 26px;border-top:1px solid ${PALETTE.taupe};">
          <p style="margin:0;color:${PALETTE.dusty};font-size:11px;line-height:1.6;">
            ${APP_NAME} is a curated discovery, education and tracking network. Nothing here is financial advice and no returns are guaranteed.
            You are receiving this because you have an account at <a href="${appUrl()}" style="color:${PALETTE.bronze};text-decoration:none;">${appUrl().replace(/^https?:\/\//, "")}</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function welcomeEmail(name?: string | null): RenderedEmail {
  const subject = `Welcome to ${APP_NAME}`;
  const html = layout({
    heading: `Welcome${name ? `, ${name}` : ""}`,
    intro:
      "Your seat in the room is ready. Vertica is a private network for discovering, comparing and discussing curated investment opportunities.",
    bodyHtml: `
      <ul style="margin:0 0 20px;padding-left:18px;color:${PALETTE.espresso};font-size:14px;line-height:1.8;">
        <li>Browse curated opportunities and save the ones worth a closer look.</li>
        <li>Follow other investors and join public hubs to compare notes.</li>
        <li>Track a private watchlist and portfolio of what you hold.</li>
      </ul>`,
    cta: { label: "Open Vertica", url: appUrl() },
  });
  return { subject, html, text: stripHtml(html) };
}

export function verifyEmail(token: string): RenderedEmail {
  const url = `${appUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  const subject = `Confirm your ${APP_NAME} email`;
  const html = layout({
    heading: "Confirm your email",
    intro:
      "Confirm this address to secure your account and unlock alerts and digests.",
    bodyHtml: `<p style="margin:0 0 18px;color:${PALETTE.dusty};font-size:13px;line-height:1.6;">This link expires in 24 hours. If you did not create an account, you can ignore this message.</p>`,
    cta: { label: "Confirm email", url },
    footnote: `Or paste this link into your browser: ${url}`,
  });
  return { subject, html, text: `Confirm your email: ${url}` };
}

export function passwordResetEmail(token: string): RenderedEmail {
  const url = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const subject = `Reset your ${APP_NAME} password`;
  const html = layout({
    heading: "Reset your password",
    intro:
      "We received a request to reset your password. Use the button below to choose a new one.",
    bodyHtml: `<p style="margin:0 0 18px;color:${PALETTE.dusty};font-size:13px;line-height:1.6;">This link expires in 1 hour and can be used once. If you did not request this, no action is needed — your password stays the same.</p>`,
    cta: { label: "Choose a new password", url },
    footnote: `Or paste this link into your browser: ${url}`,
  });
  return { subject, html, text: `Reset your password: ${url}` };
}

export function dealAlertEmail(opts: {
  title: string;
  reason?: string;
  url: string;
}): RenderedEmail {
  const subject = `New opportunity: ${opts.title}`;
  const html = layout({
    heading: "A new opportunity matches your interests",
    intro: opts.reason || "Based on the categories you follow.",
    bodyHtml: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${PALETTE.taupe};border-radius:12px;margin:0 0 20px;">
        <tr><td style="padding:18px 20px;">
          <p style="margin:0 0 6px;color:${PALETTE.bronze};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">New listing</p>
          <p style="margin:0;color:${PALETTE.espresso};font-size:17px;font-weight:700;line-height:1.4;">${opts.title}</p>
        </td></tr>
      </table>`,
    cta: { label: "View opportunity", url: opts.url },
    footnote:
      "Projected figures are targets, not guarantees. Manage deal alerts in your notification settings.",
  });
  return { subject, html, text: `${opts.title} — ${opts.url}` };
}

export function weeklyDigestEmail(opts: {
  name?: string | null;
  unreadCount: number;
  weeklyCount: number;
  highlights?: { title: string; url: string }[];
}): RenderedEmail {
  const subject = `Your weekly ${APP_NAME} digest`;
  const items = (opts.highlights || [])
    .slice(0, 5)
    .map(
      (h) =>
        `<li style="margin:0 0 8px;"><a href="${h.url}" style="color:${PALETTE.olive};text-decoration:none;font-weight:600;">${h.title}</a></li>`,
    )
    .join("");
  const highlightsHtml = items
    ? `<p style="margin:0 0 8px;color:${PALETTE.espresso};font-size:14px;font-weight:600;">Worth a look this week</p>
       <ul style="margin:0 0 20px;padding-left:18px;font-size:14px;line-height:1.7;">${items}</ul>`
    : "";
  const html = layout({
    heading: `Your week on ${APP_NAME}`,
    intro: `${opts.weeklyCount} new update(s) and ${opts.unreadCount} unread notification(s) since you last checked in.`,
    bodyHtml: highlightsHtml,
    cta: { label: "Catch up now", url: appUrl() },
    footnote: "Manage digest frequency in your notification settings.",
  });
  return { subject, html, text: stripHtml(html) };
}

export function paymentReceiptEmail(opts: {
  tierLabel: string;
  amountLabel: string;
  reference?: string | null;
}): RenderedEmail {
  const subject = `Your ${APP_NAME} receipt`;
  const html = layout({
    heading: "Payment received",
    intro: `Thank you — your ${opts.tierLabel} membership is active.`,
    bodyHtml: `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${PALETTE.taupe};border-radius:12px;margin:0 0 20px;">
        <tr><td style="padding:8px 20px;border-bottom:1px solid ${PALETTE.taupe};color:${PALETTE.dusty};font-size:13px;">Plan</td><td style="padding:8px 20px;border-bottom:1px solid ${PALETTE.taupe};color:${PALETTE.espresso};font-size:14px;font-weight:600;text-align:right;">${opts.tierLabel}</td></tr>
        <tr><td style="padding:8px 20px;color:${PALETTE.dusty};font-size:13px;">Amount</td><td style="padding:8px 20px;color:${PALETTE.espresso};font-size:14px;font-weight:600;text-align:right;">${opts.amountLabel}</td></tr>
        ${opts.reference ? `<tr><td style="padding:8px 20px;border-top:1px solid ${PALETTE.taupe};color:${PALETTE.dusty};font-size:13px;">Reference</td><td style="padding:8px 20px;border-top:1px solid ${PALETTE.taupe};color:${PALETTE.espresso};font-size:13px;text-align:right;">${opts.reference}</td></tr>` : ""}
      </table>`,
    cta: { label: "Manage membership", url: `${appUrl()}/settings/billing` },
  });
  return { subject, html, text: stripHtml(html) };
}

export function verificationStatusEmail(opts: {
  approved: boolean;
  subject: string;
  note?: string | null;
}): RenderedEmail {
  const subject = opts.approved
    ? `Your ${opts.subject} was approved`
    : `Update on your ${opts.subject}`;
  const html = layout({
    heading: opts.approved ? "Verification approved" : "Verification update",
    intro: opts.approved
      ? `Your ${opts.subject} has been approved. The corresponding badge is now active on your profile.`
      : `Your ${opts.subject} could not be approved at this time.`,
    bodyHtml: opts.note
      ? `<p style="margin:0 0 18px;color:${PALETTE.espresso};font-size:14px;line-height:1.6;">${opts.note}</p>`
      : "",
    cta: { label: "View your profile", url: `${appUrl()}/profile` },
  });
  return { subject, html, text: stripHtml(html) };
}

export function adminNotificationEmail(opts: {
  title: string;
  message: string;
  url?: string;
}): RenderedEmail {
  const html = layout({
    heading: opts.title,
    bodyHtml: `<p style="margin:0 0 18px;color:${PALETTE.espresso};font-size:14px;line-height:1.65;">${opts.message}</p>`,
    cta: opts.url ? { label: "Open admin", url: opts.url } : undefined,
  });
  return { subject: `[${APP_NAME} Admin] ${opts.title}`, html, text: stripHtml(html) };
}

export function supportRequestEmail(opts: {
  fromEmail: string;
  subjectLine: string;
  message: string;
}): RenderedEmail {
  const html = layout({
    heading: "New support request",
    intro: `From: ${opts.fromEmail}`,
    bodyHtml: `
      <p style="margin:0 0 6px;color:${PALETTE.espresso};font-size:14px;font-weight:600;">${opts.subjectLine}</p>
      <p style="margin:0 0 18px;color:${PALETTE.espresso};font-size:14px;line-height:1.65;white-space:pre-wrap;">${opts.message}</p>`,
  });
  return { subject: `[Support] ${opts.subjectLine}`, html, text: stripHtml(html) };
}

export function broadcastEmail(opts: {
  title: string;
  bodyHtml: string;
}): RenderedEmail {
  const html = layout({
    heading: opts.title,
    bodyHtml: opts.bodyHtml,
    cta: { label: "Open Vertica", url: appUrl() },
  });
  return { subject: opts.title, html, text: stripHtml(html) };
}
