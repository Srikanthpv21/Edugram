import { sql as rawSql } from "drizzle-orm";
import { closeDb, db, schema } from "./index";
import { generateReferralCode } from "../lib/ids";

const { users, follows, posts, postLikes, comments } = schema;

const people = [
  {
    phone: "+919000000001",
    username: "ananya.k",
    displayName: "Ananya Krishnan",
    institution: "IIT Madras",
    course: "B.Tech Computer Science",
    graduationYear: 2027,
    bio: "Second year CS. Building things, breaking things, then fixing them.",
    isVerified: true,
  },
  {
    phone: "+919000000002",
    username: "rohan_m",
    displayName: "Rohan Mehta",
    institution: "BITS Pilani",
    course: "Economics",
    graduationYear: 2026,
    bio: "Econ nerd. Notes, summaries and the occasional rant about exams.",
    isVerified: false,
  },
  {
    phone: "+919000000003",
    username: "priya.sharma",
    displayName: "Priya Sharma",
    institution: "Delhi University",
    course: "B.A. Psychology",
    graduationYear: 2026,
    bio: "Psych major. I post study systems that actually work.",
    isVerified: true,
  },
  {
    phone: "+919000000004",
    username: "arjun.dev",
    displayName: "Arjun Nair",
    institution: "VIT Vellore",
    course: "B.Tech ECE",
    graduationYear: 2028,
    bio: "First year. Learning in public.",
    isVerified: false,
  },
  {
    phone: "+919000000005",
    username: "sneha_r",
    displayName: "Sneha Reddy",
    institution: "Christ University",
    course: "BBA",
    graduationYear: 2027,
    bio: "Case comps, coffee, and campus life.",
    isVerified: false,
  },
];

const img = (seed: string, w = 1200, h = 1500) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

const postSeeds: Array<{
  by: string;
  kind: "image" | "text";
  caption: string;
  media?: string[];
  tags?: string[];
}> = [
  {
    by: "ananya.k",
    kind: "image",
    caption:
      "Finally got the robotics lab to myself at 11pm. Nothing beats an empty lab and a working motor driver.",
    media: [img("lab-night")],
    tags: ["robotics", "iitm"],
  },
  {
    by: "priya.sharma",
    kind: "text",
    caption:
      "The 3-2-1 revision method, for anyone drowning before finals:\n\n3 days before: read everything once, no notes.\n2 days before: write one page per chapter from memory.\n1 day before: only look at what you got wrong.\n\nIt works because recall beats re-reading every single time.",
    tags: ["studytips", "finals"],
  },
  {
    by: "rohan_m",
    kind: "image",
    caption: "Library at 7am. Worth it for the window seat.",
    media: [img("library-morning")],
    tags: ["bits", "library"],
  },
  {
    by: "arjun.dev",
    kind: "text",
    caption:
      "Week 6 of learning to code. Today I understood recursion by explaining it to my roommate who did not ask. Sorry Karthik.",
    tags: ["learninginpublic"],
  },
  {
    by: "sneha_r",
    kind: "image",
    caption:
      "Case competition finals done. We did not win but the deck was the cleanest in the room.",
    media: [img("case-comp"), img("case-comp-2")],
    tags: ["casecomp", "bba"],
  },
  {
    by: "ananya.k",
    kind: "text",
    caption: "Hot take: most students do not need more study time, they need fewer tabs open.",
    tags: ["focus"],
  },
  {
    by: "priya.sharma",
    kind: "image",
    caption: "Colour coded the entire semester. Yes it took a whole afternoon. No regrets.",
    media: [img("planner")],
    tags: ["planning"],
  },
  {
    by: "rohan_m",
    kind: "text",
    caption:
      "Macro notes for Unit 3 are up on my profile. Covers IS-LM, fiscal multipliers and the stuff the textbook explains badly.",
    tags: ["economics", "notes"],
  },
];

const commentSeeds: Array<{ onPostIndex: number; by: string; body: string }> = [
  {
    onPostIndex: 0,
    by: "arjun.dev",
    body: "What motor driver are you using? L298N keeps dying on me.",
  },
  { onPostIndex: 0, by: "ananya.k", body: "TB6612FNG. Runs cooler and does not fry itself." },
  {
    onPostIndex: 1,
    by: "sneha_r",
    body: "Tried this last sem and it genuinely saved me. Day 2 is brutal though.",
  },
  { onPostIndex: 1, by: "rohan_m", body: "Saving this. Finals in 9 days." },
  { onPostIndex: 3, by: "priya.sharma", body: "Karthik is the real MVP here." },
  { onPostIndex: 4, by: "ananya.k", body: "Clean deck is half the battle. Next time." },
  { onPostIndex: 5, by: "rohan_m", body: "I have 47 tabs open as I read this." },
];

const followPairs: Array<[string, string]> = [
  ["ananya.k", "priya.sharma"],
  ["ananya.k", "rohan_m"],
  ["rohan_m", "ananya.k"],
  ["rohan_m", "priya.sharma"],
  ["priya.sharma", "ananya.k"],
  ["arjun.dev", "ananya.k"],
  ["arjun.dev", "priya.sharma"],
  ["arjun.dev", "rohan_m"],
  ["sneha_r", "priya.sharma"],
  ["sneha_r", "ananya.k"],
];

async function main() {
  await db.execute(
    rawSql`truncate table wallet_entries, referrals, shares, comment_likes, comments, post_likes, posts, follows, otp_codes, users restart identity cascade`,
  );

  const now = Date.now();
  const inserted = await db
    .insert(users)
    .values(
      people.map((p, i) => ({
        ...p,
        referralCode: generateReferralCode(),
        onboardedAt: new Date(now - (30 - i) * 86_400_000),
        createdAt: new Date(now - (30 - i) * 86_400_000),
      })),
    )
    .returning();
  const byUsername = new Map(inserted.map((u) => [u.username!, u]));
  const idOf = (u: string) => byUsername.get(u)!.id;

  await db.insert(follows).values(
    followPairs.map(([a, b], i) => ({
      followerId: idOf(a),
      followingId: idOf(b),
      createdAt: new Date(now - (20 - i) * 3_600_000),
    })),
  );

  const insertedPosts = await db
    .insert(posts)
    .values(
      postSeeds.map((p, i) => ({
        authorId: idOf(p.by),
        kind: p.kind,
        caption: p.caption,
        mediaUrls: p.media ?? [],
        tags: p.tags ?? [],
        createdAt: new Date(now - (postSeeds.length - i) * 5_400_000),
      })),
    )
    .returning();

  const likeRows: Array<{ postId: string; userId: string }> = [];
  insertedPosts.forEach((post, i) => {
    const likers = inserted.filter((u, j) => u.id !== post.authorId && (i + j) % 3 !== 0);
    for (const u of likers) likeRows.push({ postId: post.id, userId: u.id });
  });
  await db.insert(postLikes).values(likeRows);

  await db.insert(comments).values(
    commentSeeds.map((c, i) => ({
      postId: insertedPosts[c.onPostIndex]!.id,
      authorId: idOf(c.by),
      body: c.body,
      createdAt: new Date(now - (commentSeeds.length - i) * 1_800_000),
    })),
  );

  await db.execute(rawSql`
    update users u set
      follower_count = (select count(*) from follows f where f.following_id = u.id),
      following_count = (select count(*) from follows f where f.follower_id = u.id),
      post_count = (select count(*) from posts p where p.author_id = u.id and p.deleted_at is null)
  `);
  await db.execute(rawSql`
    update posts p set
      like_count = (select count(*) from post_likes l where l.post_id = p.id),
      comment_count = (select count(*) from comments c where c.post_id = p.id and c.deleted_at is null)
  `);

  console.log(
    `Seeded ${inserted.length} users, ${insertedPosts.length} posts, ${likeRows.length} likes, ${commentSeeds.length} comments.`,
  );
  console.log("Sign in with any of these numbers (OTP prints in the API console):");
  for (const p of people) console.log(`  ${p.phone.replace("+91", "")}  @${p.username}`);
}

await main();
await closeDb();
