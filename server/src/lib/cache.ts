import Redis from "ioredis";
import { env } from "../env";

const redis = new Redis(env.VALKEY_URL, {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  lazyConnect: true,
});

let connecting: Promise<void> | null = null;

redis.on("error", (error) => {
  console.warn(`Valkey cache unavailable: ${error.message}`);
});

async function ensureCacheConnection() {
  if (redis.status === "ready") return true;
  if (redis.status === "connecting" || redis.status === "connect") {
    await connecting?.catch(() => undefined);
    return redis.status === "ready";
  }

  try {
    connecting ??= redis.connect().then(() => undefined);
    await connecting;
    return true;
  } catch {
    disabled = true;
    return false;
  } finally {
    connecting = null;
  }
}

export async function getCacheJson<T>(key: string): Promise<T | null> {
  if (!(await ensureCacheConnection())) return null;
  const value = await redis.get(key).catch(() => null);
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function setCacheJson(key: string, value: unknown, ttlSeconds: number) {
  if (!(await ensureCacheConnection())) return;
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds).catch(() => undefined);
}

export async function deleteCacheKey(key: string) {
  if (!(await ensureCacheConnection())) return;
  await redis.del(key).catch(() => undefined);
}
