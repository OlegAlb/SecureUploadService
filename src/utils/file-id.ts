export function isValidFileId(value: string): boolean {
  return /^[a-f0-9]{64}$/.test(value);
}
