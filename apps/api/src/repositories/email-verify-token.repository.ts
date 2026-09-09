import type { EntityManager } from "typeorm";
import { EmailVerifyToken } from "../db/entities/email-verify-token.entity.js";

export const emailVerifyTokenRepository = {
  deleteForUser(userId: string, manager: EntityManager) {
    return manager.delete(EmailVerifyToken, { userId });
  },

  create(
    manager: EntityManager,
    fields: Pick<EmailVerifyToken, "userId" | "tokenHash" | "expiresAt">
  ) {
    return manager.save(manager.create(EmailVerifyToken, fields));
  },

  findByTokenHash(tokenHash: string, manager: EntityManager) {
    return manager.findOne(EmailVerifyToken, { where: { tokenHash } });
  },
};
