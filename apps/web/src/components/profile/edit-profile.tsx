"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BIO_MAX, updateProfileSchema, type Profile } from "@edugram/shared";
import { api, errorMessage } from "@/lib/api";
import { keys } from "@/lib/queries";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export function EditProfile({ profile }: { profile: Profile }) {
  const [form, setForm] = useState({
    displayName: profile.displayName,
    bio: profile.bio ?? "",
    institution: profile.institution ?? "",
    course: profile.course ?? "",
    graduationYear: profile.graduationYear ? String(profile.graduationYear) : "",
    avatarUrl: profile.avatarUrl ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();
  const toast = useToast();
  const router = useRouter();

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = updateProfileSchema.safeParse({
      displayName: form.displayName,
      bio: form.bio,
      institution: form.institution.trim() || null,
      course: form.course.trim() || null,
      graduationYear: form.graduationYear ? Number(form.graduationYear) : null,
      avatarUrl: form.avatarUrl || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.patch("/users/me", parsed.data);
      await qc.invalidateQueries({ queryKey: keys.session });
      await qc.invalidateQueries({ queryKey: keys.profile(profile.username) });
      toast.show("Profile saved");
      router.push(`/${profile.username}`);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 px-4 md:px-0">
      <h1 className="text-[20px] font-semibold tracking-[-0.02em]">Edit profile</h1>

      <div className="flex items-center gap-4">
        <Avatar src={form.avatarUrl || null} name={form.displayName || "You"} size="lg" />
        <div className="flex-1">
          <Input
            label="Photo link"
            placeholder="https://"
            value={form.avatarUrl}
            onChange={set("avatarUrl")}
            hint="Device uploads arrive with the media phase."
          />
        </div>
      </div>

      <Input label="Name" value={form.displayName} onChange={set("displayName")} maxLength={40} />
      <Textarea
        label="Bio"
        value={form.bio}
        onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value.slice(0, BIO_MAX) }))}
        hint={`${form.bio.length} / ${BIO_MAX}`}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label="Institution"
          value={form.institution}
          onChange={set("institution")}
          placeholder="IIT Madras"
        />
        <Input
          label="Course"
          value={form.course}
          onChange={set("course")}
          placeholder="B.Tech CSE"
        />
      </div>
      <Input
        label="Graduation year"
        inputMode="numeric"
        value={form.graduationYear}
        onChange={set("graduationYear")}
        placeholder="2027"
        className="max-w-[160px]"
      />

      {error && <p className="text-[13.5px] text-like">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          Save
        </Button>
      </div>
    </form>
  );
}
