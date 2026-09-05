import type { ReservePotSummary } from "@homewallet/shared";
import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { Space } from "./space.entity.js";
import { User } from "./user.entity.js";

@Entity({ name: "member_month_snapshots" })
@Unique("member_month_snapshots_space_user_month_uidx", [
  "spaceId",
  "userId",
  "month",
])
export class MemberMonthSnapshot extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "space_id", type: "uuid" })
  spaceId!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ type: "text" })
  month!: string;

  @Column({ type: "numeric", precision: 14, scale: 2 })
  income!: string;

  @Column({ type: "numeric", precision: 14, scale: 2 })
  expense!: string;

  @Column({ type: "numeric", precision: 14, scale: 2 })
  contributed!: string;

  @Column({ type: "numeric", precision: 14, scale: 2 })
  withdrawn!: string;

  @Column({ name: "carried_in", type: "numeric", precision: 14, scale: 2 })
  carriedIn!: string;

  @Column({ type: "numeric", precision: 14, scale: 2 })
  leftover!: string;

  @Column({ name: "reserve_balance", type: "numeric", precision: 14, scale: 2 })
  reserveBalance!: string;

  @Column({ type: "jsonb" })
  pots!: ReservePotSummary[];

  @Column({ name: "rebuilt_at", type: "timestamptz" })
  rebuiltAt!: Date;

  @ManyToOne(() => Space, { onDelete: "CASCADE" })
  @JoinColumn({ name: "space_id" })
  space!: Space;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;
}
