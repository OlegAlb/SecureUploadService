import { clickhouse } from "@/lib/clickhouse.js";
import { redis } from "@/lib/redis.js";
import { Router } from "express";

const router = Router();

router.get("/", async (_, res) => {
  try {
    await redis.ping();

    await clickhouse.query({
      query: "SELECT 1",
      format: "JSONEachRow",
    });

    res.json({
      status: "ok",
    });
  } catch (error) {
    console.error("Healthcheck failed", error);

    res.status(503).json({
      status: "unhealthy",
    });
  }
});

export default router;
