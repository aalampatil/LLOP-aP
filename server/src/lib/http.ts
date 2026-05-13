import type { NextFunction, Request, Response } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { usersTable } from "../db/schema";
import { env } from "../env";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function getAdminEmails() {
  return new Set(
    env.ADMIN_EMAILS.split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(email: string) {
  return getAdminEmails().has(email.toLowerCase());
}

export async function getSessionUser(req: Request) {
  const { userId } = getAuth(req);
  if (!userId) return null;

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, userId))
    .limit(1);

  if (existing) {
    if (existing.role !== "admin" && isAdminEmail(existing.email)) {
      const [updated] = await db
        .update(usersTable)
        .set({ role: "admin", updatedAt: new Date() })
        .where(eq(usersTable.id, existing.id))
        .returning();
      return updated ?? existing;
    }

    return existing;
  }

  const clerkUser = await clerkClient.users.getUser(userId);
  const primaryEmail =
    clerkUser.emailAddresses.find(
      (email) => email.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    `${userId}@clerk.local`;
  const fullName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    primaryEmail.split("@")[0] ||
    "Poll creator";

  const [created] = await db
    .insert(usersTable)
    .values({
      clerkUserId: userId,
      name: fullName,
      email: primaryEmail,
      role: isAdminEmail(primaryEmail) ? "admin" : "creator",
    })
    .returning();

  return created;
}

export async function requireSessionUser(req: Request) {
  const user = await getSessionUser(req);
  if (!user) throw new HttpError(401, "Authentication required");
  return user;
}

export async function requireAdminUser(req: Request) {
  const user = await requireSessionUser(req);
  if (user.role !== "admin") throw new HttpError(403, "Admin access required");
  return user;
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }

  if (error instanceof Error) {
    console.error(error);
    const isDatabaseError =
      "code" in error ||
      error.message.startsWith("Failed query:") ||
      error.message.includes("ECONNREFUSED");

    return res.status(500).json({
      error: isDatabaseError
        ? "Database operation failed. Check that Postgres is running and migrations are applied."
        : error.message,
    });
  }

  console.error(error);
  return res.status(500).json({ error: "Internal server error" });
}
