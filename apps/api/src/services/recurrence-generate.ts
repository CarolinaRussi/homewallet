import type { DataSource } from "typeorm";
import {
  monthsThrough,
  monthToOccurredOn,
  recurringCoversMonth,
} from "@homewallet/shared";
import { monthBounds } from "../lib/entry-mappers.js";
import { entryRepository } from "../repositories/entry.repository.js";
import { recurrenceSkipRepository } from "../repositories/recurrence-skip.repository.js";
import { recurringRuleRepository } from "../repositories/recurring-rule.repository.js";

/** Materialize recurring entries through a month so leftover carry stays correct. */
export async function ensureRecurringThrough(
  dataSource: DataSource,
  spaceId: string,
  userId: string,
  throughMonth: string
) {
  const rules = await recurringRuleRepository.listForUser(
    spaceId,
    userId,
    dataSource.manager
  );
  if (rules.length === 0) {
    return;
  }

  const skips = await recurrenceSkipRepository.listForRules(
    rules.map((rule) => rule.id),
    dataSource.manager
  );
  const skipKeys = new Set(
    skips.map((skip) => `${skip.recurringRuleId}:${skip.month}`)
  );

  const { end: throughDate } = monthBounds(throughMonth);
  const existingEntries = await entryRepository.listRecurringForRulesThrough(
    rules.map((rule) => rule.id),
    throughDate,
    dataSource.manager
  );
  const existingKeys = new Set(
    existingEntries.map(
      (entry) => `${entry.recurringRuleId}:${entry.occurredOn}`
    )
  );

  for (const rule of rules) {
    const endMonth =
      rule.endMonth && rule.endMonth < throughMonth
        ? rule.endMonth
        : throughMonth;
    if (endMonth < rule.startMonth) {
      continue;
    }

    for (const month of monthsThrough(rule.startMonth, endMonth)) {
      if (!recurringCoversMonth(rule.startMonth, rule.endMonth, month)) {
        continue;
      }
      if (skipKeys.has(`${rule.id}:${month}`)) {
        continue;
      }

      const occurredOn = monthToOccurredOn(month);
      if (existingKeys.has(`${rule.id}:${occurredOn}`)) {
        continue;
      }

      await entryRepository.create(dataSource.manager, {
        spaceId,
        userId,
        categoryId: rule.categoryId,
        type: rule.type,
        amount: rule.amount,
        description: rule.description,
        visibility: rule.visibility,
        occurredOn,
        recurringRuleId: rule.id,
        installmentPlanId: null,
        installmentNumber: null,
      });
      existingKeys.add(`${rule.id}:${occurredOn}`);
    }
  }
}
