import { deleteCacheKey, getCacheJson, setCacheJson } from "../../lib/cache";

const ADMIN_OVERVIEW_CACHE_KEY = "admin:overview:v1";
const ADMIN_OVERVIEW_CACHE_TTL_SECONDS = 20;

export function getCachedAdminOverview<T>() {
  return getCacheJson<T>(ADMIN_OVERVIEW_CACHE_KEY);
}

export function setCachedAdminOverview(value: unknown) {
  return setCacheJson(
    ADMIN_OVERVIEW_CACHE_KEY,
    value,
    ADMIN_OVERVIEW_CACHE_TTL_SECONDS,
  );
}

export function invalidateAdminOverviewCache() {
  return deleteCacheKey(ADMIN_OVERVIEW_CACHE_KEY);
}
