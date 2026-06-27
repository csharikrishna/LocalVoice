import "node:process";

/**
 * Centralized environment variable reader for server-side code.
 *
 * On Vercel serverless functions (Nitro output), `import.meta.env` may not be
 * populated for server-side code. This helper checks `process.env` first
 * (reliable on all Node.js runtimes), then falls back to `import.meta.env`
 * (works in Vite dev server).
 *
 * Use this for ALL server-side env reads instead of raw `process.env` or
 * `import.meta.env` to avoid production vs localhost discrepancies.
 */
export function getEnv(name: string): string | undefined {
  return process.env[name] || (import.meta as any).env?.[name] || undefined;
}

/**
 * Like getEnv, but throws if the value is missing.
 */
export function requireEnv(name: string): string {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`Required environment variable "${name}" is not set.`);
  }
  return value;
}

// ── Commonly used env shortcuts ──

export function getAppName(): string {
  return getEnv("VITE_APP_NAME") || "LocalVoice";
}

export function getAppDomain(): string {
  return getAppName().toLowerCase().replace(/\s+/g, "");
}

export function getAppUrl(): string {
  return getEnv("VITE_APP_URL") || "https://localvoicee.vercel.app";
}

export function getAdminEmail(): string | undefined {
  return getEnv("VITE_ADMIN_EMAIL") || getEnv("ADMIN_EMAIL");
}

export function getAdminUsername(): string | undefined {
  return getEnv("VITE_ADMIN_USERNAME");
}

export function getStandardAdminUsername(): string | undefined {
  return getEnv("VITE_STANDARD_ADMIN_USERNAME");
}
