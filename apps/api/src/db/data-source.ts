import { DataSource } from "typeorm";
import { Category } from "./entities/category.entity.js";
import { Entry } from "./entities/entry.entity.js";
import { EntryCardLine } from "./entities/entry-card-line.entity.js";
import { EntryCardRecurringSkip } from "./entities/entry-card-recurring-skip.entity.js";
import { InstallmentPlan } from "./entities/installment-plan.entity.js";
import { LeftoverSeed } from "./entities/leftover-seed.entity.js";
import { Membership } from "./entities/membership.entity.js";
import { PasswordResetToken } from "./entities/password-reset-token.entity.js";
import { RecurrenceSkip } from "./entities/recurrence-skip.entity.js";
import { RecurringRule } from "./entities/recurring-rule.entity.js";
import { ReserveMovement } from "./entities/reserve-movement.entity.js";
import { ReservePot } from "./entities/reserve-pot.entity.js";
import { Space } from "./entities/space.entity.js";
import { User } from "./entities/user.entity.js";
import { InitialIdentity20260903180000 } from "./migrations/20260903180000-initial-identity.js";
import { EntriesAndCategories20260903200000 } from "./migrations/20260903200000-entries-categories.js";
import { SpaceEntryDateMode20260903210000 } from "./migrations/20260903210000-space-entry-date-mode.js";
import { ReserveMovements20260903220000 } from "./migrations/20260903220000-reserve-movements.js";
import { RecurringAndInstallments20260903230000 } from "./migrations/20260903230000-recurring-installments.js";
import { LeftoverSeeds20260903240000 } from "./migrations/20260903240000-leftover-seeds.js";
import { LimitsAndBudgetLayers20260903250000 } from "./migrations/20260903250000-limits-budget-layers.js";
import { ReservePots20260904010000 } from "./migrations/20260904010000-reserve-pots.js";
import { MembershipCreatedAt20260904020000 } from "./migrations/20260904020000-membership-created-at.js";
import { PasswordResetTokens20260904100000 } from "./migrations/20260904100000-password-reset-tokens.js";
import { EntryTransfers20260904120000 } from "./migrations/20260904120000-entry-transfers.js";
import { EntryCardLines20260904130000 } from "./migrations/20260904130000-entry-card-lines.js";
import { EntryCardLinesSortOrder20260904140000 } from "./migrations/20260904140000-entry-card-lines-sort-order.js";
import { CategoryLineDetail20260904150000 } from "./migrations/20260904150000-category-line-detail.js";
import { CardLineInstallments20260904160000 } from "./migrations/20260904160000-card-line-installments.js";
import { CardLineRecurring20260904200000 } from "./migrations/20260904200000-card-line-recurring.js";
import { CardLineRecurringSkips20260905010000 } from "./migrations/20260905010000-card-line-recurring-skips.js";
import { RecurringRulesUserIndex20260905020000 } from "./migrations/20260905020000-recurring-rules-user-index.js";

export function createDataSource(databaseUrl: string): DataSource {
  return new DataSource({
    type: "postgres",
    url: databaseUrl,
    entities: [
      User,
      Space,
      Membership,
      Category,
      Entry,
      EntryCardLine,
      EntryCardRecurringSkip,
      ReserveMovement,
      ReservePot,
      RecurringRule,
      InstallmentPlan,
      RecurrenceSkip,
      LeftoverSeed,
      PasswordResetToken,
    ],
    migrations: [
      InitialIdentity20260903180000,
      EntriesAndCategories20260903200000,
      SpaceEntryDateMode20260903210000,
      ReserveMovements20260903220000,
      RecurringAndInstallments20260903230000,
      LeftoverSeeds20260903240000,
      LimitsAndBudgetLayers20260903250000,
      ReservePots20260904010000,
      MembershipCreatedAt20260904020000,
      PasswordResetTokens20260904100000,
      EntryTransfers20260904120000,
      EntryCardLines20260904130000,
      EntryCardLinesSortOrder20260904140000,
      CategoryLineDetail20260904150000,
      CardLineInstallments20260904160000,
      CardLineRecurring20260904200000,
      CardLineRecurringSkips20260905010000,
      RecurringRulesUserIndex20260905020000,
    ],
  });
}
