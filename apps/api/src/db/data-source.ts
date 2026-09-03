import { DataSource } from "typeorm";
import { Membership } from "./entities/membership.entity.js";
import { Space } from "./entities/space.entity.js";
import { User } from "./entities/user.entity.js";
import { InitialIdentity20260903180000 } from "./migrations/20260903180000-initial-identity.js";

export function createDataSource(databaseUrl: string): DataSource {
  return new DataSource({
    type: "postgres",
    url: databaseUrl,
    entities: [User, Space, Membership],
    migrations: [InitialIdentity20260903180000],
  });
}
