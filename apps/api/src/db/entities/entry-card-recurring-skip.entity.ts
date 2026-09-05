import {
  BaseEntity,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";

/** Month the user removed from a card-line subscription so ensure() does not recreate it. */
@Entity({ name: "entry_card_recurring_skips" })
@Unique(["recurringGroupId", "month"])
export class EntryCardRecurringSkip extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "recurring_group_id", type: "uuid" })
  recurringGroupId!: string;

  @Column({ type: "text" })
  month!: string;
}
