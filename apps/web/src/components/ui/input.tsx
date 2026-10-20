"use client";

import { forwardRef, useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string | null;
  prefix?: string;
}

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & FieldProps
>(function Input({ label, hint, error, prefix, className, id, ...rest }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-medium text-ink-2">
          {label}
        </label>
      )}
      <div
        className={cn(
          "flex h-12 items-center overflow-hidden rounded-[var(--radius-md)] bg-surface transition-shadow",
          error
            ? "shadow-[inset_0_0_0_1.5px_var(--like)]"
            : "hairline focus-within:shadow-[inset_0_0_0_1.5px_var(--ink)]",
        )}
      >
        {prefix && (
          <span className="select-none pl-4 pr-1 text-[15px] text-muted tabular">{prefix}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-full w-full bg-transparent px-4 text-[15px] outline-none placeholder:text-muted",
            prefix && "pl-1",
            className,
          )}
          aria-invalid={Boolean(error)}
          {...rest}
        />
      </div>
      {(error || hint) && (
        <p className={cn("text-[12.5px]", error ? "text-like" : "text-muted")}>{error ?? hint}</p>
      )}
    </div>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps
>(function Textarea({ label, hint, error, className, id, ...rest }, ref) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-[13px] font-medium text-ink-2">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        className={cn(
          "min-h-28 w-full resize-none rounded-[var(--radius-md)] bg-surface px-4 py-3 text-[15px] leading-relaxed outline-none transition-shadow placeholder:text-muted",
          error
            ? "shadow-[inset_0_0_0_1.5px_var(--like)]"
            : "hairline focus:shadow-[inset_0_0_0_1.5px_var(--ink)]",
          className,
        )}
        aria-invalid={Boolean(error)}
        {...rest}
      />
      {(error || hint) && (
        <p className={cn("text-[12.5px]", error ? "text-like" : "text-muted")}>{error ?? hint}</p>
      )}
    </div>
  );
});
