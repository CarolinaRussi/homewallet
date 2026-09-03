import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { EntryType, EntryVisibility } from "@homewallet/shared";
import { Category } from "./category.entity.js";
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

  @Column({ name: "category_id", type: "uuid" })
  categoryId!: string;

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

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @ManyToOne(() => Space, { onDelete: "CASCADE" })
  @JoinColumn({ name: "space_id" })
  space!: Space;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @ManyToOne(() => Category, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "category_id" })
  category!: Category;
}
