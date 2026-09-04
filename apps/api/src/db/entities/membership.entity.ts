import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import type { MembershipRole } from "@homewallet/shared";
import { Space } from "./space.entity.js";
import { User } from "./user.entity.js";

@Entity({ name: "memberships" })
@Unique(["userId", "spaceId"])
export class Membership extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ name: "space_id", type: "uuid" })
  spaceId!: string;

  @Column({ type: "text" })
  role!: MembershipRole;

  @Column({ name: "personal_limit_enabled", type: "boolean", default: false })
  personalLimitEnabled!: boolean;

  @Column({
    name: "personal_limit_amount",
    type: "numeric",
    precision: 14,
    scale: 2,
    nullable: true,
  })
  personalLimitAmount!: string | null;

  @Column({ name: "leftover_target_enabled", type: "boolean", default: false })
  leftoverTargetEnabled!: boolean;

  @Column({
    name: "leftover_target_amount",
    type: "numeric",
    precision: 14,
    scale: 2,
    nullable: true,
  })
  leftoverTargetAmount!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => Space, { onDelete: "CASCADE" })
  @JoinColumn({ name: "space_id" })
  space!: Space;
}
