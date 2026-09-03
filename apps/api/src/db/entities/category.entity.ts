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

@Entity({ name: "categories" })
@Unique(["spaceId", "name"])
export class Category extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "space_id", type: "uuid" })
  spaceId!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ name: "is_default", type: "boolean", default: false })
  isDefault!: boolean;

  @ManyToOne(() => Space, { onDelete: "CASCADE" })
  @JoinColumn({ name: "space_id" })
  space!: Space;
}
