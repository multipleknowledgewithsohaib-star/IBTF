const sensitiveKey = /(?:authorization|cookie|password|secret|token|credential|account|iban|applicant|email|name|content|payload)/i;
const safeKey = /^[a-zA-Z][a-zA-Z0-9_.-]{0,63}$/;

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

export function sanitizeLogFields(fields: LogFields): LogFields {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [
    safeKey.test(key) ? key : "invalid_field",
    sensitiveKey.test(key) ? "[REDACTED]" : sanitizeValue(value),
  ]));
}

function sanitizeValue(value: unknown): unknown {
  if (value === null || typeof value === "boolean" || typeof value === "number") return value;
  if (typeof value === "string") return value.replace(/[\r\n\t]/g, " ").slice(0, 256);
  if (Array.isArray(value)) return value.slice(0, 20).map(sanitizeValue);
  if (typeof value === "object") return sanitizeLogFields(value as LogFields);
  return String(value).slice(0, 256);
}

export function operationalLog(level: LogLevel, event: string, fields: LogFields = {}): void {
  const record = JSON.stringify({ timestamp: new Date().toISOString(), level, event: event.replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 64), ...sanitizeLogFields(fields) });
  if (level === "error") console.error(record);
  else if (level === "warn") console.warn(record);
  else console.log(record);
}
