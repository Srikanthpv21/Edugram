import { cn } from "@/lib/cn";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-[10px] bg-ink font-display text-[22px] italic leading-none text-bg"
      >
        e
      </span>
      {!compact && <span className="text-[19px] font-semibold tracking-[-0.03em]">Edugram</span>}
    </span>
  );
}
