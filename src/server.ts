import "dotenv/config";

import express from "express";

import uploadRouter from "@/routes/upload.route.js";

import fileRouter from "@/routes/file.route.js";

import healthRouter from "@/routes/health.route.js";

import { rateLimit } from "@/middleware/rate-limit.middleware.js";

import { redis } from "@/lib/redis.js";

const app = express();

app.use("/upload", rateLimit, uploadRouter);

app.use("/files", fileRouter);

app.use("/health", healthRouter);

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  await redis.connect();

  const server = app.listen(PORT, () => {
    console.log(`Server started on ${PORT}`);
  });

  async function shutdown(signal: string) {
    console.log(`Received ${signal}`);

    console.log("Shutting down API...");

    server.close(async () => {
      try {
        await redis.quit();

        console.log("Redis disconnected");
      } catch (error) {
        console.error("Shutdown error", error);
      }

      process.exit(0);
    });
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));

  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch(console.error);
