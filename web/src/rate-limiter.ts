export class RateLimiter {
  private storage: any;
  private alarmScheduled: boolean;

  constructor(ctx: any) {
    this.storage = ctx.storage;
    this.alarmScheduled = false;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');
    if (!key) {
      return new Response('Missing key', { status: 400 });
    }
    const limit = parseInt(url.searchParams.get('limit') || '100', 10);
    const windowMs = parseInt(url.searchParams.get('windowMs') || '60000', 10);

    const now = Date.now();
    const record = await this.storage.get(key);
    let entry: { count: number; resetTime: number };

    if (!record || now > record.resetTime) {
      entry = { count: 1, resetTime: now + windowMs };
    } else {
      entry = { count: record.count + 1, resetTime: record.resetTime };
    }

    await this.storage.put(key, entry);

    if (!this.alarmScheduled) {
      await this.storage.setAlarm(entry.resetTime);
      this.alarmScheduled = true;
    }

    const allowed = entry.count <= limit;
    return new Response(JSON.stringify({
      allowed,
      remaining: Math.max(0, limit - entry.count),
      resetAt: entry.resetTime,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async alarm(): Promise<void> {
    this.alarmScheduled = false;
    const now = Date.now();
    const entries = await this.storage.list();
    for (const [key, entry] of entries) {
      if (now > entry.resetTime) {
        await this.storage.delete(key);
      }
    }
  }
}