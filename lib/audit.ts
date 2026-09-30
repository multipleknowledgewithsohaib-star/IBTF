import { getDb } from "@/db";
import { auditEvents } from "@/db/schema";

type AuditInput = {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  reason?: string;
  correlationId?: string;
  ipAddress?: string;
};

export async function writeAuditEvent(input: AuditInput): Promise<void> {
  await getDb().insert(auditEvents).values({
    id: crypto.randomUUID(),
    actorId: input.actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    beforeJson: input.before === undefined ? null : JSON.stringify(input.before),
    afterJson: input.after === undefined ? null : JSON.stringify(input.after),
    reason: input.reason ?? null,
    correlationId: input.correlationId ?? crypto.randomUUID(),
    ipAddress: input.ipAddress ?? null,
    occurredAt: new Date(),
  });
}
