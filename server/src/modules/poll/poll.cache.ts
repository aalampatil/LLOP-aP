import { deleteCacheKey, getCacheJson, setCacheJson } from "../../lib/cache";

const POLL_LIST_TTL_SECONDS = 15;
const POLL_DETAIL_TTL_SECONDS = 20;
const PUBLIC_POLL_TTL_SECONDS = 15;

export const pollCacheKeys = {
  list: (userId: string) => `polls:list:${userId}`,
  owned: (userId: string, pollId: string) => `polls:owned:${userId}:${pollId}`,
  analytics: (userId: string, pollId: string) => `polls:analytics:${userId}:${pollId}`,
  public: (slug: string) => `polls:public:${slug}`,
};

export async function getCachedPollList<T>(userId: string) {
  return getCacheJson<T>(pollCacheKeys.list(userId));
}

export async function setCachedPollList(userId: string, value: unknown) {
  return setCacheJson(pollCacheKeys.list(userId), value, POLL_LIST_TTL_SECONDS);
}

export async function getCachedPollDetail<T>(userId: string, pollId: string) {
  return getCacheJson<T>(pollCacheKeys.owned(userId, pollId));
}

export async function setCachedPollDetail(
  userId: string,
  pollId: string,
  value: unknown,
) {
  return setCacheJson(
    pollCacheKeys.owned(userId, pollId),
    value,
    POLL_DETAIL_TTL_SECONDS,
  );
}

export async function getCachedPollAnalytics<T>(userId: string, pollId: string) {
  return getCacheJson<T>(pollCacheKeys.analytics(userId, pollId));
}

export async function setCachedPollAnalytics(
  userId: string,
  pollId: string,
  value: unknown,
) {
  return setCacheJson(
    pollCacheKeys.analytics(userId, pollId),
    value,
    POLL_DETAIL_TTL_SECONDS,
  );
}

export async function getCachedPublicPoll<T>(slug: string) {
  return getCacheJson<T>(pollCacheKeys.public(slug));
}

export async function setCachedPublicPoll(slug: string, value: unknown) {
  return setCacheJson(pollCacheKeys.public(slug), value, PUBLIC_POLL_TTL_SECONDS);
}

export async function invalidatePollCache({
  ownerId,
  pollId,
  slug,
}: {
  ownerId?: string;
  pollId?: string;
  slug?: string;
}) {
  await Promise.all([
    ownerId ? deleteCacheKey(pollCacheKeys.list(ownerId)) : undefined,
    ownerId && pollId ? deleteCacheKey(pollCacheKeys.owned(ownerId, pollId)) : undefined,
    ownerId && pollId
      ? deleteCacheKey(pollCacheKeys.analytics(ownerId, pollId))
      : undefined,
    slug ? deleteCacheKey(pollCacheKeys.public(slug)) : undefined,
  ]);
}
