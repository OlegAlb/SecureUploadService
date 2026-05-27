import { UPLOAD_DIR } from "@/config/storage.js";
import { isValidFileId } from "@/utils/file-id.js";
import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

router.get("/:id", (req, res) => {
  const { id } = req.params;

  if (!isValidFileId(id)) {
    return res.status(400).json({
      error: "Invalid file id",
    });
  }

  const filePath = path.join(UPLOAD_DIR, id);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: "File not found",
    });
  }

  const stream = fs.createReadStream(filePath);

  stream.on("error", () => {
    if (!res.headersSent) {
      res.status(500).json({
        error: "Read error",
      });
    }
  });

  stream.pipe(res);
});

export default router;
