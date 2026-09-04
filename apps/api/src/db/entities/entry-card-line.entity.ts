import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Category } from "./category.entity.js";
import { Entry } from "./entry.entity.js";

@Entity({ name: "entry_card_lines" })
export class EntryCardLine extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "entry_id", type: "uuid" })
  entryId!: string;

  @Column({ name: "category_id", type: "uuid" })
  categoryId!: string;

  @Column({ type: "text" })
  description!: string;

  /** Stored as numeric; read/write as string from pg driver. */
  @Column({ type: "numeric", precision: 14, scale: 2 })
  amount!: string;

  @Column({ name: "sort_order", type: "int", default: 0 })
  sortOrder!: number;

  @Column({ name: "installment_group_id", type: "uuid", nullable: true })
  installmentGroupId!: string | null;

  @Column({ name: "installment_number", type: "int", nullable: true })
  installmentNumber!: number | null;

  @Column({ name: "installment_count", type: "int", nullable: true })
  installmentCount!: number | null;

  @ManyToOne(() => Entry, (entry) => entry.cardLines, { onDelete: "CASCADE" })
  @JoinColumn({ name: "entry_id" })
  entry!: Entry;

  @ManyToOne(() => Category, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "category_id" })
  category!: Category;
}
