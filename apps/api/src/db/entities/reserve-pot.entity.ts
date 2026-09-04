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
import { Space } from "./space.entity.js";
import { User } from "./user.entity.js";

@Entity({ name: "reserve_pots" })
@Unique(["spaceId", "userId", "name"])
export class ReservePot extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "space_id", type: "uuid" })
  spaceId!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ type: "text" })
  name!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @ManyToOne(() => Space, { onDelete: "CASCADE" })
  @JoinColumn({ name: "space_id" })
  space!: Space;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;
}
