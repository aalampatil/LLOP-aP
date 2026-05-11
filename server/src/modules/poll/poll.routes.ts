import { Router } from "express";
import { asyncHandler } from "../../lib/http";
import {
  createPoll,
  getAnalytics,
  closePoll,
  duplicatePoll,
  exportResponses,
  getOwnedPoll,
  getPublicPoll,
  listPolls,
  publishPoll,
  reopenPoll,
  submitPoll,
} from "./poll.controller";

export const pollRouter = Router();

pollRouter.get("/", asyncHandler(listPolls));
pollRouter.post("/", asyncHandler(createPoll));
pollRouter.get("/public/:slug", asyncHandler(getPublicPoll));
pollRouter.post("/public/:slug/submit", asyncHandler(submitPoll));
pollRouter.get("/:id/export.csv", asyncHandler(exportResponses));
pollRouter.post("/:id/close", asyncHandler(closePoll));
pollRouter.post("/:id/reopen", asyncHandler(reopenPoll));
pollRouter.post("/:id/duplicate", asyncHandler(duplicatePoll));
pollRouter.get("/:id", asyncHandler(getOwnedPoll));
pollRouter.get("/:id/analytics", asyncHandler(getAnalytics));
pollRouter.post("/:id/publish", asyncHandler(publishPoll));
