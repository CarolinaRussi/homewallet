import {
  BaseEntity,
  Column,
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

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => Space, { onDelete: "CASCADE" })
  @JoinColumn({ name: "space_id" })
  space!: Space;
}
