import type { EntityManager } from "typeorm";
import type { ReservePotSummary } from "@homewallet/shared";
import { MemberMonthSnapshot } from "../db/entities/member-month-snapshot.entity.js";

export type SnapshotRowInput = {
  spaceId: string;
  userId: string;
  month: string;
  income: number;
  expense: number;
  contributed: number;
  withdrawn: number;
  carriedIn: number;
  leftover: number;
  reserveBalance: number;
  pots: ReservePotSummary[];
};

function toNumeric(value: number) {
  return value.toFixed(2);
}

export const memberMonthSnapshotRepository = {
  findForMonth(
    spaceId: string,
    userId: string,
    month: string,
    manager: EntityManager
  ) {
    return manager.findOne(MemberMonthSnapshot, {
      where: { spaceId, userId, month },
    });
  },

  upsert(manager: EntityManager, row: SnapshotRowInput) {
    return manager.upsert(
      MemberMonthSnapshot,
      {
        spaceId: row.spaceId,
        userId: row.userId,
        month: row.month,
        income: toNumeric(row.income),
        expense: toNumeric(row.expense),
        contributed: toNumeric(row.contributed),
        withdrawn: toNumeric(row.withdrawn),
        carriedIn: toNumeric(row.carriedIn),
        leftover: toNumeric(row.leftover),
        reserveBalance: toNumeric(row.reserveBalance),
        pots: row.pots,
        rebuiltAt: new Date(),
      },
      ["spaceId", "userId", "month"]
    );
  },
};
