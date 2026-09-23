import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { HistoryMoveDirection } from "@homewallet/shared";
import { Space } from "./space.entity.js";
import { User } from "./user.entity.js";

@Entity({ name: "space_history_moves" })
export class SpaceHistoryMove extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ name: "source_space_id", type: "uuid", nullable: true })
  sourceSpaceId!: string | null;

  @Column({ name: "target_space_id", type: "uuid" })
  targetSpaceId!: string;

  @Column({ type: "text" })
  direction!: HistoryMoveDirection;

  @Column({ name: "entry_count", type: "int", default: 0 })
  entryCount!: number;

  @Column({ name: "moved_at", type: "timestamptz" })
  movedAt!: Date;

  @Column({ name: "preview_hash", type: "text", nullable: true })
  previewHash!: string | null;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => Space, { onDelete: "SET NULL", nullable: true })
  @JoinColumn({ name: "source_space_id" })
  sourceSpace!: Space | null;

  @ManyToOne(() => Space, { onDelete: "CASCADE" })
  @JoinColumn({ name: "target_space_id" })
  targetSpace!: Space;
}
