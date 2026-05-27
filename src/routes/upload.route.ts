import { Router } from "express";
import Busboy from "busboy";

import { processUpload } from "../services/upload.service.js";

const router = Router();

router.post("/", (req, res) => {
  const busboy = Busboy({
    headers: req.headers,
  });

  let fileFound = false;

  busboy.on("file", async (_fieldName, fileStream, info) => {
    fileFound = true;

    try {
      const result = await processUpload(fileStream, info, req.ip ?? "unknown");

      if (!res.headersSent) {
        res.status(201).json(result);
      }
    } catch (error) {
      console.error("Upload failed", error);

      if (!res.headersSent) {
        res.status(400).json({
          error: error instanceof Error ? error.message : "Upload failed",
        });
      }
    }
  });

  busboy.on("finish", () => {
    if (!fileFound && !res.headersSent) {
      res.status(400).json({
        error: "No file uploaded",
      });
    }
  });

  busboy.on("error", (error) => {
    console.error("Busboy error", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: "Multipart parsing failed",
      });
    }
  });

  req.pipe(busboy);
});

export default router;
