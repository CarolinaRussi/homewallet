import { OAuth2Client } from "google-auth-library";
import { createHash, randomBytes } from "node:crypto";
import type { DataSource } from "typeorm";
import { APP_NAME } from "@homewallet/shared";
import type {
  ForgotPasswordBody,
  GoogleBody,
  LoginBody,
  RegisterBody,
  ResetPasswordBody,
} from "@homewallet/shared";
import type { AppConfig } from "../config.js";
import { Entry } from "../db/entities/entry.entity.js";
import { InstallmentPlan } from "../db/entities/installment-plan.entity.js";
import { LeftoverSeed } from "../db/entities/leftover-seed.entity.js";
import { RecurrenceSkip } from "../db/entities/recurrence-skip.entity.js";
import { RecurringRule } from "../db/entities/recurring-rule.entity.js";
import { ReserveMovement } from "../db/entities/reserve-movement.entity.js";
import { ReservePot } from "../db/entities/reserve-pot.entity.js";
import { User } from "../db/entities/user.entity.js";
import { HttpError } from "../lib/http-error.js";
import { passwordResetEmailHtml } from "../lib/mail-templates.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { entryRepository } from "../repositories/entry.repository.js";
import { membershipRepository } from "../repositories/membership.repository.js";
import { passwordResetTokenRepository } from "../repositories/password-reset-token.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import type { MailService } from "./mail.service.js";
import type { SpaceService } from "./space.service.js";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

function toSessionUser(user: User) {
  return { id: user.id, email: user.email, name: user.name };
}

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createAuthService(
  dataSource: DataSource,
  spaceService: SpaceService,
  config: AppConfig,
  mailService: MailService
) {
  const googleClient = config.googleClientId
    ? new OAuth2Client(config.googleClientId)
    : null;

  return {
    async register(input: RegisterBody) {
      return dataSource.transaction(async (manager) => {
        const existing = await userRepository.findByEmail(input.email, manager);
        if (existing) {
          throw new HttpError(409, "Email already registered");
        }

        const user = await userRepository.create(manager, {
          email: input.email.toLowerCase(),
          name: input.name,
          passwordHash: await hashPassword(input.password),
          googleSub: null,
        });

        const space = await spaceService.createForOwner(
          user.id,
          { name: `${input.name}'s space`, currency: "BRL" },
          manager
        );

        return { user: toSessionUser(user), spaceId: space.id };
      });
    },

    async login(input: LoginBody) {
      const user = await userRepository.findByEmail(
        input.email.toLowerCase(),
        dataSource.manager
      );
      if (!user?.passwordHash) {
        throw new HttpError(401, "Invalid email or passcode");
      }

      const matches = await verifyPassword(input.password, user.passwordHash);
      if (!matches) {
        throw new HttpError(401, "Invalid email or passcode");
      }

      return toSessionUser(user);
    },

    async loginWithGoogle(input: GoogleBody) {
      if (!googleClient || !config.googleClientId) {
        throw new HttpError(501, "Google sign-in is not configured");
      }

      const ticket = await googleClient.verifyIdToken({
        idToken: input.idToken,
        audience: config.googleClientId,
      });
      const payload = ticket.getPayload();
      const googleSub = payload?.sub;
      const email = payload?.email;
      const name = payload?.name ?? payload?.email ?? "Member";
      if (!googleSub || !email) {
        throw new HttpError(401, "Google sign-in failed");
      }

      return dataSource.transaction(async (manager) => {
        const byGoogle = await userRepository.findByGoogleSub(
          googleSub,
          manager
        );
        if (byGoogle) {
          return { user: toSessionUser(byGoogle), createdSpace: false };
        }

        const byEmail = await userRepository.findByEmail(
          email.toLowerCase(),
          manager
        );
        if (byEmail) {
          byEmail.googleSub = googleSub;
          await userRepository.save(manager, byEmail);
          return { user: toSessionUser(byEmail), createdSpace: false };
        }

        const user = await userRepository.create(manager, {
          email: email.toLowerCase(),
          name,
          passwordHash: null,
          googleSub,
        });

        const space = await spaceService.createForOwner(
          user.id,
          { name: `${name}'s space`, currency: "BRL" },
          manager
        );

        return {
          user: toSessionUser(user),
          createdSpace: true,
          spaceId: space.id,
        };
      });
    },

    async forgotPassword(input: ForgotPasswordBody): Promise<void> {
      const user = await userRepository.findByEmail(
        input.email.toLowerCase(),
        dataSource.manager
      );
      if (!user?.passwordHash) {
        return;
      }

      const rawToken = randomBytes(32).toString("base64url");
      const tokenHash = hashResetToken(rawToken);
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      await dataSource.transaction(async (manager) => {
        await passwordResetTokenRepository.deleteForUser(user.id, manager);
        await passwordResetTokenRepository.create(manager, {
          userId: user.id,
          tokenHash,
          expiresAt,
        });
      });

      const resetUrl = `${config.webOrigin}/reset-password?token=${encodeURIComponent(rawToken)}`;
      await mailService.send({
        to: user.email,
        subject: `Reset your ${APP_NAME} password`,
        html: passwordResetEmailHtml({ name: user.name, resetUrl }),
        debugLink: resetUrl,
      });
    },

    async resetPassword(input: ResetPasswordBody): Promise<void> {
      const tokenHash = hashResetToken(input.token);
      const row = await passwordResetTokenRepository.findByTokenHash(
        tokenHash,
        dataSource.manager
      );
      if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
        throw new HttpError(400, "Invalid or expired reset link");
      }

      await dataSource.transaction(async (manager) => {
        const user = await userRepository.findById(row.userId, manager);
        if (!user) {
          throw new HttpError(400, "Invalid or expired reset link");
        }

        user.passwordHash = await hashPassword(input.password);
        await userRepository.save(manager, user);
        await passwordResetTokenRepository.deleteForUser(user.id, manager);
      });
    },

    async getById(userId: string) {
      const user = await userRepository.findById(userId, dataSource.manager);
      if (!user) {
        throw new HttpError(401, "Unauthorized");
      }
      return toSessionUser(user);
    },

    async exportEntriesCsv(userId: string): Promise<string> {
      const user = await userRepository.findById(userId, dataSource.manager);
      if (!user) {
        throw new HttpError(401, "Unauthorized");
      }

      const entries = await entryRepository.listAllForUser(
        userId,
        dataSource.manager
      );

      const header = [
        "space",
        "occurredOn",
        "type",
        "amount",
        "category",
        "description",
        "visibility",
        "reservePot",
      ];
      const rows = entries.map((entry) =>
        [
          csvCell(entry.space?.name ?? entry.spaceId),
          entry.occurredOn,
          entry.type,
          entry.amount,
          entry.category?.name ?? "",
          entry.description,
          entry.visibility,
          entry.reservePot?.name ?? "",
        ].join(",")
      );

      return [header.join(","), ...rows].join("\n") + "\n";
    },

    async deleteAccount(userId: string): Promise<void> {
      const user = await userRepository.findById(userId, dataSource.manager);
      if (!user) {
        throw new HttpError(401, "Unauthorized");
      }

      const memberships = await membershipRepository.findForUser(
        userId,
        dataSource.manager
      );
      for (const membership of memberships) {
        await spaceService.leave(userId, membership.spaceId);
      }

      await dataSource.transaction(async (manager) => {
        await passwordResetTokenRepository.deleteForUser(userId, manager);
        await manager.delete(Entry, { userId });
        await manager.delete(ReserveMovement, { userId });
        await manager.delete(LeftoverSeed, { userId });
        await manager.delete(RecurrenceSkip, { userId });
        await manager.delete(RecurringRule, { userId });
        await manager.delete(InstallmentPlan, { userId });
        await manager.delete(ReservePot, { userId });

        const stillHere = await userRepository.findById(userId, manager);
        if (stillHere) {
          await userRepository.remove(manager, stillHere);
        }
      });
    },
  };
}

function csvCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export type AuthService = ReturnType<typeof createAuthService>;
