import {
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW,
} from "@/config/rate-limit.js";
import { redis } from "@/lib/redis.js";
import type { Request, Response, NextFunction } from "express";

export async function rateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const ip = req.ip ?? "unknown";

    const key = `rate:${ip}`;

    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW);
    }

    if (current > RATE_LIMIT_MAX_REQUESTS) {
      res.setHeader("X-RateLimit-Limit", RATE_LIMIT_MAX_REQUESTS);

      res.setHeader(
        "X-RateLimit-Remaining",
        Math.max(0, RATE_LIMIT_MAX_REQUESTS - current),
      );

      return res.status(429).json({
        error: "Too many requests",
      });
    }

    next();
  } catch (error) {
    console.error("Rate limit failed", error);

    next();
  }
}
