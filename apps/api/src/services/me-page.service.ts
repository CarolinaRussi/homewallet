import type { MePagePayload } from "@homewallet/shared";
import type { EntryService } from "./entry.service.js";
import type { LeftoverService } from "./leftover.service.js";
import type { MonthSnapshotService } from "./month-snapshot.service.js";
import type { RecurringService } from "./recurring.service.js";

export function createMePageService(
  entryService: EntryService,
  leftoverService: LeftoverService,
  recurringService: RecurringService,
  monthSnapshotService: MonthSnapshotService
) {
  return {
    async load(
      userId: string,
      spaceId: string,
      month: string
    ): Promise<MePagePayload> {
      const materialized = await recurringService.ensureThrough(
        userId,
        spaceId,
        month
      );
      if (materialized) {
        monthSnapshotService.touch(userId, spaceId, month);
      }
      const [entries, summary] = await Promise.all([
        entryService.listMinePrepared(userId, spaceId, month),
        leftoverService.loadMonthSummary(userId, spaceId, month),
      ]);
      return { entries, summary };
    },
  };
}

export type MePageService = ReturnType<typeof createMePageService>;
