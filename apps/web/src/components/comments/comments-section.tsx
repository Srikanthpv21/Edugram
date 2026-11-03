"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, BadgeCheck } from "lucide-react";
import { COMMENT_MAX } from "@edugram/shared";
import { timeAgo } from "@/lib/format";
import { useComments, useCreateComment, useSession } from "@/lib/queries";
import { errorMessage } from "@/lib/api";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";

export function CommentsSection({ postId }: { postId: string }) {
  const q = useComments(postId);
  const { data: user } = useSession();
  const create = useCreateComment(postId);
  const toast = useToast();
  const router = useRouter();
  const [body, setBody] = useState("");
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    if (!user) return router.push("/login");
    create.mutate(text, {
      onSuccess: () => setBody(""),
      onError: (err) => toast.show(errorMessage(err), "error"),
    });
  };

  return (
    <section className="px-4 md:px-0">
      <form
        onSubmit={submit}
        className="sticky top-[var(--nav-h)] z-10 -mx-4 flex items-center gap-3 bg-bg px-4 py-3 md:static md:mx-0 md:px-0"
      >
        <Avatar src={user?.avatarUrl} name={user?.displayName ?? "You"} size="sm" />
        <div className="flex h-11 flex-1 items-center rounded-full bg-surface-2 pl-4 pr-1.5 transition-shadow focus-within:shadow-[inset_0_0_0_1.5px_var(--ink)]">
          <input
            value={body}
            maxLength={COMMENT_MAX}
            onChange={(e) => setBody(e.target.value)}
            placeholder={user ? "Add a comment" : "Sign in to comment"}
            onFocus={() => !user && router.push("/login")}
            className="h-full w-full bg-transparent text-[14.5px] outline-none placeholder:text-muted"
          />
          <AnimatePresence>
            {body.trim() && (
              <motion.button
                type="submit"
                aria-label="Post comment"
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ type: "spring", stiffness: 600, damping: 30 }}
                disabled={create.isPending}
                className="grid size-8 place-items-center rounded-full bg-ink text-bg disabled:opacity-50"
              >
                {create.isPending ? (
                  <Spinner className="size-4" />
                ) : (
                  <ArrowUp className="size-4" strokeWidth={2.5} />
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </form>

      <ul className="flex flex-col gap-4 py-3">
        {q.isLoading && (
          <li className="grid h-20 place-items-center">
            <Spinner className="size-5 text-muted" />
          </li>
        )}
        {!q.isLoading && items.length === 0 && (
          <li className="py-6 text-center text-[14px] text-muted">
            No comments yet. Start the conversation.
          </li>
        )}
        <AnimatePresence initial={false}>
          {items.map((c) => (
            <motion.li
              key={c.id}
              layout
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <Link href={`/${c.author.username}`} className="mt-0.5 shrink-0">
                <Avatar src={c.author.avatarUrl} name={c.author.displayName} size="sm" />
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] leading-[1.45]">
                  <Link
                    href={`/${c.author.username}`}
                    className="mr-1.5 inline-flex items-center gap-1 font-semibold"
                  >
                    {c.author.username}
                    {c.author.isVerified && <BadgeCheck className="size-3.5 fill-accent text-bg" />}
                  </Link>
                  <span className="whitespace-pre-wrap">{c.body}</span>
                </p>
                <p className="mt-1 text-[12px] text-muted tabular">{timeAgo(c.createdAt)}</p>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
        {q.hasNextPage && (
          <li className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              loading={q.isFetchingNextPage}
              onClick={() => q.fetchNextPage()}
            >
              More comments
            </Button>
          </li>
        )}
      </ul>
    </section>
  );
}
