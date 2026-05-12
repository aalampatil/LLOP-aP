import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getApiError, useApiClient } from "../lib/api";
import {
  createInitialPollBuilderState,
  toCreatePollPayload,
  type PollBuilderState,
} from "../lib/poll-builder";
import { newQuestion } from "../lib/poll-utils";
import type { BuilderQuestion, Poll } from "../types/poll";

export type { PollBuilderState } from "../lib/poll-builder";

export function usePollBuilder() {
  const api = useApiClient();
  const navigate = useNavigate();
  const [form, setForm] = useState<PollBuilderState>(createInitialPollBuilderState);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const updateField = <Key extends keyof PollBuilderState>(
    key: Key,
    value: PollBuilderState[Key],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const updateQuestion = (questionId: string, patch: Partial<BuilderQuestion>) => {
    updateField(
      "questions",
      form.questions.map((question) =>
        question.id === questionId ? { ...question, ...patch } : question,
      ),
    );
  };

  const addQuestion = () => updateField("questions", [...form.questions, newQuestion()]);

  const removeQuestion = (questionId: string) => {
    if (form.questions.length <= 1) return;
    updateField(
      "questions",
      form.questions.filter((question) => question.id !== questionId),
    );
  };

  const addOption = (questionId: string) => {
    updateField(
      "questions",
      form.questions.map((question) =>
        question.id === questionId && question.options.length < 8
          ? {
              ...question,
              options: [
                ...question.options,
                { id: crypto.randomUUID(), label: "" },
              ],
            }
          : question,
      ),
    );
  };

  const updateOption = (questionId: string, optionId: string, label: string) => {
    updateField(
      "questions",
      form.questions.map((question) =>
        question.id === questionId
          ? {
              ...question,
              options: question.options.map((option) =>
                option.id === optionId ? { ...option, label } : option,
              ),
            }
          : question,
      ),
    );
  };

  const removeOption = (questionId: string, optionId: string) => {
    updateField(
      "questions",
      form.questions.map((question) =>
        question.id === questionId && question.options.length > 2
          ? {
              ...question,
              options: question.options.filter((option) => option.id !== optionId),
            }
          : question,
      ),
    );
  };

  const submit = async () => {
    setError("");
    setSaving(true);
    try {
      const data = await api.post<{ poll: Poll }>("/api/poll", toCreatePollPayload(form));
      navigate(`/dashboard/${data.poll.id}`);
    } catch (err) {
      setError(getApiError(err, "Could not create poll"));
    } finally {
      setSaving(false);
    }
  };

  return {
    form,
    error,
    saving,
    updateField,
    updateQuestion,
    addQuestion,
    removeQuestion,
    addOption,
    updateOption,
    removeOption,
    submit,
  };
}
