export interface AuditEvent {
  timestamp: string;
  ip: string;
  fileHash: string;
  mime: string;
  status: "accepted" | "blocked";
}
