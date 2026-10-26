"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { OTP_LENGTH, phoneSchema, type SessionUser } from "@edugram/shared";
import { api, errorMessage } from "@/lib/api";
import { safeNext } from "@/lib/redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OtpInput } from "./otp-input";

const REF_KEY = "edugram.ref";

export function LoginForm({ next, initialRef }: { next?: string; initialRef?: string }) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const router = useRouter();
  const phoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialRef) {
      try {
        localStorage.setItem(REF_KEY, initialRef.toUpperCase());
      } catch {}
    }
  }, [initialRef]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const requestCode = async (e?: FormEvent) => {
    e?.preventDefault();
    const parsed = phoneSchema.safeParse(phone);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the number");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ ok: true; devCode?: string }>("/auth/otp/request", {
        phone: parsed.data,
      });
      setDevCode(res.devCode ?? null);
      setStep("code");
      setCode("");
      setCooldown(30);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value: string) => {
    if (value.length !== OTP_LENGTH) return;
    setBusy(true);
    setError(null);
    let referralCode: string | undefined;
    try {
      referralCode = localStorage.getItem(REF_KEY) ?? undefined;
    } catch {}
    try {
      const res = await api.post<{ user: SessionUser; isNew: boolean }>("/auth/otp/verify", {
        phone,
        code: value,
        referralCode,
      });
      try {
        localStorage.removeItem(REF_KEY);
      } catch {}
      router.push(res.user.onboarded ? safeNext(next) : "/onboarding");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setCode("");
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <AnimatePresence mode="wait" initial={false}>
        {step === "phone" ? (
          <motion.form
            key="phone"
            onSubmit={requestCode}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
            className="flex flex-col gap-5"
          >
            <div>
              <h2 className="text-[26px] font-semibold tracking-[-0.025em]">Sign in</h2>
              <p className="mt-1 text-[14.5px] text-muted">
                New here? Your account is created on the spot.
              </p>
            </div>
            <Input
              ref={phoneRef}
              label="Mobile number"
              prefix="+91"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, "").slice(0, 11))}
              error={error}
              autoFocus
            />
            <Button type="submit" size="lg" full loading={busy}>
              Send code
            </Button>
          </motion.form>
        ) : (
          <motion.div
            key="code"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.18, ease: [0.25, 1, 0.5, 1] }}
            className="flex flex-col gap-5"
          >
            <div>
              <h2 className="text-[26px] font-semibold tracking-[-0.025em]">Enter the code</h2>
              <p className="mt-1 text-[14.5px] text-muted">
                Sent to +91 {phone}.{" "}
                <button
                  type="button"
                  className="text-ink underline underline-offset-2"
                  onClick={() => {
                    setStep("phone");
                    setError(null);
                  }}
                >
                  Change
                </button>
              </p>
            </div>
            <OtpInput
              value={code}
              onChange={(v) => {
                setCode(v);
                setError(null);
                if (v.length === OTP_LENGTH) void verify(v);
              }}
              disabled={busy}
              error={Boolean(error)}
            />
            {error && <p className="-mt-2 text-[13px] text-like">{error}</p>}
            {devCode && (
              <p className="rounded-[var(--radius-md)] bg-accent-soft px-3 py-2 text-[13px] text-ink-2">
                Development mode. Your code is{" "}
                <span className="font-semibold tabular">{devCode}</span>.
              </p>
            )}
            <Button
              type="button"
              size="lg"
              full
              loading={busy}
              onClick={() => verify(code)}
              disabled={code.length !== OTP_LENGTH}
            >
              Continue
            </Button>
            <button
              type="button"
              disabled={cooldown > 0 || busy}
              onClick={() => requestCode()}
              className="text-[13.5px] text-muted disabled:opacity-60"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
