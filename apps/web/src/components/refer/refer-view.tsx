"use client";

import { Check, Copy, MessageCircle } from "lucide-react";
import { useState } from "react";
import { REFERRAL_REWARD_PAISE, REFERRAL_WELCOME_PAISE } from "@edugram/shared";
import { rupees, timeAgoLong } from "@/lib/format";
import { useReferral, useWallet } from "@/lib/queries";
import { useToast } from "@/components/ui/toast";

export function ReferView() {
  const { data: s, isLoading } = useReferral();
  const { data: wallet } = useWallet();
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!s) return;
    await navigator.clipboard.writeText(s.shareUrl);
    setCopied(true);
    toast.show("Invite link copied");
    window.setTimeout(() => setCopied(false), 1600);
  };

  const whatsapp = () => {
    if (!s) return;
    const text = `I’m on Edugram, a place for students to post and learn together. Join with my link and we both get ${rupees(REFERRAL_WELCOME_PAISE)}: ${s.shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  return (
    <div className="flex flex-col gap-8 px-4 md:px-0">
      <header>
        <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
          Refer and earn
        </p>
        <h1 className="mt-1 font-display text-[38px] leading-[1.02] tracking-[-0.02em] md:text-[44px]">
          Bring a friend.
          <br />
          <span className="italic">Both of you</span> get paid.
        </h1>
        <p className="mt-3 max-w-[40ch] text-pretty text-[15px] leading-relaxed text-ink-2">
          You earn {rupees(REFERRAL_REWARD_PAISE)} when someone joins with your link and sets up
          their profile. They get {rupees(REFERRAL_WELCOME_PAISE)} as a welcome bonus.
        </p>
      </header>

      <section className="rounded-[var(--radius-lg)] bg-ink p-5 text-bg">
        <p className="text-[12.5px] uppercase tracking-[0.08em] opacity-70">Your code</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <p className="font-display text-[40px] leading-none tracking-[0.04em]">
            {isLoading ? <span className="opacity-40">········</span> : s?.code}
          </p>
          <button
            onClick={copy}
            aria-label="Copy invite link"
            className="grid size-11 place-items-center rounded-full bg-bg/10 transition-colors hover:bg-bg/20"
          >
            {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
          </button>
        </div>
        <p className="mt-3 truncate text-[13px] opacity-70">{s?.shareUrl}</p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={whatsapp}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-bg text-[14px] font-medium text-ink transition-[opacity,transform] hover:opacity-90 active:scale-[0.98]"
          >
            <MessageCircle className="size-4" />
            Share on WhatsApp
          </button>
          <button
            onClick={copy}
            className="inline-flex h-10 items-center justify-center rounded-full px-4 text-[14px] font-medium text-bg shadow-[inset_0_0_0_1px_currentColor] transition-[background-color,transform] hover:bg-bg/10 active:scale-[0.98]"
          >
            Copy link
          </button>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        {[
          { label: "Joined", value: s ? String(s.totalReferred) : "–" },
          { label: "Pending", value: s ? String(s.pendingCount) : "–" },
          { label: "Earned", value: s ? rupees(s.earnedPaise) : "–" },
        ].map((st) => (
          <div key={st.label} className="rounded-[var(--radius-md)] bg-surface p-4 hairline">
            <p className="text-[12px] text-muted">{st.label}</p>
            <p className="mt-1 text-[22px] font-semibold tracking-[-0.02em] tabular">{st.value}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-[15px] font-semibold">Wallet</h2>
          <p className="text-[14px] text-muted">
            Balance{" "}
            <span className="font-semibold text-ink tabular">
              {s ? rupees(s.balancePaise) : "–"}
            </span>
          </p>
        </div>
        <ul className="mt-3 divide-y rounded-[var(--radius-md)] bg-surface hairline">
          {wallet && wallet.length === 0 && (
            <li className="px-4 py-8 text-center text-[14px] text-muted">
              Nothing yet. Your first referral lands here.
            </li>
          )}
          {wallet?.map((w) => (
            <li key={w.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px]">{w.note ?? labelFor(w.kind)}</p>
                <p className="text-[12px] text-muted">{timeAgoLong(w.createdAt)}</p>
              </div>
              <p
                className={`text-[14.5px] font-semibold tabular ${w.amountPaise < 0 ? "text-ink" : "text-success"}`}
              >
                {w.amountPaise > 0 ? "+" : ""}
                {rupees(w.amountPaise)}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
          Withdrawals to UPI open once your balance reaches {rupees(10_000)}. Rewards are reviewed
          for abuse before payout.
        </p>
      </section>
    </div>
  );
}

function labelFor(kind: string) {
  switch (kind) {
    case "referral_reward":
      return "Referral reward";
    case "welcome_bonus":
      return "Welcome bonus";
    case "withdrawal":
      return "Withdrawal";
    default:
      return "Adjustment";
  }
}
