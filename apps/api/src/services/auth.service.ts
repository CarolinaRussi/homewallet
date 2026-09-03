import { OAuth2Client } from "google-auth-library";
import type { DataSource } from "typeorm";
import type { GoogleBody, LoginBody, RegisterBody } from "@homewallet/shared";
import type { AppConfig } from "../config.js";
import { User } from "../db/entities/user.entity.js";
import { HttpError } from "../lib/http-error.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
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
          return toSessionUser(byGoogle);
        }

        const byEmail = await userRepository.findByEmail(
          email.toLowerCase(),
          manager
        );
        if (byEmail) {
          byEmail.googleSub = googleSub;
          await userRepository.save(manager, byEmail);
          return toSessionUser(byEmail);
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

        return toSessionUser(user);
      });
    },

    async getById(userId: string) {
      const user = await userRepository.findById(userId, dataSource.manager);
      if (!user) {
        throw new HttpError(401, "Unauthorized");
      }
      return toSessionUser(user);
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
