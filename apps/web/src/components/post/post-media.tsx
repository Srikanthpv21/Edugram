"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { isTrustedImageHost } from "@/lib/images";

export function PostMedia({
  urls,
  alt,
  onDoubleTap,
  priority,
}: {
  urls: string[];
  alt: string;
  onDoubleTap?: () => void;
  priority?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const lastTap = useRef(0);

  if (urls.length === 0) return null;

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      onDoubleTap?.();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };

  return (
    <div className="relative select-none">
      <div
        ref={ref}
        onScroll={onScroll}
        onClick={handleTap}
        className="no-scrollbar flex aspect-[4/5] snap-x snap-mandatory overflow-x-auto bg-surface-2"
      >
        {urls.map((u, i) => (
          <div key={u} className="relative h-full w-full shrink-0 snap-center">
            <Image
              src={u}
              alt={urls.length > 1 ? `${alt} (${i + 1} of ${urls.length})` : alt}
              fill
              sizes="(max-width: 768px) 100vw, 520px"
              className="object-cover"
              priority={priority && i === 0}
              draggable={false}
              unoptimized={!isTrustedImageHost(u)}
            />
          </div>
        ))}
      </div>
      {urls.length > 1 && (
        <>
          <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-[11.5px] font-medium text-white tabular backdrop-blur">
            {index + 1}/{urls.length}
          </span>
          <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5">
            {urls.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "size-1.5 rounded-full transition-[background-color,transform] duration-200",
                  i === index ? "scale-110 bg-white" : "bg-white/50",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
