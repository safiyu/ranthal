type RateLimitRecord = {
    count: number;
    lastAttempt: number;
};

const rateLimitMap = new Map<string, RateLimitRecord>();

// Cleanup every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
        if (now - record.lastAttempt > 60 * 1000 * 10) { // 10 mins
            rateLimitMap.delete(key);
        }
    }
}, 60 * 1000 * 10);

export function checkRateLimit(ip: string, limit: number = 5, windowMs: number = 60 * 1000): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const record = rateLimitMap.get(ip);

    if (!record) {
        rateLimitMap.set(ip, { count: 1, lastAttempt: now });
        return { allowed: true, remaining: limit - 1 };
    }

    // Reset if outside window
    if (now - record.lastAttempt > windowMs) {
        rateLimitMap.set(ip, { count: 1, lastAttempt: now });
        return { allowed: true, remaining: limit - 1 };
    }

    if (record.count >= limit) {
        return { allowed: false, remaining: 0 };
    }

    record.count += 1;
    record.lastAttempt = now;
    return { allowed: true, remaining: limit - record.count };
}
