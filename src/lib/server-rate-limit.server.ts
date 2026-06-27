import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_REPORTS_PER_WINDOW = 24;

let redisCache: Redis | null = null;
let upstashRatelimit: Ratelimit | null = null;

// Initialize Upstash if environment variables are present
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redisCache = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    upstashRatelimit = new Ratelimit({
      redis: redisCache,
      limiter: Ratelimit.slidingWindow(MAX_REPORTS_PER_WINDOW, "1 d"),
      analytics: true,
    });
  } catch (err) {
    console.error("Failed to initialize Upstash Redis:", err);
  }
}

// Memory fallback for environments without Redis
type RateLimitRecord = {
  timestamps: number[];
};
const records = new Map<string, RateLimitRecord>();

export async function checkServerReportRateLimit(key: string) {
  if (upstashRatelimit) {
    const { success, remaining } = await upstashRatelimit.limit(key);
    return { allowed: success, remaining };
  }

  // Fallback memory rate limiter
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

export async function recordServerReportSubmission(key: string) {
  if (upstashRatelimit) {
    // Upstash automatically records upon checking limit, 
    // but if we explicitly want to record a submission independently:
    return;
  }
  const now = Date.now();
  const existing = records.get(key) ?? { timestamps: [] };
  const recent = existing.timestamps.filter((timestamp) => now - timestamp < WINDOW_MS);
  recent.push(now);
  records.set(key, { timestamps: recent });
}
