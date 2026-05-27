import "dotenv/config";
import { redis } from "@/lib/redis.js";
import { flushAuditBatch } from "@/services/audit-flush.service.js";
import { AuditEvent } from "@/types/audit-event.js";
import {
  AUDIT_BATCH_SIZE,
  AUDIT_FLUSH_INTERVAL_MS,
  AUDIT_QUEUE_NAME,
} from "@/config/audit.js";

let batch: AuditEvent[] = [];

async function flush() {
  if (batch.length === 0) {
    return;
  }

  const currentBatch = [...batch];

  batch = [];

  try {
    await flushAuditBatch(currentBatch);
  } catch (error) {
    console.error("Flush failed", error);
  }
}

async function start() {
  await redis.connect();

  console.log("Audit worker started");

  setInterval(flush, AUDIT_FLUSH_INTERVAL_MS);

  while (true) {
    const result = await redis.brPop(AUDIT_QUEUE_NAME, 0);

    if (!result) {
      continue;
    }

    const event = JSON.parse(result.element) as AuditEvent;

    batch.push(event);

    if (batch.length >= AUDIT_BATCH_SIZE) {
      await flush();
    }
  }
}

async function shutdown(signal: string) {
  console.log(`Received ${signal}`);

  console.log("Worker shutting down...");

  try {
    await flush();

    console.log("Batch flushed");

    await redis.quit();

    console.log("Redis disconnected");
  } catch (error) {
    console.error("Shutdown failed", error);
  }

  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("SIGINT", () => shutdown("SIGINT"));

start().catch(console.error);
