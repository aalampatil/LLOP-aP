import { and, eq, lte } from "drizzle-orm";
import { db } from "../db";
import { pollsTable } from "../db/schema";
import { getIO } from "../lib/socket";

const EXPIRE_POLL_INTERVAL_MS = 60_000;

export async function expireDuePolls() {
  const expiredAt = new Date();
  const expiredPolls = await db
    .update(pollsTable)
    .set({
      status: "expired",
      updatedAt: expiredAt,
    })
    .where(
      and(
        eq(pollsTable.status, "active"),
        lte(pollsTable.expiresAt, expiredAt),
      ),
    )
    .returning({
      id: pollsTable.id,
      slug: pollsTable.slug,
      title: pollsTable.title,
    });

  if (expiredPolls.length > 0) {
    const io = getIO();
    for (const poll of expiredPolls) {
      io.to(`poll:${poll.id}`).emit("poll:expired", {
        pollId: poll.id,
        slug: poll.slug,
        title: poll.title,
        expiredAt,
      });
    }
    console.log(`expired ${expiredPolls.length} poll(s)`);
  }

  return expiredPolls;
}

export function startPollExpiryJob() {
  expireDuePolls().catch((error) => {
    console.error("poll expiry job failed on startup", error);
  });

  const timer = setInterval(() => {
    expireDuePolls().catch((error) => {
      console.error("poll expiry job failed", error);
    });
  }, EXPIRE_POLL_INTERVAL_MS);

  return () => clearInterval(timer);
}
