export function isLeaveExportEligible(memberCount: number) {
  return memberCount >= 2;
}

export function classifyLeaveEntry(
  entry: {
    type: string;
    visibility: string;
    counterpartyUserId: string | null;
  },
  stayingMemberIds: ReadonlySet<string>
) {
  const isTransfer =
    entry.type === "transfer_out" || entry.type === "transfer_in";
  if (isTransfer) {
    const peerStays =
      entry.counterpartyUserId != null &&
      stayingMemberIds.has(entry.counterpartyUserId);
    return {
      move: !peerStays,
      orphanTransfer: !peerStays,
    };
  }
  if (entry.visibility === "shared") {
    return { move: false, orphanTransfer: false };
  }
  return { move: true, orphanTransfer: false };
}

export function entryMonth(occurredOn: string | Date) {
  const text =
    occurredOn instanceof Date
      ? occurredOn.toISOString().slice(0, 10)
      : String(occurredOn);
  return text.slice(0, 7);
}

export function soloSpaceNameFrom(spaceName: string) {
  const suffix = " (pessoal)";
  if (spaceName.length + suffix.length <= 80) {
    return `${spaceName}${suffix}`;
  }
  return `${spaceName.slice(0, 80 - suffix.length)}${suffix}`;
}
