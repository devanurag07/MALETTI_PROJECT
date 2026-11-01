"use client";
import { useCustomerSession } from "../context/CustomerSessionContext";
import { flowStepTitle, type FlowStepId } from "../config/session-types";

/** Progress for the header; the final report counts as the last step. `steps` labels feed the Stepper. */
export function useFlowProgress(step: FlowStepId) {
  const { session, steps } = useCustomerSession();
  return {
    current: steps.indexOf(step) + 1,
    total: steps.length + 1,
    label: flowStepTitle(step, session),
    steps: [...steps.map((s) => flowStepTitle(s, session)), "Report"],
  };
}
