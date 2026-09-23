import { Resend } from "resend";
import type { AppConfig } from "../config.js";

export type SendMailInput = {
  to: string;
  subject: string;
  html: string;
  /** Logged when Resend is not configured (local/dev). */
  debugLink?: string;
};

export function createMailService(config: AppConfig) {
  const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

  return {
    async send(input: SendMailInput): Promise<void> {
      if (!resend || !config.resendFrom) {
        console.info(
          `[mail] skip Resend — to=${input.to} subject=${input.subject}` +
            (input.debugLink ? ` link=${input.debugLink}` : "")
        );
        if (config.isProduction) {
          console.error(
            "[mail] Email is not configured (RESEND_API_KEY / RESEND_FROM)"
          );
        }
        return;
      }

      try {
        const result = await resend.emails.send({
          from: config.resendFrom,
          to: input.to,
          subject: input.subject,
          html: input.html,
        });

        if (result.error) {
          console.error(`[mail] Resend rejected: ${result.error.message}`);
        }
      } catch (error) {
        console.error("[mail] Resend request failed", error);
      }
    },
  };
}

export type MailService = ReturnType<typeof createMailService>;
