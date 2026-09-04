import type { EntityManager } from "typeorm";
import { Space } from "../db/entities/space.entity.js";

export const spaceRepository = {
  findById(id: string, manager: EntityManager) {
    return manager.findOne(Space, { where: { id } });
  },

  findByJoinCode(joinCode: string, manager: EntityManager) {
    return manager.findOne(Space, { where: { joinCode } });
  },

  create(manager: EntityManager, fields: Partial<Space>) {
    return manager.save(manager.create(Space, fields));
  },

  save(manager: EntityManager, space: Space) {
    return manager.save(space);
  },

  remove(manager: EntityManager, space: Space) {
    return manager.remove(space);
  },
};
