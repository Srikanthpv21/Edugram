"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  full?: boolean;
}

const variants: Record<Variant, string> = {
  primary: "bg-ink text-bg hover:opacity-90 active:scale-[0.98] disabled:opacity-40",
  secondary:
    "bg-surface text-ink hairline hover:bg-surface-2 active:scale-[0.98] disabled:opacity-40",
  ghost: "bg-transparent text-ink hover:bg-surface-2 active:scale-[0.98] disabled:opacity-40",
  danger: "bg-transparent text-like hover:bg-like/10 active:scale-[0.98] disabled:opacity-40",
  accent: "bg-accent text-accent-ink hover:opacity-90 active:scale-[0.98] disabled:opacity-40",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-full gap-1.5",
  md: "h-10 px-4 text-[14px] rounded-full gap-2",
  lg: "h-12 px-5 text-[15px] rounded-full gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, full, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "relative inline-flex select-none items-center justify-center font-medium tracking-[-0.01em] transition-[opacity,transform,background-color] duration-150 ease-out-quart",
        variants[variant],
        sizes[size],
        full && "w-full",
        className,
      )}
      {...rest}
    >
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner className="size-4" />
        </span>
      )}
      <span className={cn("inline-flex items-center gap-[inherit]", loading && "invisible")}>
        {children}
      </span>
    </button>
  );
});
