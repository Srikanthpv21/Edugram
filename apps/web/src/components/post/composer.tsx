"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ImagePlus, Type, X } from "lucide-react";
import {
  CAPTION_MAX,
  createPostSchema,
  httpsUrlSchema,
  type PostKind,
  type SessionUser,
} from "@edugram/shared";
import { cn } from "@/lib/cn";
import { errorMessage } from "@/lib/api";
import { useCreatePost } from "@/lib/queries";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export function Composer({ user }: { user: SessionUser }) {
  const [kind, setKind] = useState<PostKind>("text");
  const [caption, setCaption] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  const [urlDraft, setUrlDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const create = useCreatePost();
  const toast = useToast();
  const router = useRouter();

  const tags = tagsRaw
    .split(/[\s,#]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 10);

  const addUrl = () => {
    const u = urlDraft.trim();
    if (!u) return;
    const parsed = httpsUrlSchema.safeParse(u);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "That does not look like a link");
      return;
    }
    setUrls((x) => [...x, u].slice(0, 10));
    setUrlDraft("");
    setError(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = createPostSchema.safeParse({ kind, caption, mediaUrls: urls, tags });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setError(null);
    create.mutate(parsed.data, {
      onSuccess: (post) => {
        toast.show("Posted");
        router.push(`/p/${post.id}`);
      },
      onError: (err) => setError(errorMessage(err)),
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 px-4 md:px-0">
      <div className="flex items-center justify-between">
        <h1 className="text-[20px] font-semibold tracking-[-0.02em]">New post</h1>
        <div className="flex rounded-full bg-surface-2 p-1">
          {(
            [
              { k: "text", label: "Text", Icon: Type },
              { k: "image", label: "Photo", Icon: ImagePlus },
            ] as const
          ).map(({ k, label, Icon }) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors",
                kind === k ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Avatar src={user.avatarUrl} name={user.displayName ?? "You"} size="sm" />
        <p className="text-[14px] font-medium">
          {user.displayName} <span className="font-normal text-muted">@{user.username}</span>
        </p>
      </div>

      {kind === "image" && (
        <div className="flex flex-col gap-3">
          {urls.length > 0 && (
            <div className="no-scrollbar flex gap-2 overflow-x-auto">
              {urls.map((u, i) => (
                <div
                  key={u + i}
                  className="relative size-28 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-surface-2"
                >
                  <Image src={u} alt="" fill sizes="112px" className="object-cover" unoptimized />
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() => setUrls((x) => x.filter((_, j) => j !== i))}
                    className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-black/60 text-white"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label="Image link"
                placeholder="https://"
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addUrl();
                  }
                }}
                hint="Uploads from your device are coming in the next phase."
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={addUrl}
              className="mb-[26px]"
            >
              Add
            </Button>
          </div>
        </div>
      )}

      <Textarea
        value={caption}
        onChange={(e) => setCaption(e.target.value.slice(0, CAPTION_MAX))}
        placeholder={kind === "text" ? "What did you learn today?" : "Write a caption"}
        className={kind === "text" ? "min-h-44 text-[17px]" : ""}
        autoFocus={kind === "text"}
        hint={`${caption.length} / ${CAPTION_MAX}`}
      />

      <Input
        label="Tags"
        placeholder="studytips, finals, iitm"
        value={tagsRaw}
        onChange={(e) => setTagsRaw(e.target.value)}
        hint={tags.length ? tags.map((t) => `#${t}`).join("  ") : "Up to 10, separated by commas"}
      />

      {error && <p className="text-[13.5px] text-like">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button
          type="submit"
          loading={create.isPending}
          disabled={kind === "text" ? !caption.trim() : urls.length === 0}
        >
          Post
        </Button>
      </div>
    </form>
  );
}
