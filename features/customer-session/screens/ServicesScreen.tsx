"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Droplets, Palette, Scissors, Sparkles } from "lucide-react";
import { IconTile, SelectMark } from "@/design-system/bluevella";
import { toast } from "react-toastify";
import { useCustomerSession } from "../context/CustomerSessionContext";
import { FLOW_STEP_TITLES, MAKEOVER_SERVICES, sessionCapturePath } from "../config/session-types";
import FlowScreen from "../flow/FlowScreen";
import { useFlowProgress } from "../flow/useFlowProgress";
import { useStepCompletion } from "../hooks/useStepCompletion";
import type { MakeoverService } from "../types";

const SERVICE_ICONS: Record<MakeoverService, React.ReactNode> = {
  haircut: <Scissors />,
  haircolor: <Palette />,
  hair_treatment: <Sparkles />,
  skin_treatment: <Droplets />,
};

const SERVICE_HINTS: Record<MakeoverService, string> = {
  haircut: "Find a cut that suits your face",
  haircolor: "Preview shades before you colour",
  hair_treatment: "Scalp & hair health plan",
  skin_treatment: "Skin analysis & facial plan",
};

/** Makeover step 1 — the services chosen here decide which screens follow. */
export default function ServicesScreen() {
  const router = useRouter();
  const { session, updateSession } = useCustomerSession();
  const { finish, isSaving } = useStepCompletion("services");
  const progress = useFlowProgress("services");
  const [selected, setSelected] = useState<MakeoverService[]>(session?.makeover_services ?? []);
  const [isUpdating, setIsUpdating] = useState(false);

  const toggle = (id: MakeoverService) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const proceed = async () => {
    setIsUpdating(true);
    try {
      const updated = await updateSession({ makeover_services: selected });
      await finish([{ step: "services", data: { services: selected } }], updated);
    } catch (e) {
      console.error("Failed to save services:", e);
      toast.error("Could not save your services. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <FlowScreen
      title={FLOW_STEP_TITLES.services}
      progress={progress}
      onBack={() => session && router.push(sessionCapturePath())}
      primary={{ label: "Continue", onClick: proceed, disabled: selected.length === 0, loading: isSaving || isUpdating }}
    >
      <p className="text-5xl font-semibold">What would you like today?</p>
      <p className="text-2xl text-bv-ink-muted mt-3">Pick one or more — we&apos;ll tailor the next steps.</p>
      <div className="grid grid-cols-2 gap-8 mt-12">
        {MAKEOVER_SERVICES.map((service) => {
          const active = selected.includes(service.id);
          return (
            <IconTile
              key={service.id}
              icon={SERVICE_ICONS[service.id]}
              label={service.title}
              hint={SERVICE_HINTS[service.id]}
              selected={active}
              corner={<SelectMark selected={active} size="sm" />}
              onClick={() => toggle(service.id)}
              className="min-h-[300px]"
            />
          );
        })}
      </div>
    </FlowScreen>
  );
}
