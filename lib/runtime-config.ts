export type RuntimeConfig = Readonly<{
  environment: "development" | "test" | "production";
  businessTimezone: "Asia/Karachi";
  currency: "PKR";
  fiscalYearStartMonth: 7;
  logLevel: "debug" | "info" | "warn" | "error";
  readinessTimeoutMs: number;
}>;

const allowedKeys = new Set([
  "IBFT_ENVIRONMENT",
  "IBFT_BUSINESS_TIMEZONE",
  "IBFT_CURRENCY",
  "IBFT_FISCAL_YEAR_START_MONTH",
  "IBFT_LOG_LEVEL",
  "IBFT_READINESS_TIMEOUT_MS",
]);

export function validateRuntimeConfig(env: Record<string, string | undefined>): RuntimeConfig {
  const unknownKeys = Object.keys(env).filter((key) => key.startsWith("IBFT_") && !allowedKeys.has(key));
  if (unknownKeys.length) throw new Error(`Unsupported IBFT configuration: ${unknownKeys.sort().join(", ")}`);
  const environment = env.IBFT_ENVIRONMENT ?? "development";
  if (!(["development", "test", "production"] as const).includes(environment as never)) {
    throw new Error("IBFT_ENVIRONMENT must be development, test, or production");
  }
  if (env.NODE_ENV === "production" && environment !== "production") {
    throw new Error("IBFT_ENVIRONMENT must be production when NODE_ENV is production");
  }
  const businessTimezone = env.IBFT_BUSINESS_TIMEZONE ?? "Asia/Karachi";
  if (businessTimezone !== "Asia/Karachi") throw new Error("IBFT_BUSINESS_TIMEZONE must be Asia/Karachi");
  const currency = env.IBFT_CURRENCY ?? "PKR";
  if (currency !== "PKR") throw new Error("IBFT_CURRENCY must be PKR");
  const fiscalMonth = Number(env.IBFT_FISCAL_YEAR_START_MONTH ?? "7");
  if (fiscalMonth !== 7) throw new Error("IBFT_FISCAL_YEAR_START_MONTH must be 7");
  const logLevel = env.IBFT_LOG_LEVEL ?? "info";
  if (!(["debug", "info", "warn", "error"] as const).includes(logLevel as never)) {
    throw new Error("IBFT_LOG_LEVEL must be debug, info, warn, or error");
  }
  const readinessTimeoutMs = Number(env.IBFT_READINESS_TIMEOUT_MS ?? "2000");
  if (!Number.isInteger(readinessTimeoutMs) || readinessTimeoutMs < 250 || readinessTimeoutMs > 10_000) {
    throw new Error("IBFT_READINESS_TIMEOUT_MS must be an integer from 250 to 10000");
  }
  return { environment: environment as RuntimeConfig["environment"], businessTimezone, currency, fiscalYearStartMonth: 7, logLevel: logLevel as RuntimeConfig["logLevel"], readinessTimeoutMs };
}
