import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { EntryType, EntryVisibility } from "@homewallet/shared";
import { Category } from "./category.entity.js";
import { EntryCardLine } from "./entry-card-line.entity.js";
import { InstallmentPlan } from "./installment-plan.entity.js";
import { RecurringRule } from "./recurring-rule.entity.js";
import { ReservePot } from "./reserve-pot.entity.js";
import { Space } from "./space.entity.js";
import { User } from "./user.entity.js";

@Entity({ name: "entries" })
export class Entry extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "space_id", type: "uuid" })
  spaceId!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ name: "category_id", type: "uuid", nullable: true })
  categoryId!: string | null;

  @Column({ type: "text" })
  type!: EntryType;

  /** Stored as numeric; read/write as string from pg driver. */
  @Column({ type: "numeric", precision: 14, scale: 2 })
  amount!: string;

  @Column({ type: "text", default: "" })
  description!: string;

  @Column({ type: "text" })
  visibility!: EntryVisibility;

  @Column({ name: "occurred_on", type: "date" })
  occurredOn!: string;

  @Column({ name: "recurring_rule_id", type: "uuid", nullable: true })
  recurringRuleId!: string | null;

  @Column({ name: "installment_plan_id", type: "uuid", nullable: true })
  installmentPlanId!: string | null;

  @Column({ name: "installment_number", type: "int", nullable: true })
  installmentNumber!: number | null;

  @Column({ name: "reserve_pot_id", type: "uuid", nullable: true })
  reservePotId!: string | null;

  @Column({ name: "transfer_group_id", type: "uuid", nullable: true })
  transferGroupId!: string | null;

  @Column({ name: "counterparty_user_id", type: "uuid", nullable: true })
  counterpartyUserId!: string | null;

  /** Auto-created by card-line installments; bump total when adding more installment lines. */
  @Column({ name: "card_installment_seeded", type: "boolean", default: false })
  cardInstallmentSeeded!: boolean;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @ManyToOne(() => Space, { onDelete: "CASCADE" })
  @JoinColumn({ name: "space_id" })
  space!: Space;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => Category, { onDelete: "RESTRICT", nullable: true })
  @JoinColumn({ name: "category_id" })
  category!: Category | null;

  @ManyToOne(() => InstallmentPlan, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "installment_plan_id" })
  installmentPlan!: InstallmentPlan | null;

  @ManyToOne(() => RecurringRule, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "recurring_rule_id" })
  recurringRule!: RecurringRule | null;

  @ManyToOne(() => ReservePot, { onDelete: "RESTRICT", nullable: true })
  @JoinColumn({ name: "reserve_pot_id" })
  reservePot!: ReservePot | null;

  @ManyToOne(() => User, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "counterparty_user_id" })
  counterparty!: User | null;

  @OneToMany(() => EntryCardLine, (line) => line.entry)
  cardLines!: EntryCardLine[];
}
