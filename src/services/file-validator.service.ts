import { fileTypeFromBuffer } from "file-type";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

export async function validateMagicBytes(chunk: Buffer) {
  const detectedType = await fileTypeFromBuffer(chunk);

  if (!detectedType) {
    throw new Error("Unknown file type");
  }

  if (!ALLOWED_TYPES.includes(detectedType.mime)) {
    throw new Error(`Blocked mime type: ${detectedType.mime}`);
  }

  return detectedType;
}
