import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import {
  pollsTable,
  questionResponsesTable,
  questionsTable,
  responsesTable,
} from "../../db/schema";
import { getIO } from "../../lib/socket";
import { HttpError, getSessionUser, requireSessionUser } from "../../lib/http";
import {
  assertAnonymousRateLimit,
  csvCell,
  stringParam,
} from "./poll.request-utils";
import {
  buildAnalytics,
  isAcceptingResponses,
  loadPollBySlug,
  loadPollForOwner,
  makeUniqueSlug,
  normalizeOptions,
  parseJson,
  serializePoll,
} from "./poll.service";
import { createPollInput, submitPollInput } from "./poll.validation";

export async function listPolls(req: Request, res: Response) {
  const user = await requireSessionUser(req);
  const polls = await db
    .select()
    .from(pollsTable)
    .where(eq(pollsTable.createdBy, user.id))
    .orderBy(desc(pollsTable.updatedAt));

  const withAnalytics = await Promise.all(
    polls.map(async (poll) => ({
      ...poll,
      tags: parseJson<string[]>(poll.tags, []),
      expired: Boolean(poll.expiresAt && poll.expiresAt.getTime() <= Date.now()),
      analytics: await buildAnalytics(poll.id),
    })),
  );

  return res.json({ polls: withAnalytics });
}

export async function createPoll(req: Request, res: Response) {
  const user = await requireSessionUser(req);
  const input = createPollInput.parse(req.body);
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    throw new HttpError(400, "Expiry must be in the future");
  }

  const normalizedQuestions = input.questions.map((question) => {
    const options = normalizeOptions(question.options);
    if (options.length < 2) {
      throw new HttpError(400, "Every question needs at least two options");
    }
    return { ...question, options };
  });

  const slug = await makeUniqueSlug(input.customSlug || input.title);

  const poll = await db.transaction(async (tx) => {
    const [createdPoll] = await tx
      .insert(pollsTable)
      .values({
        createdBy: user.id,
        slug,
        title: input.title,
        description: input.description || null,
        category: input.category,
        tags: JSON.stringify(input.tags),
        accentColor: input.accentColor,
        completionMessage: input.completionMessage,
        isAnonymous: input.isAnonymous,
        showLiveResults: input.showLiveResults,
        expiresAt,
        status: "active",
      })
      .returning();

    if (!createdPoll) throw new HttpError(500, "Poll could not be created");

    await tx.insert(questionsTable).values(
      normalizedQuestions.map((question, index) => ({
        pollId: createdPoll.id,
        question: question.question,
        isMandatory: question.isMandatory,
        options: JSON.stringify(question.options),
        displayOrder: index,
      })),
    );

    return createdPoll;
  });

  const loaded = await loadPollForOwner(poll.id, user.id);
  if (!loaded) throw new HttpError(500, "Poll could not be loaded");

  return res.status(201).json({ poll: serializePoll(loaded.poll, loaded.questions) });
}

export async function getOwnedPoll(req: Request, res: Response) {
  const user = await requireSessionUser(req);
  const pollId = stringParam(req.params.id, "Poll id");

  const loaded = await loadPollForOwner(pollId, user.id);
  if (!loaded) throw new HttpError(404, "Poll not found");

  return res.json({
    poll: serializePoll(loaded.poll, loaded.questions),
    analytics: await buildAnalytics(loaded.poll.id),
  });
}

export async function publishPoll(req: Request, res: Response) {
  const user = await requireSessionUser(req);
  const pollId = stringParam(req.params.id, "Poll id");

  const loaded = await loadPollForOwner(pollId, user.id);
  if (!loaded) throw new HttpError(404, "Poll not found");

  const [updated] = await db
    .update(pollsTable)
    .set({
      status: "published",
      publishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(pollsTable.id, pollId), eq(pollsTable.createdBy, user.id)))
    .returning();

  if (!updated) throw new HttpError(404, "Poll not found");

  const analytics = await buildAnalytics(updated.id);
  getIO().to(`poll:${updated.id}`).emit("poll:published", {
    pollId: updated.id,
    analytics,
  });

  return res.json({ poll: serializePoll(updated, loaded.questions), analytics });
}

export async function closePoll(req: Request, res: Response) {
  const user = await requireSessionUser(req);
  const pollId = stringParam(req.params.id, "Poll id");

  const loaded = await loadPollForOwner(pollId, user.id);
  if (!loaded) throw new HttpError(404, "Poll not found");
  if (loaded.poll.status === "published") {
    throw new HttpError(409, "Published polls cannot be closed");
  }

  const [updated] = await db
    .update(pollsTable)
    .set({
      status: "closed",
      updatedAt: new Date(),
    })
    .where(and(eq(pollsTable.id, pollId), eq(pollsTable.createdBy, user.id)))
    .returning();

  if (!updated) throw new HttpError(404, "Poll not found");

  const analytics = await buildAnalytics(updated.id);
  getIO().to(`poll:${updated.id}`).emit("poll:closed", {
    pollId: updated.id,
    analytics,
  });

  return res.json({ poll: serializePoll(updated, loaded.questions), analytics });
}

export async function reopenPoll(req: Request, res: Response) {
  const user = await requireSessionUser(req);
  const pollId = stringParam(req.params.id, "Poll id");

  const loaded = await loadPollForOwner(pollId, user.id);
  if (!loaded) throw new HttpError(404, "Poll not found");
  if (loaded.poll.status === "published") {
    throw new HttpError(409, "Published polls cannot be reopened");
  }
  if (loaded.poll.expiresAt && loaded.poll.expiresAt.getTime() <= Date.now()) {
    throw new HttpError(409, "Expired polls cannot be reopened");
  }

  const [updated] = await db
    .update(pollsTable)
    .set({
      status: "active",
      updatedAt: new Date(),
    })
    .where(and(eq(pollsTable.id, pollId), eq(pollsTable.createdBy, user.id)))
    .returning();

  if (!updated) throw new HttpError(404, "Poll not found");

  const analytics = await buildAnalytics(updated.id);
  getIO().to(`poll:${updated.id}`).emit("poll:reopened", {
    pollId: updated.id,
    analytics,
  });

  return res.json({ poll: serializePoll(updated, loaded.questions), analytics });
}

export async function duplicatePoll(req: Request, res: Response) {
  const user = await requireSessionUser(req);
  const pollId = stringParam(req.params.id, "Poll id");

  const loaded = await loadPollForOwner(pollId, user.id);
  if (!loaded) throw new HttpError(404, "Poll not found");

  const title = `${loaded.poll.title} Copy`;
  const slug = await makeUniqueSlug(title);
  const duplicated = await db.transaction(async (tx) => {
    const [createdPoll] = await tx
      .insert(pollsTable)
      .values({
        createdBy: user.id,
        slug,
        title,
        description: loaded.poll.description,
        category: loaded.poll.category,
        tags: loaded.poll.tags,
        accentColor: loaded.poll.accentColor,
        completionMessage: loaded.poll.completionMessage,
        status: "draft",
        isAnonymous: loaded.poll.isAnonymous,
        showLiveResults: loaded.poll.showLiveResults,
        expiresAt: null,
      })
      .returning();

    if (!createdPoll) throw new HttpError(500, "Poll could not be duplicated");

    await tx.insert(questionsTable).values(
      loaded.questions.map((question, index) => ({
        pollId: createdPoll.id,
        question: question.question,
        questionType: question.questionType,
        options: question.options,
        isMandatory: question.isMandatory,
        displayOrder: index,
      })),
    );

    return createdPoll;
  });

  const duplicatedLoaded = await loadPollForOwner(duplicated.id, user.id);
  if (!duplicatedLoaded) throw new HttpError(500, "Duplicated poll could not be loaded");

  return res.status(201).json({
    poll: serializePoll(duplicatedLoaded.poll, duplicatedLoaded.questions),
    analytics: await buildAnalytics(duplicatedLoaded.poll.id),
  });
}

export async function exportResponses(req: Request, res: Response) {
  const user = await requireSessionUser(req);
  const pollId = stringParam(req.params.id, "Poll id");

  const loaded = await loadPollForOwner(pollId, user.id);
  if (!loaded) throw new HttpError(404, "Poll not found");

  const responses = await db
    .select()
    .from(responsesTable)
    .where(eq(responsesTable.pollId, pollId))
    .orderBy(asc(responsesTable.submittedAt));

  const responseIds = responses.map((response) => response.id);
  const answers =
    responseIds.length > 0
      ? await db
          .select()
          .from(questionResponsesTable)
          .where(inArray(questionResponsesTable.responseId, responseIds))
      : [];

  const optionLabelsByQuestion = new Map<string, Map<string, string>>();
  for (const question of loaded.questions) {
    const options = parseJson<{ id: string; label: string }[]>(question.options, []);
    optionLabelsByQuestion.set(
      question.id,
      new Map(options.map((option) => [option.id, option.label])),
    );
  }

  const answersByResponse = new Map<string, Map<string, string>>();
  for (const answer of answers) {
    const labels = optionLabelsByQuestion.get(answer.questionId);
    const answerText = labels?.get(answer.selectedOptionId ?? "") ?? answer.selectedOptionId ?? "";
    const row = answersByResponse.get(answer.responseId) ?? new Map<string, string>();
    row.set(answer.questionId, answerText);
    answersByResponse.set(answer.responseId, row);
  }

  const header = [
    "response_id",
    "submitted_at",
    "respondent_name",
    "respondent_email",
    "authenticated_user_id",
    ...loaded.questions.map((question) => question.question),
  ];

  const rows = responses.map((response) => {
    const responseAnswers = answersByResponse.get(response.id) ?? new Map<string, string>();
    return [
      response.id,
      response.submittedAt,
      response.respondentName,
      response.respondentEmail,
      response.userId,
      ...loaded.questions.map((question) => responseAnswers.get(question.id) ?? ""),
    ];
  });

  const csv = [header, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\n");

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${loaded.poll.slug}-responses.csv"`,
  );
  return res.send(csv);
}

export async function listResponses(req: Request, res: Response) {
  const user = await requireSessionUser(req);
  const pollId = stringParam(req.params.id, "Poll id");

  const loaded = await loadPollForOwner(pollId, user.id);
  if (!loaded) throw new HttpError(404, "Poll not found");

  const responses = await db
    .select()
    .from(responsesTable)
    .where(eq(responsesTable.pollId, pollId))
    .orderBy(desc(responsesTable.submittedAt));

  const responseIds = responses.map((response) => response.id);
  const answers =
    responseIds.length > 0
      ? await db
          .select()
          .from(questionResponsesTable)
          .where(inArray(questionResponsesTable.responseId, responseIds))
      : [];

  const questionsById = new Map(
    loaded.questions.map((question) => [
      question.id,
      {
        question: question.question,
        options: new Map(
          parseJson<{ id: string; label: string }[]>(question.options, []).map(
            (option) => [option.id, option.label],
          ),
        ),
      },
    ]),
  );

  const answersByResponse = new Map<string, {
    questionId: string;
    question: string;
    selectedOptionId: string | null;
    selectedOptionLabel: string;
  }[]>();

  for (const answer of answers) {
    const question = questionsById.get(answer.questionId);
    const row = answersByResponse.get(answer.responseId) ?? [];
    row.push({
      questionId: answer.questionId,
      question: question?.question ?? "Unknown question",
      selectedOptionId: answer.selectedOptionId,
      selectedOptionLabel:
        question?.options.get(answer.selectedOptionId ?? "") ??
        answer.selectedOptionId ??
        "",
    });
    answersByResponse.set(answer.responseId, row);
  }

  return res.json({
    responses: responses.map((response) => ({
      id: response.id,
      submittedAt: response.submittedAt,
      respondentName: response.respondentName,
      respondentEmail: response.respondentEmail,
      userId: response.userId,
      isAnonymous: !response.userId,
      answers: loaded.questions
        .map((question) =>
          (answersByResponse.get(response.id) ?? []).find(
            (answer) => answer.questionId === question.id,
          ),
        )
        .filter(Boolean),
    })),
  });
}

export async function getPublicPoll(req: Request, res: Response) {
  const slug = stringParam(req.params.slug, "Poll slug");

  const loaded = await loadPollBySlug(slug);
  if (!loaded) throw new HttpError(404, "Poll not found");

  const expired = Boolean(
    loaded.poll.expiresAt && loaded.poll.expiresAt.getTime() <= Date.now(),
  );
  const analytics =
    loaded.poll.status === "published" || loaded.poll.showLiveResults
      ? await buildAnalytics(loaded.poll.id)
      : null;

  return res.json({
    poll: serializePoll(loaded.poll, loaded.questions),
    state: {
      expired,
      acceptingResponses: isAcceptingResponses(loaded.poll),
      resultsVisible: loaded.poll.status === "published" || loaded.poll.showLiveResults,
      authRequired: !loaded.poll.isAnonymous,
    },
    analytics,
  });
}

export async function submitPoll(req: Request, res: Response) {
  const slug = stringParam(req.params.slug, "Poll slug");

  const input = submitPollInput.parse(req.body);
  const loaded = await loadPollBySlug(slug);
  if (!loaded) throw new HttpError(404, "Poll not found");
  if (!isAcceptingResponses(loaded.poll)) {
    throw new HttpError(409, "This poll is no longer accepting responses");
  }

  const sessionUser = await getSessionUser(req);
  if (!loaded.poll.isAnonymous && !sessionUser) {
    throw new HttpError(401, "Sign in to answer this poll");
  }
  if (loaded.poll.isAnonymous) {
    assertAnonymousRateLimit(req, loaded.poll.id);
    if (!input.submissionToken?.startsWith(`${loaded.poll.id}:`)) {
      throw new HttpError(400, "Submission token is required");
    }
  }

  const requiredQuestionIds = loaded.questions
    .filter((question) => question.isMandatory)
    .map((question) => question.id);
  const answerMap = new Map(
    input.answers.map((answer) => [answer.questionId, answer.selectedOptionId]),
  );

  for (const questionId of requiredQuestionIds) {
    if (!answerMap.has(questionId)) {
      throw new HttpError(400, "Please answer every mandatory question");
    }
  }

  for (const answer of input.answers) {
    const question = loaded.questions.find((item) => item.id === answer.questionId);
    if (!question) throw new HttpError(400, "Invalid question in response");
    const options = parseJson<{ id: string }[]>(question.options, []);
    if (!options.some((option) => option.id === answer.selectedOptionId)) {
      throw new HttpError(400, "Invalid option selected");
    }
  }

  if (sessionUser) {
    const [existing] = await db
      .select({ id: responsesTable.id })
      .from(responsesTable)
      .where(
        and(
          eq(responsesTable.pollId, loaded.poll.id),
          eq(responsesTable.userId, sessionUser.id),
        ),
      )
      .limit(1);
    if (existing) throw new HttpError(409, "You have already submitted this poll");
  }

  const submissionToken =
    input.submissionToken ?? `${loaded.poll.id}:${crypto.randomUUID()}`;

  const [existingTokenResponse] = await db
    .select({ id: responsesTable.id })
    .from(responsesTable)
    .where(
      and(
        eq(responsesTable.pollId, loaded.poll.id),
        eq(responsesTable.submissionToken, submissionToken),
      ),
    )
    .limit(1);

  if (existingTokenResponse) {
    throw new HttpError(409, "You have already submitted this poll");
  }

  const response = await db
    .transaction(async (tx) => {
      const [createdResponse] = await tx
        .insert(responsesTable)
        .values({
          pollId: loaded.poll.id,
          userId: loaded.poll.isAnonymous ? null : sessionUser?.id,
          respondentName: loaded.poll.isAnonymous ? input.respondentName : sessionUser?.name,
          respondentEmail: loaded.poll.isAnonymous ? input.respondentEmail : sessionUser?.email,
          submissionToken,
          userAgent: req.headers["user-agent"] ?? null,
        })
        .returning();

      if (!createdResponse) throw new HttpError(500, "Response could not be saved");

      const cleanAnswers = input.answers.filter((answer) => answerMap.has(answer.questionId));
      if (cleanAnswers.length > 0) {
        await tx.insert(questionResponsesTable).values(
          cleanAnswers.map((answer) => ({
            responseId: createdResponse.id,
            questionId: answer.questionId,
            selectedOptionId: answer.selectedOptionId,
          })),
        );
      }

      return createdResponse;
    })
    .catch((error: unknown) => {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new HttpError(409, "You have already submitted this poll");
      }

      throw error;
    });

  const analytics = await buildAnalytics(loaded.poll.id);
  getIO().to(`poll:${loaded.poll.id}`).emit("analytics:update", {
    pollId: loaded.poll.id,
    analytics,
  });

  return res.status(201).json({
    responseId: response.id,
    message: loaded.poll.completionMessage,
    analytics: loaded.poll.showLiveResults ? analytics : null,
  });
}

export async function getAnalytics(req: Request, res: Response) {
  const user = await requireSessionUser(req);
  const pollId = stringParam(req.params.id, "Poll id");

  const loaded = await loadPollForOwner(pollId, user.id);
  if (!loaded) throw new HttpError(404, "Poll not found");

  return res.json({
    poll: serializePoll(loaded.poll, loaded.questions),
    analytics: await buildAnalytics(loaded.poll.id),
  });
}

export async function currentUser(req: Request, res: Response) {
  const auth = getAuth(req);
  if (!auth.userId) return res.json({ user: null });
  return res.json({ user: await requireSessionUser(req) });
}
