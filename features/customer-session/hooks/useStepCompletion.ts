"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useCustomerSession } from "../context/CustomerSessionContext";
import {
  backendStepsFor,
  getFlowSteps,
  sessionReportFormPath,
  sessionStepPath,
  type FlowStepId,
} from "../config/session-types";
import type { CustomerSessionDto, FinalStepStatus, StepId } from "../types";

export interface StepRecord {
  step: StepId;
  data: Record<string, unknown>;
  status?: FinalStepStatus;
}

/**
 * Saves a flow screen's records to the customer session and routes to the next
 * screen (or the final report screen once the last one is done).
 */
export function useStepCompletion(step: FlowStepId) {
  const router = useRouter();
  const { session, saveStep } = useCustomerSession();
  const [isSaving, setIsSaving] = useState(false);

  const finish = useCallback(
    async (records: StepRecord[], sessionOverride?: CustomerSessionDto) => {
      const current = sessionOverride ?? session;
      if (!current) return;
      setIsSaving(true);
      try {
        for (const record of records) {
          await saveStep(record.step, record.data, record.status ?? "completed");
        }
        // Derive the order from the (possibly just-updated) session, e.g. after Makeover services change.
        const steps = getFlowSteps(current);
        const next = steps[steps.indexOf(step) + 1];
        router.push(next ? sessionStepPath(current.session_type, next) : sessionReportFormPath(current.id));
      } catch (e) {
        console.error(`Failed to save ${step}:`, e);
        toast.error("Could not save this step. Please try again.");
      } finally {
        setIsSaving(false);
      }
    },
    [session, saveStep, step, router],
  );

  /** Single-record screens: the flow step id is the backend step id. */
  const complete = (data: Record<string, unknown> = {}) => finish([{ step: step as StepId, data }]);

  /** Marks every record this screen owns as skipped. */
  const skip = () =>
    session ? finish(backendStepsFor(step, session).map((s) => ({ step: s, data: {}, status: "skipped" as const }))) : undefined;

  return { finish, complete, skip, isSaving };
}
