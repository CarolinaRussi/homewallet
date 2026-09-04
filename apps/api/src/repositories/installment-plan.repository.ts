import type { EntityManager } from "typeorm";
import { InstallmentPlan } from "../db/entities/installment-plan.entity.js";

export const installmentPlanRepository = {
  listForUser(spaceId: string, userId: string, manager: EntityManager) {
    return manager.find(InstallmentPlan, {
      where: { spaceId, userId },
      relations: { category: true },
      order: { startMonth: "DESC", createdAt: "DESC" },
    });
  },

  findById(id: string, manager: EntityManager) {
    return manager.findOne(InstallmentPlan, {
      where: { id },
      relations: { category: true },
    });
  },

  create(manager: EntityManager, fields: Partial<InstallmentPlan>) {
    return manager.save(manager.create(InstallmentPlan, fields));
  },

  save(manager: EntityManager, plan: InstallmentPlan) {
    return manager.save(plan);
  },

  remove(manager: EntityManager, plan: InstallmentPlan) {
    return manager.remove(plan);
  },
};
