"use client";

import { useRef } from "react";
import { OTP_LENGTH } from "@edugram/shared";
import { cn } from "@/lib/cn";

export function OtpInput({
  value,
  onChange,
  disabled,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  error?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? "");
  const active = Math.min(value.length, OTP_LENGTH - 1);

  return (
    <div className="relative" onClick={() => ref.current?.focus()}>
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH))}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d*"
        maxLength={OTP_LENGTH}
        disabled={disabled}
        autoFocus
        aria-label="One-time code"
        className="absolute inset-0 z-10 w-full opacity-0"
      />
      <div className="flex gap-2">
        {digits.map((d, i) => (
          <div
            key={i}
            className={cn(
              "grid h-14 flex-1 place-items-center rounded-[var(--radius-md)] bg-surface text-[22px] font-semibold tabular transition-shadow",
              error
                ? "shadow-[inset_0_0_0_1.5px_var(--like)]"
                : i === active && !disabled
                  ? "shadow-[inset_0_0_0_1.5px_var(--ink)]"
                  : "hairline",
            )}
          >
            {d}
          </div>
        ))}
      </div>
    </div>
  );
}
