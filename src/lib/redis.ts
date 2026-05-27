import { createClient } from "redis";

const host = process.env.REDIS_HOST;

const port = process.env.REDIS_PORT;

export const redis = createClient({
  url: `redis://${host}:${port}`,
});

redis.on("error", (err) => {
  console.error("Redis error", err);
});
