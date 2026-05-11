import type { ReactNode } from "react";

export type PollOption = {
  id: string;
  label: string;
  imageUrl: string | null;
};

export type Question = {
  id: string;
  question: string;
  isMandatory: boolean;
  displayOrder: number;
  options: PollOption[];
};

export type Poll = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  tags: string[];
  accentColor: string;
  completionMessage: string;
  status: "draft" | "active" | "closed" | "expired" | "published";
  isAnonymous: boolean;
  showLiveResults: boolean;
  expiresAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  questions: Question[];
};

export type AnalyticsOption = PollOption & {
  count: number;
  percentage: number;
};

export type AnalyticsQuestion = {
  id: string;
  question: string;
  isMandatory: boolean;
  totalAnswers: number;
  skipped: number;
  options: AnalyticsOption[];
};

export type Analytics = {
  totalResponses: number;
  authenticatedResponses: number;
  anonymousResponses: number;
  firstResponseAt: string | null;
  lastResponseAt: string | null;
  completionRate: number;
  questions: AnalyticsQuestion[];
};

export type PollSummary = Poll & {
  expired: boolean;
  analytics: Analytics;
};

export type BuilderQuestion = {
  id: string;
  question: string;
  isMandatory: boolean;
  options: { id: string; label: string }[];
};

export type PublicState = {
  expired: boolean;
  acceptingResponses: boolean;
  resultsVisible: boolean;
  authRequired: boolean;
};

export type IconNode = ReactNode;
