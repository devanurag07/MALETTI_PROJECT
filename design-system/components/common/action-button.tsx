"use client";

import { cn } from "@/lib/utils";
import { BV } from "@/features/customer-session/flow/theme";

export type ActionButtonVariant = "primary" | "secondary";

export interface ActionButtonProps {
  /** Button label */
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /** "primary" = solid fill, "secondary" = outlined (default primary) */
  variant?: ActionButtonVariant;
  /** Override fill colour for primary variant (default Bluevella aqua) */
  color?: string;
  /** Override text colour (default on-accent for primary, white for secondary) */
  textColor?: string;
  /** Make the button span full width (default false) */
  fullWidth?: boolean;
  /** Extra classes */
  className?: string;
  type?: "button" | "submit" | "reset";
}

export function ActionButton({
  children,
  onClick,
  disabled = false,
  variant = "primary",
  color = BV.accent,
  textColor,
  fullWidth = false,
  className,
  type = "button",
}: ActionButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-xl text-4xl font-semibold transition py-8 px-8",
        isPrimary
          ? "enabled:hover:opacity-90"
          : "border-2 border-bv-line-strong bg-transparent hover:bg-white/10",
        fullWidth ? "w-full" : "flex-1",
        disabled && "opacity-40",
        className,
      )}
      style={
        isPrimary
          ? { backgroundColor: color, color: textColor ?? BV.onAccent }
          : { color: textColor ?? "#ffffff" }
      }
    >
      {children}
    </button>
  );
}
