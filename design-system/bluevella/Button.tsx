"use client";
import { ArrowRight, Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "outline" | "ghost";
export type ButtonSize = "lg" | "md" | "sm";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children: ReactNode;
  /** primary = aqua pill with glow (one per screen) · outline = aqua-outlined pill · ghost = text link. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Trailing arrow, as on "Start your consultation →". */
  arrow?: boolean;
  /** Leading icon. */
  icon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

const SIZE: Record<ButtonSize, string> = {
  lg: "min-h-[6.5rem] px-14 text-4xl gap-4",
  md: "min-h-[4.75rem] px-10 text-3xl gap-3",
  sm: "min-h-[3.75rem] px-7 text-2xl gap-2.5",
};

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-(image:--bv-button) text-bv-on-accent font-semibold shadow-bv-glow enabled:hover:brightness-105",
  outline: "border-2 border-bv-line-strong bg-bv-surface/60 text-bv-ink font-medium enabled:hover:border-bv-accent",
  ghost: "text-bv-ink-muted underline underline-offset-8 enabled:hover:text-bv-ink",
};

const BASE =
  "inline-flex items-center justify-center rounded-full transition active:scale-[0.98] disabled:opacity-40 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bv-ink focus-visible:ring-offset-2 focus-visible:ring-offset-bv-ground";

/** The Button's classes, for links or buttons that can't use the component. */
export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "lg", className?: string) {
  return cn(
    BASE,
    variant !== "ghost" && SIZE[size],
    variant === "ghost" && (size === "lg" ? "text-3xl" : "text-2xl"),
    VARIANT[variant],
    className,
  );
}

/** Bluevella button: pill-shaped, aqua for the one primary action, outline for secondary ones. */
export function Button({
  children,
  variant = "primary",
  size = "lg",
  arrow = false,
  icon,
  loading = false,
  fullWidth = false,
  className,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={buttonClass(variant, size, cn(fullWidth && "w-full", className))}
      {...rest}
    >
      {loading ? <Loader2 className="size-[1.1em] animate-spin" /> : icon}
      {children}
      {arrow && !loading && <ArrowRight className="size-[1em]" strokeWidth={2.25} />}
    </button>
  );
}
