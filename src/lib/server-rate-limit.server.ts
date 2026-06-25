const WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_REPORTS_PER_WINDOW = 24;

type RateLimitRecord = {
  timestamps: number[];
};

const records = new Map<string, RateLimitRecord>();

export function checkServerReportRateLimit(key: string) {
  const now = Date.now();
  const existing = records.get(key) ?? { timestamps: [] };
  const recent = existing.timestamps.filter((timestamp) => now - timestamp < WINDOW_MS);
  const remaining = Math.max(0, MAX_REPORTS_PER_WINDOW - recent.length);

  records.set(key, { timestamps: recent });

  return {
    allowed: recent.length < MAX_REPORTS_PER_WINDOW,
    remaining,
  };
}

export function recordServerReportSubmission(key: string) {
  const now = Date.now();
  const existing = records.get(key) ?? { timestamps: [] };
  const recent = existing.timestamps.filter((timestamp) => now - timestamp < WINDOW_MS);
  recent.push(now);
  records.set(key, { timestamps: recent });
}
