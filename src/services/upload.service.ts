import fs from "fs";
import path from "path";
import crypto from "crypto";

import { PassThrough } from "stream";

import type { FileInfo } from "busboy";

import { validateMagicBytes } from "./file-validator.service.js";

import { publishAuditEvent } from "./audit.service.js";

import { UPLOAD_DIR } from "../config/storage.js";

import type { UploadResult } from "../types/upload-result.js";
import { MAGIC_BYTES_SIZE, MAX_FILE_SIZE } from "@/config/upload.js";

export async function processUpload(
  fileStream: AsyncIterable<Buffer>,
  info: FileInfo,
  ip: string,
): Promise<UploadResult> {
  const fileId = crypto.randomBytes(32).toString("hex");

  const filePath = path.join(UPLOAD_DIR, fileId);

  const writeStream = fs.createWriteStream(filePath, {
    mode: 0o600,
  });

  const passThrough = new PassThrough();

  passThrough.pipe(writeStream);

  const hash = crypto.createHash("sha256");

  let totalSize = 0;

  let validated = false;

  let sniffBuffer = Buffer.alloc(0);

  try {
    for await (const chunk of fileStream) {
      totalSize += chunk.length;

      if (totalSize > MAX_FILE_SIZE) {
        throw new Error("File too large");
      }

      if (!validated) {
        sniffBuffer = Buffer.concat([sniffBuffer, chunk]);

        if (sniffBuffer.length >= MAGIC_BYTES_SIZE) {
          await validateMagicBytes(sniffBuffer.subarray(0, MAGIC_BYTES_SIZE));

          validated = true;

          hash.update(sniffBuffer);

          passThrough.write(sniffBuffer);
        }
      } else {
        hash.update(chunk);

        passThrough.write(chunk);
      }
    }

    if (!validated) {
      await validateMagicBytes(sniffBuffer);

      validated = true;

      hash.update(sniffBuffer);

      passThrough.write(sniffBuffer);
    }

    passThrough.end();

    await new Promise<void>((resolve, reject) => {
      writeStream.on("finish", () => resolve());

      writeStream.on("error", reject);
    });

    const fileHash = hash.digest("hex");

    await publishAuditEvent({
      timestamp: new Date().toISOString(),

      ip,

      fileHash,

      mime: info.mimeType,

      status: "accepted",
    });

    return {
      fileId,
      hash: fileHash,
    };
  } catch (error) {
    passThrough.destroy();

    writeStream.destroy();

    fs.rm(filePath, () => {});

    await publishAuditEvent({
      timestamp: new Date().toISOString(),

      ip,

      fileHash: "",

      mime: info.mimeType,

      status: "blocked",
    });

    throw error;
  }
}
