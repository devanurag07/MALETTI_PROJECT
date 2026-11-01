"use client";
import { FULL_BODY_CAPTURE_KEY } from "@/core/constants/common-constants";
import {
  FULL_BODY_CAPTURE_PATH,
  needsFullBody,
  sessionReportFormPath,
  sessionStepPath,
  type FlowStepId,
} from "../config/session-types";
import type { CustomerSessionDto } from "../types";

export function hasFullBodyPhoto(): boolean {
  try {
    return !!localStorage.getItem(FULL_BODY_CAPTURE_KEY);
  } catch {
    return false;
  }
}

/** Dropped with the session, so a new customer's journey never reuses the previous full-body photo. */
export function clearFullBodyPhoto() {
  try {
    localStorage.removeItem(FULL_BODY_CAPTURE_KEY);
  } catch {
    // storage unavailable: nothing to clear
  }
}

/** True when the journey still needs its full-body photo before any step can open. */
export const isMissingFullBody = (session: Pick<CustomerSessionDto, "session_type">) =>
  needsFullBody(session) && !hasFullBodyPhoto();

/** Where Resume / a finished capture goes: the full-body photo if it's missing, else the next step or the report form. */
export function resumePath(session: CustomerSessionDto, next: FlowStepId | null): string {
  if (isMissingFullBody(session)) return FULL_BODY_CAPTURE_PATH;
  return next ? sessionStepPath(session.session_type, next) : sessionReportFormPath(session.id);
}
