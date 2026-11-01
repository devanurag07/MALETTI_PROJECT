"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CUSTOMER_SESSION_ID_KEY, SESSION_ID_KEY } from "@/core/constants/common-constants";
import { clearSessionAnalyses } from "@/core/utils/session-analyses";
import {
  createCustomerSession,
  getCustomerSession,
  saveSessionStep,
  saveStepDraft,
  updateCustomerSession,
} from "../api/customer-session-api";
import { backendStepsFor, getFlowSteps, type FlowStepId } from "../config/session-types";
import { clearFullBodyPhoto } from "../flow/photos";
import type {
  CreateCustomerSessionInput,
  CustomerSessionDto,
  FinalStepStatus,
  SessionStepDto,
  StepId,
} from "../types";

interface CustomerSessionContextValue {
  session: CustomerSessionDto | null;
  /** True until the stored session (if any) has been restored from the API. */
  isRestoring: boolean;
  /** Flow screens for this session, in order. */
  steps: FlowStepId[];
  startSession: (input: CreateCustomerSessionInput) => Promise<CustomerSessionDto>;
  updateSession: (input: Partial<CreateCustomerSessionInput>) => Promise<CustomerSessionDto>;
  saveStep: (step: StepId, data: Record<string, unknown>, status?: FinalStepStatus) => Promise<void>;
  /** Saves in-progress results in the background (latest draft wins); never throws. */
  saveDraft: (step: StepId, draft: Record<string, unknown>) => void;
  getStep: (step: StepId) => SessionStepDto | undefined;
  /** True once every backend record the flow screen writes has been finished (completed or skipped). */
  isStepDone: (step: FlowStepId) => boolean;
  /** Screen after `step` in the configured order, or null when the session is finished. */
  nextStep: (step: FlowStepId) => FlowStepId | null;
  previousStep: (step: FlowStepId) => FlowStepId | null;
  firstIncompleteStep: () => FlowStepId | null;
  resetSession: () => void;
}

const CustomerSessionContext = createContext<CustomerSessionContextValue | null>(null);

function readStoredId(): string | null {
  try {
    return localStorage.getItem(CUSTOMER_SESSION_ID_KEY);
  } catch {
    return null;
  }
}

function persist(session: CustomerSessionDto | null) {
  try {
    if (session) {
      localStorage.setItem(CUSTOMER_SESSION_ID_KEY, String(session.id));
      // Existing try-on / analysis APIs read the mirror session from SESSION_ID_KEY.
      localStorage.setItem(SESSION_ID_KEY, String(session.salon_session_id));
    } else {
      localStorage.removeItem(CUSTOMER_SESSION_ID_KEY);
      localStorage.removeItem(SESSION_ID_KEY);
    }
  } catch (e) {
    console.error("Failed to persist customer session:", e);
  }
}

/** Per-step draft queue: one request in flight, only the newest pending draft is sent next. */
interface DraftQueue {
  inFlight: boolean;
  pending: string | null;
  lastSent: string | null;
  /** Newest draft handed to `saveDraft`; what the local session shows, whatever the server has answered so far. */
  latest: string | null;
}

/** Puts a step record into the session, keeping the newest local draft over an older one from the server. */
function withStep(prev: CustomerSessionDto | null, record: SessionStepDto, latestDraft: string | null): CustomerSessionDto | null {
  if (!prev) return prev;
  const next = latestDraft ? { ...record, draft: JSON.parse(latestDraft) as Record<string, unknown> } : record;
  return { ...prev, steps: [...prev.steps.filter((s) => s.step !== record.step), next] };
}

export function CustomerSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<CustomerSessionDto | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const draftQueues = useRef(new Map<string, DraftQueue>());

  useEffect(() => {
    const storedId = readStoredId();
    if (!storedId) {
      setIsRestoring(false);
      return;
    }
    getCustomerSession(storedId)
      .then((restored) => {
        if (restored.status === "completed") {
          persist(null);
        } else {
          setSession(restored);
          persist(restored);
        }
      })
      .catch(() => persist(null))
      .finally(() => setIsRestoring(false));
  }, []);

  const steps = useMemo(() => (session ? getFlowSteps(session) : []), [session]);

  const startSession = useCallback(async (input: CreateCustomerSessionInput) => {
    const created = await createCustomerSession(input);
    clearSessionAnalyses();
    clearFullBodyPhoto();
    persist(created);
    setSession(created);
    return created;
  }, []);

  const updateSession = useCallback(
    async (input: Partial<CreateCustomerSessionInput>) => {
      if (!session) throw new Error("No active customer session");
      const updated = await updateCustomerSession(session.id, input);
      setSession(updated);
      return updated;
    },
    [session],
  );

  const saveStep = useCallback(
    async (step: StepId, data: Record<string, unknown>, status: FinalStepStatus = "completed") => {
      if (!session) throw new Error("No active customer session");
      const saved = await saveSessionStep(session.id, step, data, status);
      const latest = draftQueues.current.get(`${session.id}:${step}`)?.latest ?? null;
      setSession((prev) => withStep(prev, saved, latest));
    },
    [session],
  );

  const saveDraft = useCallback(
    (step: StepId, draft: Record<string, unknown>) => {
      if (!session) return;
      const sessionId = session.id;
      const key = `${sessionId}:${step}`;
      const queue = draftQueues.current.get(key) ?? { inFlight: false, pending: null, lastSent: null, latest: null };
      draftQueues.current.set(key, queue);
      queue.pending = JSON.stringify(draft);
      queue.latest = queue.pending;

      // Show the draft locally right away: going back to this step before the request returns
      // must reopen it with every result so far.
      setSession((prev) => {
        if (!prev || prev.id !== sessionId) return prev;
        const now = new Date().toISOString();
        const record = prev.steps.find((s) => s.step === step) ?? {
          id: 0,
          step,
          status: "in_progress" as const,
          data: {},
          created_at: now,
          updated_at: now,
        };
        return withStep(prev, { ...record, draft }, null);
      });

      const flush = async () => {
        if (queue.inFlight || queue.pending === null) return;
        const body = queue.pending;
        queue.pending = null;
        if (body === queue.lastSent) return;
        queue.inFlight = true;
        try {
          const saved = await saveStepDraft(sessionId, step, JSON.parse(body));
          queue.lastSent = body;
          setSession((prev) => (prev && prev.id === sessionId ? withStep(prev, saved, queue.latest) : prev));
        } catch (e) {
          console.error(`Failed to save ${step} draft:`, e);
        } finally {
          queue.inFlight = false;
          void flush();
        }
      };
      void flush();
    },
    [session],
  );

  const getStep = useCallback(
    (step: StepId) => session?.steps.find((s) => s.step === step),
    [session],
  );

  const isStepDone = useCallback(
    (step: FlowStepId) =>
      !!session &&
      backendStepsFor(step, session).every((b) =>
        session.steps.some((s) => s.step === b && s.status !== "in_progress"),
      ),
    [session],
  );

  const nextStep = useCallback(
    (step: FlowStepId) => {
      const index = steps.indexOf(step);
      return index >= 0 && index < steps.length - 1 ? steps[index + 1] : null;
    },
    [steps],
  );

  const previousStep = useCallback(
    (step: FlowStepId) => {
      const index = steps.indexOf(step);
      return index > 0 ? steps[index - 1] : null;
    },
    [steps],
  );

  const firstIncompleteStep = useCallback(
    () => steps.find((step) => !isStepDone(step)) ?? null,
    [steps, isStepDone],
  );

  const resetSession = useCallback(() => {
    draftQueues.current.clear();
    persist(null);
    clearSessionAnalyses();
    clearFullBodyPhoto();
    setSession(null);
  }, []);

  const value = useMemo<CustomerSessionContextValue>(
    () => ({
      session,
      isRestoring,
      steps,
      startSession,
      updateSession,
      saveStep,
      saveDraft,
      getStep,
      isStepDone,
      nextStep,
      previousStep,
      firstIncompleteStep,
      resetSession,
    }),
    [session, isRestoring, steps, startSession, updateSession, saveStep, saveDraft, getStep, isStepDone, nextStep, previousStep, firstIncompleteStep, resetSession],
  );

  return <CustomerSessionContext.Provider value={value}>{children}</CustomerSessionContext.Provider>;
}

export function useCustomerSession() {
  const context = useContext(CustomerSessionContext);
  if (!context) {
    throw new Error("useCustomerSession must be used inside CustomerSessionProvider");
  }
  return context;
}
