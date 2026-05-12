import { newQuestion } from "./poll-utils";
import type { BuilderQuestion } from "../types/poll";

export type PollBuilderState = {
  title: string;
  customSlug: string;
  description: string;
  category: string;
  tags: string;
  accentColor: string;
  expiresAt: string;
  isAnonymous: boolean;
  showLiveResults: boolean;
  completionMessage: string;
  questions: BuilderQuestion[];
};

function createStarterQuestion(): BuilderQuestion {
  return {
    ...newQuestion(),
    question: "Which direction should we prioritize first?",
    options: [
      { id: crypto.randomUUID(), label: "Speed and simplicity" },
      { id: crypto.randomUUID(), label: "Richer analytics" },
      { id: crypto.randomUUID(), label: "Team collaboration" },
    ],
  };
}

export function createInitialPollBuilderState(): PollBuilderState {
  return {
    title: "Customer Pulse Sprint",
    customSlug: "",
    description: "Help us choose the next priority.",
    category: "Product",
    tags: "hackathon, launch, feedback",
    accentColor: "#B6FF3B",
    expiresAt: "",
    isAnonymous: true,
    showLiveResults: false,
    completionMessage:
      "Your response has been recorded. Thanks for sharing your input.",
    questions: [createStarterQuestion()],
  };
}

export function toCreatePollPayload(form: PollBuilderState) {
  return {
    title: form.title,
    customSlug: form.customSlug || undefined,
    description: form.description,
    category: form.category,
    tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    accentColor: form.accentColor,
    completionMessage: form.completionMessage,
    expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    isAnonymous: form.isAnonymous,
    showLiveResults: form.showLiveResults,
    questions: form.questions.map((question) => ({
      question: question.question,
      isMandatory: question.isMandatory,
      options: question.options.filter((option) => option.label.trim()),
    })),
  };
}
