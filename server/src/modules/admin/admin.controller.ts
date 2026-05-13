import type { Request, Response } from "express";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "../../db";
import { pollsTable, responsesTable, usersTable } from "../../db/schema";
import { HttpError, isAdminEmail, requireAdminUser } from "../../lib/http";
import { getIO } from "../../lib/socket";
import { buildAnalytics, parseJson } from "../poll/poll.service";
import {
  getCachedAdminOverview,
  invalidateAdminOverviewCache,
  setCachedAdminOverview,
} from "./admin.cache";

function stringParam(value: string | string[] | undefined, name: string) {
  if (Array.isArray(value)) return value[0] ?? "";
  if (value) return value;
  throw new HttpError(400, `${name} is required`);
}

export async function getAdminOverview(req: Request, res: Response) {
  await requireAdminUser(req);

  const cachedOverview = await getCachedAdminOverview();
  if (cachedOverview) return res.json(cachedOverview);

  const [
    users,
    polls,
    responseCountsByPoll,
    responseCountsByUser,
    [responseTotals],
  ] = await Promise.all([
    db.select().from(usersTable).orderBy(desc(usersTable.createdAt)),
    db.select().from(pollsTable).orderBy(desc(pollsTable.updatedAt)),
    db
      .select({
        pollId: responsesTable.pollId,
        count: sql<number>`count(*)::int`,
      })
      .from(responsesTable)
      .groupBy(responsesTable.pollId),
    db
      .select({
        userId: responsesTable.userId,
        count: sql<number>`count(*)::int`,
      })
      .from(responsesTable)
      .where(sql`${responsesTable.userId} is not null`)
      .groupBy(responsesTable.userId),
    db
      .select({
        totalResponses: sql<number>`count(*)::int`,
        anonymousResponses: sql<number>`count(*) filter (where ${responsesTable.userId} is null)::int`,
      })
      .from(responsesTable),
  ]);

  const responsesByPoll = new Map(
    responseCountsByPoll.map((row) => [row.pollId, row.count]),
  );
  const responsesByUser = new Map(
    responseCountsByUser
      .filter((row) => row.userId)
      .map((row) => [row.userId as string, row.count]),
  );
  const pollsByUser = polls.reduce<Map<string, number>>((counts, poll) => {
    counts.set(poll.createdBy, (counts.get(poll.createdBy) ?? 0) + 1);
    return counts;
  }, new Map());
  const usersById = new Map(users.map((user) => [user.id, user]));
  const activePolls = polls.filter((poll) => poll.status === "active").length;
  const publishedPolls = polls.filter((poll) => poll.status === "published").length;

  const overview = {
    stats: {
      totalUsers: users.length,
      totalPolls: polls.length,
      activePolls,
      publishedPolls,
      totalResponses: responseTotals?.totalResponses ?? 0,
      anonymousResponses: responseTotals?.anonymousResponses ?? 0,
    },
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      pollCount: pollsByUser.get(user.id) ?? 0,
      responseCount: responsesByUser.get(user.id) ?? 0,
    })),
    polls: polls.map((poll) => {
      const owner = usersById.get(poll.createdBy);
      return {
        id: poll.id,
        slug: poll.slug,
        title: poll.title,
        category: poll.category,
        tags: parseJson<string[]>(poll.tags, []),
        status: poll.status,
        isAnonymous: poll.isAnonymous,
        showLiveResults: poll.showLiveResults,
        expiresAt: poll.expiresAt,
        publishedAt: poll.publishedAt,
        createdAt: poll.createdAt,
        updatedAt: poll.updatedAt,
        responseCount: responsesByPoll.get(poll.id) ?? 0,
        owner: owner
          ? {
              id: owner.id,
              name: owner.name,
              email: owner.email,
            }
          : null,
      };
    }),
  };

  await setCachedAdminOverview(overview);

  return res.json(overview);
}

export async function closePollAsAdmin(req: Request, res: Response) {
  await requireAdminUser(req);
  const pollId = stringParam(req.params.id, "Poll id");

  const [updated] = await db
    .update(pollsTable)
    .set({ status: "closed", updatedAt: new Date() })
    .where(and(eq(pollsTable.id, pollId), ne(pollsTable.status, "published")))
    .returning();

  if (!updated) {
    throw new HttpError(404, "Poll not found or cannot be closed");
  }

  const analytics = await buildAnalytics(updated.id);
  await invalidateAdminOverviewCache();
  getIO().to(`poll:${updated.id}`).emit("poll:closed", {
    pollId: updated.id,
    analytics,
  });

  return res.json({ poll: updated, analytics });
}

export async function updateUserRoleAsAdmin(req: Request, res: Response) {
  const admin = await requireAdminUser(req);
  const userId = stringParam(req.params.id, "User id");
  const role = typeof req.body?.role === "string" ? req.body.role : "";

  if (!["admin", "creator"].includes(role)) {
    throw new HttpError(400, "Role must be admin or creator");
  }
  if (userId === admin.id && role !== "admin") {
    throw new HttpError(409, "You cannot remove your own admin access");
  }

  const [targetUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!targetUser) throw new HttpError(404, "User not found");
  if (role !== "admin" && isAdminEmail(targetUser.email)) {
    throw new HttpError(409, "This user is protected by the admin email allowlist");
  }

  const [updated] = await db
    .update(usersTable)
    .set({ role, updatedAt: new Date() })
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updated) throw new HttpError(404, "User not found");

  await invalidateAdminOverviewCache();

  return res.json({
    user: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
  });
}
