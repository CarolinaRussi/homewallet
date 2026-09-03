import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "users" })
export class User extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text", unique: true })
  email!: string;

  @Column({ name: "password_hash", type: "text", nullable: true })
  passwordHash!: string | null;

  @Column({ name: "google_sub", type: "text", unique: true, nullable: true })
  googleSub!: string | null;

  @Column({ type: "text" })
  name!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
