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

export type ResponseDetail = {
  id: string;
  submittedAt: string;
  respondentName: string | null;
  respondentEmail: string | null;
  userId: string | null;
  isAnonymous: boolean;
  answers: {
    questionId: string;
    question: string;
    selectedOptionId: string | null;
    selectedOptionLabel: string;
  }[];
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

export type CurrentUser = {
  id: string;
  clerkUserId: string;
  name: string;
  email: string;
  role: "admin" | "creator" | string;
  createdAt: string;
  updatedAt: string;
};

export type AdminOverview = {
  stats: {
    totalUsers: number;
    totalPolls: number;
    activePolls: number;
    publishedPolls: number;
    totalResponses: number;
    anonymousResponses: number;
  };
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    updatedAt?: string;
    pollCount: number;
    responseCount: number;
  }[];
  polls: {
    id: string;
    slug: string;
    title: string;
    category: string;
    tags: string[];
    status: Poll["status"];
    isAnonymous: boolean;
    showLiveResults: boolean;
    expiresAt: string | null;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
    responseCount: number;
    owner: {
      id: string;
      name: string;
      email: string;
    } | null;
  }[];
};
