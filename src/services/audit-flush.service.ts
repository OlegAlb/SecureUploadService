import { clickhouse } from "@/lib/clickhouse.js";
import { AuditEvent } from "@/types/audit-event.js";

export async function flushAuditBatch(batch: AuditEvent[]): Promise<void> {
  if (batch.length === 0) {
    return;
  }

  await clickhouse.insert({
    table: "upload_audit",

    values: batch.map((event) => ({
      timestamp: event.timestamp,
      ip: event.ip,
      file_hash: event.fileHash,
      mime: event.mime,
      status: event.status,
    })),

    format: "JSONEachRow",
  });
}
