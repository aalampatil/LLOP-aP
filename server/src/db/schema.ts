import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const pollStatusEnum = pgEnum("poll_status", [
  "draft",
  "active",
  "closed",
  "expired",
  "published",
]);

export const questionTypeEnum = pgEnum("question_type", [
  "single_choice",
  "image_choice",
]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const usersTable = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

// ─── Polls ────────────────────────────────────────────────────────────────────

export const pollsTable = pgTable(
  "polls",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdBy: uuid("created_by")
      .references(() => usersTable.id, { onDelete: "cascade" })
      .notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 120 }).default("general").notNull(),
    tags: text("tags").default("[]").notNull(), // JSON string -> string[]
    accentColor: varchar("accent_color", { length: 40 }).default("#B6FF3B").notNull(),
    completionMessage: text("completion_message")
      .default("Your response has been recorded. Thanks for weighing in.")
      .notNull(),
    status: pollStatusEnum("status").default("draft").notNull(),
    isAnonymous: boolean("is_anonymous").default(false).notNull(),
    showLiveResults: boolean("show_live_results").default(false).notNull(),
    expiresAt: timestamp("expires_at"),
    publishedAt: timestamp("published_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    createdByIdx: index("polls_created_by_idx").on(table.createdBy),
    statusIdx: index("polls_status_idx").on(table.status),
    slugIdx: uniqueIndex("polls_slug_idx").on(table.slug),
  }),
);

// ─── JSONB Types ──────────────────────────────────────────────────────────────

export type QuestionOption = {
  id: string;
  label: string;
  imageUrl: string | null;
};

// ─── Questions ────────────────────────────────────────────────────────────────

export const questionsTable = pgTable(
  "questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pollId: uuid("poll_id")
      .references(() => pollsTable.id, { onDelete: "cascade" })
      .notNull(),
    question: text("question").notNull(),
    questionType: questionTypeEnum("question_type")
      .default("single_choice")
      .notNull(),
    options: text("options").notNull(), // JSON string → QuestionOption[]
    isMandatory: boolean("is_mandatory").default(true).notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    pollIdIdx: index("questions_poll_id_idx").on(table.pollId),
  }),
);

// ─── Responses ────────────────────────────────────────────────────────────────

export const responsesTable = pgTable(
  "responses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    pollId: uuid("poll_id")
      .references(() => pollsTable.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    respondentName: varchar("respondent_name", { length: 255 }),
    respondentEmail: varchar("respondent_email", { length: 255 }),
    submissionToken: varchar("submission_token", { length: 255 }).unique(),
    userAgent: text("user_agent"),
    submittedAt: timestamp("submitted_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    pollIdIdx: index("responses_poll_id_idx").on(table.pollId),
    userIdIdx: index("responses_user_id_idx").on(table.userId),
    oneResponsePerUserPerPoll: uniqueIndex(
      "one_response_per_user_per_poll_idx",
    ).on(table.pollId, table.userId),
  }),
);

// ─── Question Responses ───────────────────────────────────────────────────────

export const questionResponsesTable = pgTable(
  "question_responses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    responseId: uuid("response_id")
      .references(() => responsesTable.id, { onDelete: "cascade" })
      .notNull(),
    questionId: uuid("question_id")
      .references(() => questionsTable.id, { onDelete: "cascade" })
      .notNull(),
    selectedOptionId: varchar("selected_option_id", { length: 255 }),
    answeredAt: timestamp("answered_at").defaultNow().notNull(),
  },
  (table) => ({
    questionIdIdx: index("qr_question_id_idx").on(table.questionId),
    responseIdIdx: index("qr_response_id_idx").on(table.responseId),
    oneAnswerPerQuestionPerResponse: uniqueIndex(
      "one_answer_per_question_per_response_idx",
    ).on(table.responseId, table.questionId),
  }),
);
