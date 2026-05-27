import { AUDIT_QUEUE_NAME } from "@/config/audit.js";
import { redis } from "@/lib/redis.js";
import { AuditEvent } from "@/types/audit-event.js";

export async function publishAuditEvent(event: AuditEvent) {
  await redis.lPush(AUDIT_QUEUE_NAME, JSON.stringify(event));
}
