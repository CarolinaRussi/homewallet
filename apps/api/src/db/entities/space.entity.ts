import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";
import type { SpaceCurrency, SpacePrivacyMode } from "@homewallet/shared";

@Entity({ name: "spaces" })
export class Space extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text" })
  currency!: SpaceCurrency;

  @Column({ name: "privacy_mode", type: "text", default: "private" })
  privacyMode!: SpacePrivacyMode;

  @Column({ name: "join_code", type: "text", unique: true })
  joinCode!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
