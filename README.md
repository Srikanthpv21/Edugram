# Edugram

A social network for students. Web first, India first, built to grow.

## Stack

| Layer     | Choice                                                     |
| --------- | ---------------------------------------------------------- |
| Web       | Next.js 15 (App Router), React 19, Tailwind v4, Motion, TanStack Query |
| API       | Node.js, Fastify 5, Zod validation, Drizzle ORM            |
| Database  | Postgres. Embedded PGlite for local dev, real Postgres in production |
| Auth      | Phone OTP (console in dev, MSG91 in prod), JWT in httpOnly cookie |
| Monorepo  | pnpm workspaces + Turborepo, shared types and schemas in `packages/shared` |

## Run it

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000 (health at `/health`)

The seed creates five students. Sign in with any of these numbers; the one-time code is
printed in the API console and shown on the sign-in screen in development:

```
9000000001  @ananya.k
9000000002  @rohan_m
9000000003  @priya.sharma
9000000004  @arjun.dev
9000000005  @sneha_r
```

### Database

`apps/api/.env` points at an embedded Postgres (`pglite://./.data/edugram`) so nothing
needs installing. To use a real Postgres instead, start one (the `docker-compose.yml` in the
root works) and set:

```
DATABASE_URL=postgres://edugram:edugram@localhost:5432/edugram
```

Schema lives in `apps/api/src/db/schema.ts`. After changing it, generate a migration:

```bash
pnpm db:generate
```

The API applies pending migrations when it starts, so restarting `pnpm dev` is enough.
`pnpm db:migrate` exists for running them by hand against a real Postgres. With the embedded
database, only one process may open it at a time: stop the API before running `db:migrate` or
`db:seed` separately.

## Layout

```
apps/
  web/        Next.js app: screens, components, design tokens (src/app/globals.css)
  api/        Fastify API: routes, db schema, migrations, seed
packages/
  shared/     Zod schemas, TypeScript types and constants used by both
```

## What is built (phase 1)

- Phone OTP sign-in and onboarding (username, name, institution)
- Profiles with follower, following and post counts
- Follow and unfollow
- Posts: text, and images by link (device uploads come with the media phase)
- Home feed (people you follow), explore feed, people search
- Likes with optimistic updates and double-tap
- Comments
- Share (native share sheet or copy link), share counts
- Refer and earn: unique codes, invite links, wallet ledger with rewards credited on
  the referred user's onboarding

## Design rules

One typeface family for UI, a serif only for display moments. One accent colour. Black
primary buttons. No gradients as decoration, no stock illustration, no emoji in the
interface, no placeholder copy. Dark mode follows the system. If a screen looks like a
template, it gets redone.
