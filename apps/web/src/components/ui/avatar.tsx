import Image from "next/image";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";
import { isTrustedImageHost } from "@/lib/images";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const sizes: Record<Size, { px: number; text: string }> = {
  xs: { px: 24, text: "text-[10px]" },
  sm: { px: 32, text: "text-[12px]" },
  md: { px: 40, text: "text-[14px]" },
  lg: { px: 56, text: "text-[18px]" },
  xl: { px: 88, text: "text-[28px]" },
};

function hue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

export function Avatar({
  src,
  name,
  size = "md",
  className,
}: {
  src: string | null | undefined;
  name: string;
  size?: Size;
  className?: string;
}) {
  const { px, text } = sizes[size];
  const h = hue(name);
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold hairline",
        text,
        className,
      )}
      style={{
        width: px,
        height: px,
        background: src ? undefined : `oklch(0.92 0.04 ${h})`,
        color: src ? undefined : `oklch(0.42 0.1 ${h})`,
      }}
      aria-label={name}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          width={px}
          height={px}
          className="size-full object-cover"
          unoptimized={!isTrustedImageHost(src)}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
