import type { EntityManager } from "typeorm";
import { User } from "../db/entities/user.entity.js";

export const userRepository = {
  findByEmail(email: string, manager: EntityManager) {
    return manager.findOne(User, { where: { email } });
  },

  findById(id: string, manager: EntityManager) {
    return manager.findOne(User, { where: { id } });
  },

  findByGoogleSub(googleSub: string, manager: EntityManager) {
    return manager.findOne(User, { where: { googleSub } });
  },

  create(manager: EntityManager, fields: Partial<User>) {
    return manager.save(manager.create(User, fields));
  },

  save(manager: EntityManager, user: User) {
    return manager.save(user);
  },

  remove(manager: EntityManager, user: User) {
    return manager.remove(user);
  },
};
