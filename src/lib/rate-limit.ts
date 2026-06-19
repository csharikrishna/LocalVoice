const RATE_LIMIT_KEY = `${(import.meta.env.VITE_APP_NAME || "localvoice").toLowerCase().replace(/\s+/g, "_")}_reports_dev`;
const MAX_REPORTS_PER_DAY = 24;

interface ReportRecord {
  timestamp: number;
}

export function checkRateLimit(): { allowed: boolean; remaining: number } {
  try {
    const stored = localStorage.getItem(RATE_LIMIT_KEY);
    const records: ReportRecord[] = stored ? JSON.parse(stored) : [];
    
    // Filter records from the last 24 hours
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const recentRecords = records.filter(r => now - r.timestamp < oneDayMs);
    
    // Cleanup old records to save space
    if (records.length !== recentRecords.length) {
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recentRecords));
    }

    const remaining = Math.max(0, MAX_REPORTS_PER_DAY - recentRecords.length);
    
    return {
      allowed: recentRecords.length < MAX_REPORTS_PER_DAY,
      remaining
    };
  } catch (error) {
    console.error("Rate limit check failed", error);
    // Fail open if localStorage is broken/blocked
    return { allowed: true, remaining: 1 };
  }
}

export function recordReportSubmission(): void {
  try {
    const stored = localStorage.getItem(RATE_LIMIT_KEY);
    const records: ReportRecord[] = stored ? JSON.parse(stored) : [];
    
    records.push({ timestamp: Date.now() });
    
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(records));
  } catch (error) {
    console.error("Failed to record submission", error);
  }
}
