import { APP_NAME } from "@homewallet/shared";

const ACCENT = "#5f8f76";
const BG = "#f4f7f5";
const SURFACE = "#ffffff";
const FG = "#1c2420";
const MUTED = "#5c6b63";
const BORDER = "#d5e0d9";

type MailShellInput = {
  preview: string;
  title: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footnote?: string;
};

export function mailShell(input: MailShellInput): string {
  const footnote =
    input.footnote ??
    `If you did not expect this email from ${APP_NAME}, you can ignore it.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(input.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BG};color:${FG};font-family:'DM Sans',Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preview)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:${SURFACE};border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:28px 28px 8px;border-bottom:1px solid ${BORDER};">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${ACCENT};">${APP_NAME}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:600;color:${FG};">${escapeHtml(input.title)}</h1>
              <div style="font-size:15px;line-height:1.55;color:${MUTED};">${input.bodyHtml}</div>
              <p style="margin:28px 0 0;">
                <a href="${escapeAttr(input.ctaUrl)}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:8px;">${escapeHtml(input.ctaLabel)}</a>
              </p>
              <p style="margin:20px 0 0;font-size:12px;line-height:1.5;color:${MUTED};word-break:break-all;">
                Or open this link:<br />
                <a href="${escapeAttr(input.ctaUrl)}" style="color:${ACCENT};">${escapeHtml(input.ctaUrl)}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid ${BORDER};">
              <p style="margin:0;font-size:12px;line-height:1.5;color:${MUTED};">${escapeHtml(footnote)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function passwordResetEmailHtml(input: {
  name: string;
  resetUrl: string;
}): string {
  return mailShell({
    preview: `Reset your ${APP_NAME} password`,
    title: "Reset your password",
    bodyHtml: `<p style="margin:0 0 12px;">Hi ${escapeHtml(input.name)},</p>
<p style="margin:0;">We received a request to reset your password. This link expires in one hour.</p>`,
    ctaLabel: "Choose a new password",
    ctaUrl: input.resetUrl,
  });
}

export function verifyEmailHtml(input: {
  name: string;
  verifyUrl: string;
}): string {
  return mailShell({
    preview: `Confirm your ${APP_NAME} email`,
    title: "Confirm your email",
    bodyHtml: `<p style="margin:0 0 12px;">Hi ${escapeHtml(input.name)},</p>
<p style="margin:0;">Confirm this email address to unlock invites and export. This link expires in 48 hours.</p>`,
    ctaLabel: "Confirm email",
    ctaUrl: input.verifyUrl,
  });
}

export function spaceInviteEmailHtml(input: {
  inviterName: string;
  spaceName: string;
  joinUrl: string;
  joinCode: string;
}): string {
  return mailShell({
    preview: `${input.inviterName} invited you to ${input.spaceName} on ${APP_NAME}`,
    title: `Join ${input.spaceName}`,
    bodyHtml: `<p style="margin:0 0 12px;">${escapeHtml(input.inviterName)} invited you to the space <strong style="color:${FG};">${escapeHtml(input.spaceName)}</strong> on ${APP_NAME}.</p>
<p style="margin:0;">Open the link below, sign in or create an account, then join with this code if needed: <strong style="color:${FG};">${escapeHtml(input.joinCode)}</strong>.</p>`,
    ctaLabel: "Open invite",
    ctaUrl: input.joinUrl,
    footnote: `If you were not expecting an invite to ${APP_NAME}, you can ignore this email.`,
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value: string) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
