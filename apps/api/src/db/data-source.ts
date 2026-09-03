import { DataSource } from "typeorm";
import { Category } from "./entities/category.entity.js";
import { Entry } from "./entities/entry.entity.js";
import { Membership } from "./entities/membership.entity.js";
import { Space } from "./entities/space.entity.js";
import { User } from "./entities/user.entity.js";
import { InitialIdentity20260903180000 } from "./migrations/20260903180000-initial-identity.js";
import { EntriesAndCategories20260903200000 } from "./migrations/20260903200000-entries-categories.js";
import { SpaceEntryDateMode20260903210000 } from "./migrations/20260903210000-space-entry-date-mode.js";

export function createDataSource(databaseUrl: string): DataSource {
  return new DataSource({
    type: "postgres",
    url: databaseUrl,
    entities: [User, Space, Membership, Category, Entry],
    migrations: [
      InitialIdentity20260903180000,
      EntriesAndCategories20260903200000,
      SpaceEntryDateMode20260903210000,
    ],
  });
}
