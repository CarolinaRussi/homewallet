import type { DataSource } from "typeorm";
import type { CreateSpaceBody, SpaceSummary } from "@homewallet/shared";
import { Membership } from "../db/entities/membership.entity.js";
import { HttpError } from "../lib/http-error.js";
import { createJoinCode } from "../lib/join-code.js";
import { membershipRepository } from "../repositories/membership.repository.js";
import { spaceRepository } from "../repositories/space.repository.js";

function toSummary(
  space: Membership["space"],
  role: Membership["role"]
): SpaceSummary {
  return {
    id: space.id,
    name: space.name,
    currency: space.currency,
    privacyMode: space.privacyMode,
    role,
    joinCode: space.joinCode,
  };
}

export function createSpaceService(dataSource: DataSource) {
  return {
    async listForUser(userId: string): Promise<SpaceSummary[]> {
      const memberships = await membershipRepository.findForUser(
        userId,
        dataSource.manager
      );
      return memberships.map((membership) =>
        toSummary(membership.space, membership.role)
      );
    },

    async getForMember(userId: string, spaceId: string): Promise<SpaceSummary> {
      const membership = await membershipRepository.findMembership(
        userId,
        spaceId,
        dataSource.manager
      );
      if (!membership) {
        throw new HttpError(404, "Space not found");
      }
      return toSummary(membership.space, membership.role);
    },

    async createForOwner(
      userId: string,
      input: CreateSpaceBody,
      manager = dataSource.manager
    ): Promise<SpaceSummary> {
      // ponytail: retry once on join_code collision; unique index is the ceiling.
      let space;
      try {
        space = await spaceRepository.create(manager, {
          name: input.name,
          currency: input.currency,
          privacyMode: "private",
          joinCode: createJoinCode(),
        });
      } catch {
        space = await spaceRepository.create(manager, {
          name: input.name,
          currency: input.currency,
          privacyMode: "private",
          joinCode: createJoinCode(),
        });
      }

      await membershipRepository.create(manager, {
        userId,
        spaceId: space.id,
        role: "owner",
      });
      return toSummary(space, "owner");
    },

    async join(userId: string, joinCode: string): Promise<SpaceSummary> {
      const space = await spaceRepository.findByJoinCode(
        joinCode,
        dataSource.manager
      );
      if (!space) {
        throw new HttpError(404, "Space not found");
      }

      const existing = await membershipRepository.findMembership(
        userId,
        space.id,
        dataSource.manager
      );
      if (existing) {
        throw new HttpError(409, "Already a member of this space");
      }

      await membershipRepository.create(dataSource.manager, {
        userId,
        spaceId: space.id,
        role: "member",
      });
      return toSummary(space, "member");
    },
  };
}

export type SpaceService = ReturnType<typeof createSpaceService>;
