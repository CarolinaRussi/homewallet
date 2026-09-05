import type { DataSource, EntityManager } from "typeorm";
import { monthBounds } from "../lib/entry-mappers.js";
import { entryRepository } from "../repositories/entry.repository.js";
import { leftoverSeedRepository } from "../repositories/leftover-seed.repository.js";
import { memberMonthSnapshotRepository } from "../repositories/member-month-snapshot.repository.js";
import { reserveMovementRepository } from "../repositories/reserve-movement.repository.js";
import { reservePotRepository } from "../repositories/reserve-pot.repository.js";
import {
  buildFlowBuckets,
  computeSnapshotsThrough,
  currentMonthKey,
  earliestMonth,
  resolveThroughMonth,
  toSeedSummary,
  type SnapshotCore,
} from "./month-snapshot.build.js";
import type { ReservePotService } from "./reserve-pot.service.js";

export function createMonthSnapshotService(
  dataSource: DataSource,
  reservePotService: ReservePotService
) {
  async function loadFlowThrough(
    spaceId: string,
    userId: string,
    throughDate: string,
    manager: EntityManager
  ) {
    await reservePotService.ensureDefaults(userId, spaceId);
    const [entries, movements, seeds, pots] = await Promise.all([
      entryRepository.listMineThroughLight(
        spaceId,
        userId,
        throughDate,
        manager
      ),
      reserveMovementRepository.listForUserThrough(
        spaceId,
        userId,
        throughDate,
        manager
      ),
      leftoverSeedRepository.listForUserThrough(
        spaceId,
        userId,
        throughDate,
        manager
      ),
      reservePotRepository.listForUser(spaceId, userId, manager),
    ]);
    return { entries, movements, seeds, pots };
  }

  async function computeSnapshotsFrom(
    spaceId: string,
    userId: string,
    fromMonth: string,
    manager: EntityManager = dataSource.manager
  ): Promise<SnapshotCore[]> {
    let throughDate = monthBounds(currentMonthKey()).end;
    let flow = await loadFlowThrough(spaceId, userId, throughDate, manager);
    let buckets = buildFlowBuckets(flow.entries, flow.movements, flow.seeds);
    const latestDataMonth = buckets.reduce(
      (latest, bucket) => (bucket.month > latest ? bucket.month : latest),
      fromMonth
    );
    const throughMonth = resolveThroughMonth(fromMonth, buckets);
    const neededEnd = monthBounds(
      latestDataMonth > throughMonth ? latestDataMonth : throughMonth
    ).end;
    if (neededEnd > throughDate) {
      throughDate = neededEnd;
      flow = await loadFlowThrough(spaceId, userId, throughDate, manager);
      buckets = buildFlowBuckets(flow.entries, flow.movements, flow.seeds);
    }
    const seedSummaries = flow.seeds.map(toSeedSummary);
    const finalThroughMonth = resolveThroughMonth(fromMonth, buckets);
    return computeSnapshotsThrough(
      fromMonth,
      finalThroughMonth,
      buckets,
      flow.movements,
      seedSummaries,
      flow.entries,
      flow.pots
    );
  }

  return {
    async findCoreForMonth(
      spaceId: string,
      userId: string,
      month: string,
      manager: EntityManager = dataSource.manager
    ): Promise<SnapshotCore | null> {
      const row = await memberMonthSnapshotRepository.findForMonth(
        spaceId,
        userId,
        month,
        manager
      );
      if (!row) {
        return null;
      }
      return {
        month: row.month,
        income: Number(row.income),
        expense: Number(row.expense),
        contributed: Number(row.contributed),
        withdrawn: Number(row.withdrawn),
        carriedIn: Number(row.carriedIn),
        leftover: Number(row.leftover),
        reserveBalance: Number(row.reserveBalance),
        pots: row.pots,
      };
    },

    async rebuildFrom(
      userId: string,
      spaceId: string,
      fromMonth: string,
      manager: EntityManager = dataSource.manager
    ) {
      const rows = await computeSnapshotsFrom(
        spaceId,
        userId,
        fromMonth,
        manager
      );
      for (const row of rows) {
        await memberMonthSnapshotRepository.upsert(manager, {
          spaceId,
          userId,
          ...row,
        });
      }
    },

    async touch(userId: string, spaceId: string, ...months: string[]) {
      if (months.length === 0) {
        return;
      }
      await this.rebuildFrom(userId, spaceId, earliestMonth(...months));
    },

    computeSnapshotsFrom,
  };
}

export type MonthSnapshotService = ReturnType<
  typeof createMonthSnapshotService
>;
