"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TermsModalProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export default function TermsModal({
  checked,
  onCheckedChange,
}: TermsModalProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-pressed={checked}
          aria-label="Agree to terms and conditions"
          onClick={() => onCheckedChange(!checked)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-white"
        >
          <input
            type="checkbox"
            checked={checked}
            readOnly
            tabIndex={-1}
            className="pointer-events-none h-8 w-8 rounded-[4px] border-2 border-white bg-transparent accent-white"
            style={{ minWidth: 32, minHeight: 32 }}
          />
        </button>

        <p className="text-3xl text-bv-ink">
          I agree{" "}
          <button
            onClick={() => setOpen(true)}
            className="font-bold cursor-pointer"
            style={{ color: "white" }}
          >
            terms and conditions
          </button>
        </p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="bg-bv-surface border border-bv-line text-white max-w-2xl w-[90vw] rounded-2xl p-8"
          showCloseButton={true}
        >
          <DialogHeader>
            <DialogTitle className="text-4xl font-bold text-white text-center mb-2">
              Terms &amp; Conditions
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-6 text-bv-ink text-2xl leading-relaxed">
            <p>
              I consent to the capture and processing of my photo using AI to
              provide virtual hairstyle and hair colour try-on, skin and scalp
              analysis, and personalized recommendations.
            </p>
            <p>
              I understand that my images and related data will be handled
              securely and used only to deliver these services. They will not be
              shared with third parties except where required to provide the
              service or by law.
            </p>
            <p className="text-white font-medium">
              By proceeding, I agree to these terms.
            </p>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setOpen(false)}
              className="bg-white text-black font-semibold text-2xl rounded-xl px-12 py-4 hover:opacity-90 transition"
            >
              Close
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
