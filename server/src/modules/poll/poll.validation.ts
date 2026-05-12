import { z } from "zod";

const questionInput = z.object({
  question: z.string().trim().min(4).max(500),
  isMandatory: z.boolean().default(true),
  options: z
    .array(
      z.union([
        z.string().trim().min(1),
        z.object({
          id: z.string().optional(),
          label: z.string().trim().min(1),
          imageUrl: z.string().url().nullable().optional(),
        }),
      ]),
    )
    .min(2)
    .max(8),
});

export const createPollInput = z.object({
  title: z.string().trim().min(4).max(255),
  customSlug: z.string().trim().min(3).max(120).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  category: z.string().trim().min(1).max(120).default("general"),
  tags: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  accentColor: z.string().trim().min(3).max(40).default("#B6FF3B"),
  completionMessage: z
    .string()
    .trim()
    .min(4)
    .max(500)
    .default("Your response has been recorded. Thanks for weighing in."),
  isAnonymous: z.boolean().default(true),
  showLiveResults: z.boolean().default(false),
  expiresAt: z.string().datetime().optional().nullable(),
  questions: z.array(questionInput).min(1).max(20),
});

export const submitPollInput = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selectedOptionId: z.string().min(1),
    }),
  ),
  submissionToken: z.string().trim().min(12).max(255).optional(),
  respondentName: z.string().trim().max(255).optional(),
  respondentEmail: z.string().email().max(255).optional(),
});
