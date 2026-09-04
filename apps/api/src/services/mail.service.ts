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
        return;
      }

      const result = await resend.emails.send({
        from: config.resendFrom,
        to: input.to,
        subject: input.subject,
        html: input.html,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }
    },
  };
}

export type MailService = ReturnType<typeof createMailService>;
