import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { RecurringRule } from "./recurring-rule.entity.js";
import { Space } from "./space.entity.js";
import { User } from "./user.entity.js";

/** Marks a recurring month the user deleted so ensure() does not recreate it. */
@Entity({ name: "recurrence_skips" })
@Unique(["recurringRuleId", "month"])
export class RecurrenceSkip extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "space_id", type: "uuid" })
  spaceId!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ name: "recurring_rule_id", type: "uuid" })
  recurringRuleId!: string;

  @Column({ type: "text" })
  month!: string;

  @ManyToOne(() => Space, { onDelete: "CASCADE" })
  @JoinColumn({ name: "space_id" })
  space!: Space;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => RecurringRule, { onDelete: "CASCADE" })
  @JoinColumn({ name: "recurring_rule_id" })
  recurringRule!: RecurringRule;
}
