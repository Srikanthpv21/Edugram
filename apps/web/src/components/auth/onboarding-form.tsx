"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { completeProfileSchema, usernameSchema, type SessionUser } from "@edugram/shared";
import { api, errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function OnboardingForm() {
  const [form, setForm] = useState({
    displayName: "",
    username: "",
    institution: "",
    course: "",
    graduationYear: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [touchedUsername, setTouchedUsername] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (touchedUsername) return;
    const base = form.displayName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .join(".")
      .slice(0, 24);
    setForm((f) => ({ ...f, username: base }));
  }, [form.displayName, touchedUsername]);

  const usernameValid = usernameSchema.safeParse(form.username).success;
  const availability = useQuery({
    queryKey: ["username", form.username],
    queryFn: () =>
      api.get<{ available: boolean; reason: string | null }>(
        `/auth/username-available?username=${encodeURIComponent(form.username)}`,
      ),
    enabled: usernameValid,
    staleTime: 10_000,
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = completeProfileSchema.safeParse({
      displayName: form.displayName,
      username: form.username,
      institution: form.institution || undefined,
      course: form.course || undefined,
      graduationYear: form.graduationYear ? Number(form.graduationYear) : undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.post<{ user: SessionUser }>("/auth/onboarding", parsed.data);
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const usernameHint = !form.username
    ? "Letters, numbers, dots and underscores"
    : !usernameValid
      ? usernameSchema.safeParse(form.username).error?.issues[0]?.message
      : availability.data
        ? availability.data.available
          ? "Available"
          : (availability.data.reason ?? "Taken")
        : "Checking";
  const usernameOk = usernameValid && availability.data?.available;

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.025em]">Set up your profile</h1>
        <p className="mt-1 text-[14.5px] text-muted">Takes about twenty seconds.</p>
      </div>

      <Input
        label="Your name"
        placeholder="Ananya Krishnan"
        autoComplete="name"
        value={form.displayName}
        onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
        autoFocus
      />
      <div className="relative">
        <Input
          label="Username"
          prefix="@"
          autoComplete="off"
          autoCapitalize="none"
          value={form.username}
          onChange={(e) => {
            setTouchedUsername(true);
            setForm((f) => ({
              ...f,
              username: e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""),
            }));
          }}
          hint={usernameHint}
          error={
            form.username && usernameValid && availability.data && !availability.data.available
              ? usernameHint
              : null
          }
        />
        {usernameOk && (
          <Check className="absolute right-4 top-[38px] size-5 text-success" strokeWidth={2.5} />
        )}
      </div>
      <Input
        label="Institution"
        placeholder="IIT Madras"
        value={form.institution}
        onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))}
        hint="Optional, but it helps people from your campus find you."
      />
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <Input
          label="Course"
          placeholder="B.Tech CSE"
          value={form.course}
          onChange={(e) => setForm((f) => ({ ...f, course: e.target.value }))}
        />
        <Input
          label="Batch of"
          placeholder="2027"
          inputMode="numeric"
          value={form.graduationYear}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              graduationYear: e.target.value.replace(/\D/g, "").slice(0, 4),
            }))
          }
        />
      </div>

      {error && <p className="text-[13.5px] text-like">{error}</p>}

      <Button
        type="submit"
        size="lg"
        full
        loading={busy}
        disabled={!form.displayName.trim() || !usernameOk}
      >
        Let’s go
      </Button>
    </form>
  );
}
