import { db } from "./client";
import { auditLogs } from "./schema";

export async function logAudit(params: {
  processNumber: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  return db.insert(auditLogs).values({
    processNumber: params.processNumber,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    metadata: params.metadata ?? {},
  });
}
