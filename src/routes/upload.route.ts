import { Router } from "express";
import Busboy from "busboy";

import fs from "fs";
import path from "path";

import { generateSafeFileName } from "../services/file-name.service.js";

import { validateMagicBytes } from "../services/file-validator.service.js";

const router = Router();

router.post("/", (req, res) => {
  const busboy = Busboy({
    headers: req.headers,
  });

  let uploaded = false;

  busboy.on("file", async (_, fileStream) => {
    try {
      const chunks: Buffer[] = [];

      let total = 0;

      for await (const chunk of fileStream) {
        chunks.push(chunk);

        total += chunk.length;

        if (total >= 4100) {
          break;
        }
      }

      const headerBuffer = Buffer.concat(chunks);

      const detectedType = await validateMagicBytes(headerBuffer);

      const fileName = generateSafeFileName();

      const filePath = path.join(process.cwd(), "storage", "uploads", fileName);

      const writeStream = fs.createWriteStream(filePath);

      writeStream.write(headerBuffer);

      fileStream.pipe(writeStream);

      uploaded = true;

      writeStream.on("finish", () => {
        res.json({
          fileId: fileName,
          mime: detectedType.mime,
        });
      });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : "Upload failed",
      });
    }
  });

  busboy.on("finish", () => {
    if (!uploaded) {
      res.status(400).json({
        error: "No file uploaded",
      });
    }
  });

  req.pipe(busboy);
});

export default router;
