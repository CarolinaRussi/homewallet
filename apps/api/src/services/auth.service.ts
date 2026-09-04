import { OAuth2Client } from "google-auth-library";
import type { DataSource } from "typeorm";
import type { GoogleBody, LoginBody, RegisterBody } from "@homewallet/shared";
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
import { hashPassword, verifyPassword } from "../lib/password.js";
import { entryRepository } from "../repositories/entry.repository.js";
import { membershipRepository } from "../repositories/membership.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import type { SpaceService } from "./space.service.js";

function toSessionUser(user: User) {
  return { id: user.id, email: user.email, name: user.name };
}

export function createAuthService(
  dataSource: DataSource,
  spaceService: SpaceService,
  config: AppConfig
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

        await spaceService.createForOwner(
          user.id,
          { name: `${input.name}'s space`, currency: "BRL" },
          manager
        );

        return toSessionUser(user);
      });
    },

    async login(input: LoginBody) {
      const user = await userRepository.findByEmail(
        input.email.toLowerCase(),
        dataSource.manager
      );
      if (!user?.passwordHash) {
        throw new HttpError(401, "Invalid email or password");
      }

      const matches = await verifyPassword(input.password, user.passwordHash);
      if (!matches) {
        throw new HttpError(401, "Invalid email or password");
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

        await spaceService.createForOwner(
          user.id,
          { name: `${name}'s space`, currency: "BRL" },
          manager
        );

        return { user: toSessionUser(user), createdSpace: true };
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
