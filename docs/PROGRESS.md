# BookTalk: progress and handoff

Read this first when you pick the project back up. **[VISION.md](VISION.md) is still the spec and
wins over anything here.** This file records how we're working, what's built, and what's next.

_Last updated: 2026-10-13. Steps 1–7 done. **Live at https://booktalk-rachel-chen.vercel.app** (repo github.com/rachelchen24/booktalk). Next: Step 8 (character & place lookups)._

---

## How we work (Rachel's instructions)

- Build in the order of VISION.md §11, **one step at a time**.
- **Explain each piece and the reason for it.** This is a portfolio project, and Rachel needs to
  discuss every design decision in interviews.
- **Ask before starting the next build step.**
- Save finished files made *for Rachel* (PDFs, exports) to `C:\Users\rache\Downloads`, and don't
  overwrite files there. Project files stay in the repo.
- **Rachel commits by hand.** Never run `git commit`; tell her what's ready and suggest how to
  split the commits.
- **Never send Rachel's email address to outside services** (e.g. in a User-Agent header).

## Spec in brief (full version: VISION.md)

**One line:** BookTalk gets you back into your book in 30 seconds. Tell it where you are and it
recaps the story so far, without spoilers.

**The core moment:** log in → tap most recent book → tap the last chapter read → short
"previously on…" → *"oh right."*

**Principles:** never spoil (say less when unsure) · be honest about uncertainty (show a
confidence warning for little-known books; reader's notes are ground truth) · short over
thorough (3–5 bullets) · format-agnostic (page/time/%/chapter/remembered event → a **chapter**) ·
low friction (one or two taps).

**v1 features**
- **Accounts:** email plus a 4- or 6-digit PIN chosen by the reader, with no password rules.
  The PIN is turned into a longer password on the server. Lockout after 5 wrong PINs.
  Forgot PIN → email link.
- **Library:** search by title/author or ISBN (Open Library). Most recently read first. Shows
  chapter + % for each book.
- **Book page:** two big buttons, **Recap to my spot** then **Find my place**. Below them, notes
  grouped by chapter, collapsed, with a green dot on chapters that have notes and a bookmark
  icon on the current spot. At the end: star rating plus final thoughts.
- **Editions (paper):** ISBN, publisher/format, page count, the page a chapter starts on, and
  (best-effort) dimensions, used to map pages → chapters.
- **Chapters:** suggested from the Open Library table of contents, or by AI. Reader confirms or
  edits. Confirmed lists are shared with other readers. One tap marks your spot. List view or
  grid view.
- **Find my place by:** chapter / page / audiobook time (Audnexus, or estimated from length) /
  % / last remembered event. The event search returns several possible spots showing *only*
  chapter number, title, and %, so nothing can spoil. It searches the reader's notes first,
  then the AI.
- **Recap:** covers only what happens up to the reader's spot. 3–5 bullets, a "more detail"
  option, and the characters met so far. Uses notes as ground truth, matches the tone of the
  reader's notes, and shows a confidence warning when needed.
- **Notes:** small cards anchored to a chapter (required), plus optional page, timestamp, and
  quote snippet. @tags for characters and places.
- **Quick "stopped here" button** plus an optional voice note (browser speech-to-text; Firefox
  gets a short "not supported" message instead).
- **v1.5:** spoiler-safe character and place lookups.

**Stack:** Next.js + TypeScript + Tailwind · Supabase (auth + Postgres) · Open Library ·
Claude API · Vercel.

**Build order (§11):** 1 scaffold + accounts ✅ · 2 library + search/ISBN + book page layout ·
3 editions + chapter lists · 4 find my place · 5 recaps · 6 notes · 7 deploy + README ·
8 v1.5 lookups.

---

## Environment gotchas

- **Node 24.20 / npm 11.19**, on PATH (fixed by restarting VS Code, confirmed 2026-10-13).
- **Next.js 16.4** differs from older versions. Check `node_modules/next/dist/docs/` before
  using an API you're unsure of (see AGENTS.md).
  - Middleware is now **`src/proxy.ts`** (export `proxy`, Node runtime).
  - **`cacheComponents: true`** is on. Reading `cookies()`, `headers()`, or `searchParams`
    outside `<Suspense>` **fails the build**. Pattern: keep a static shell and put user-specific
    parts in components wrapped in `<Suspense>`.
  - `cookies()`, `params`, and `searchParams` are async.
- `@types/node` was raised to ^24 (to match Node, and because Vitest needs it).
- `.gitignore` ignores `.env*` except `.env.example`.

## Commands

```
npm run dev      # http://localhost:3000 (needs .env.local)
npm test         # Vitest unit tests, no Supabase needed
npm run lint
npm run build
npx next typegen # regenerate route types if TS complains about PageProps<"/route">
```

---

## Step 1: what was built

### File map
| File | What it does |
|---|---|
| `src/lib/auth/pin.ts` | `isValidPin`, `normalizeEmail`, `pinToPassword` (HMAC-SHA256 with `PIN_PEPPER`) |
| `src/lib/auth/lockout.ts` | `MAX_FAILED_ATTEMPTS = 5`, `LOCKOUT_MINUTES = 15`, `lockMinutesRemaining`, `lockedMessage` |
| `src/lib/auth/*.test.ts` | 16 unit tests for the above |
| `src/lib/auth/current-user.ts` | `getCurrentUser()`: one shared lookup per request (React `cache`), uses `getUser()`, redirects to /login if logged out. Call it inside `<Suspense>`. |
| `src/lib/env.ts` | `requireEnv`, plus Supabase URL/key getters |
| `src/lib/supabase/server.ts` | Supabase client acting as the logged-in reader (cookies, row-level security applies) |
| `src/lib/supabase/admin.ts` | Service-role client, server-only, bypasses row-level security. Only used for `login_attempts`. |
| `src/proxy.ts` | Refreshes the session and redirects. Guest-only: /login, /signup, /forgot-pin. Public: /auth/confirm. Everything else needs login. |
| `src/app/(auth)/actions.ts` | Server actions: `signUp`, `logIn`, `sendUnlockLink`, `requestPinReset`, `resetPin`, `logOut` |
| `src/app/(auth)/{login,signup,forgot-pin,reset-pin}/` | Pages, each a static page plus a client form using `useActionState` |
| `src/app/auth/confirm/route.ts` | Landing route for every email link. Turns the token into a session, **clears the lockout**, and redirects to a safe `next` path. |
| `src/components/auth/ui.tsx` | `AuthShell`, `EmailInput`, `PinInput`, `FormMessage`, `SubmitButton` |
| `src/app/page.tsx` | Home: static header plus `<Suspense>` account menu and a placeholder library (**replace in Step 2**) |
| `src/app/globals.css` | Color tokens ("paper" palette, accent green #2f6b55, dark mode) and Tailwind theme mapping (`bg-surface`, `text-muted`, `text-accent`, …). Headings use `font-serif` (Literata). |
| `supabase/migrations/0001_login_attempts.sql` | `login_attempts` table (row-level security on, no policies) plus the `record_failed_login()` function (execute permission revoked from public/anon/authenticated) |
| `docs/SETUP.md` | Supabase setup steps, email templates, SMTP note |
| `.env.example` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `PIN_PEPPER`, optional `NEXT_PUBLIC_SITE_URL` |

### Login flow (`logIn`)
1. Check that the email and PIN look valid. Format errors don't count as guesses.
2. Read `login_attempts`. If locked, refuse without asking Supabase and set `locked: true`.
   If the read fails, refuse anyway (fail closed).
3. `signInWithPassword(email, pinToPassword(...))`.
4. `invalid_credentials` → `record_failed_login` RPC, which counts atomically and returns the
   lock expiry. Other errors (outages, rate limits) **don't** count.
5. Success → delete the `login_attempts` row and redirect to `/`.

### Unlocking (added at Rachel's request)
The owner can unlock **at any moment** by email instead of waiting 15 minutes. When locked, the
login form shows **"Email me an unlock link"**. That button uses `formAction` on the same form,
so it reuses the typed email, and `formNoValidate` so no PIN is needed. It calls
`sendUnlockLink`, which uses `signInWithOtp` (magic link) with `shouldCreateUser: false`. The
link lands on `/auth/confirm`, which logs the reader in and deletes their `login_attempts` row.
**Every** email link (confirm, unlock, reset) clears the lockout there, in one place, because
clicking any of them proves the reader owns the email.

### Design decisions to explain in interviews
- **Why an HMAC with a secret pepper, not padding:** only 10,000 four-digit PINs exist. If the
  conversion were public, an attacker could hit Supabase's API directly and skip our lockout.
  The pepper makes our server the only place a PIN can be checked. Mixing in the email gives
  readers with the same PIN different passwords. Bcrypt (done by Supabase) still hashes the
  result. Downside: rotating the pepper locks everyone out until they reset.
- **Counting in the database:** a read-then-write in the app lets two parallel guesses both see
  "4 failures". `SELECT … FOR UPDATE` in plpgsql makes them count one at a time. The lockout
  limits are passed in from TS, so the policy lives in one place.
- **Counting by email, including emails with no account:** an attacker can't tell which
  accounts are real from which ones get locked. Login, reset, and unlock all give the same
  message whether or not the account exists.
- **Locking out someone else is possible:** anyone who knows an email can lock it. This is
  limited by the short 15-minute lock and fully solved by the email unlock link.
- **Brute-force math:** 480 guesses a day means about 21 days for all 4-digit PINs and over
  5 years for 6 digits. That's fine for a reading app. A bank would need locks that grow with
  each failure. That's why the reader gets to choose 4 or 6.
- **Open-redirect guard** in `/auth/confirm` (`next` must be a same-site path).
- **The proxy's redirect isn't the security boundary.** Pages check the user again with
  `getUser()`, and row-level security protects the data.
- **Cache Components:** static shells load instantly, and the user's own content streams in
  behind `<Suspense>`.

### Verified vs. not verified
- ✅ `tsc`, `eslint`, 16 Vitest tests, and `next build` all pass. The smoke test (placeholder
  env, no real Supabase) showed `/` → 307 /login, auth pages 200, `/reset-pin` → 307 /login,
  and a bad email link → /login?link=expired.
- ✅ **Supabase project set up (2026-10-13):** `booktalk`, ref `qmeuzxcailyykjrcgdef`,
  us-west-2, Free plan. `.env.local` written (legacy anon + service_role keys, new random
  `PIN_PEPPER`). Migration 0001 applied. Redirect allow-list = `http://localhost:3000/**`.
  Set up through the Management API with a personal access token, which Rachel has since
  deleted. New migrations: she pastes them into the dashboard SQL Editor, or makes a fresh
  token.
- ✅ A no-email self-test against the real project passed: confirmed user created via the admin
  API, login with the derived password works, a wrong PIN gives `invalid_credentials`, the 5th
  failure locks for 15 min, anon gets 42501 calling the RPC and sees 0 rows in
  `login_attempts`, and cleanup works. It also found that the DB clock runs ~0.5 s ahead, which
  made the message say "16 minutes", so `lockMinutesRemaining` is now capped at
  LOCKOUT_MINUTES (17 tests).
- ⏳ Manual UI test by Rachel (signup email → confirm → wrong PINs → unlock link) in progress.
- **Free-plan limits found:** email templates **can't be edited** without custom SMTP, so links
  are the default PKCE `?code=` style and only work in the browser that requested them. The
  built-in sender allows **2 emails/hour** (`rate_limit_email_sent = 2`).
- ✅ Step 1 committed by Rachel (2026-10-12). Ask before future commits. The spec
  wants a clean, meaningful history: one focused commit per piece.

### Small known issues / ideas
- In `LoginForm`, after an unlock link is sent, its message stays visible over later login
  errors until the page reloads. This is minor.
- **Before the live demo (Step 7):** set up custom SMTP (e.g. Resend). That lifts the 2/hour
  limit and unlocks template editing, so switch the templates to `token_hash` links that work
  on any device (see SETUP.md). Also add the Vercel URL to the redirect allow-list and handle
  free projects pausing after 7 days of inactivity.
- A possible small test target: move `safeNextPath` from `auth/confirm/route.ts` into `lib/` and
  unit-test it.

---

## Step 2: Library + search/ISBN + book page (built, being tested)

Rachel's decisions: "most recently read" = most recently **opened** (or added). Covers are in.
She added VISION principle 6, **"Feels like a book, not a chatbot"**, which governs Steps 4–5
and 8.

### File map
| File | What it does |
|---|---|
| `supabase/migrations/0002_library.sql` | `books` (shared catalog; readers can only SELECT, writes go through the service role) + `library_entries` (per reader: spot, rating, final thoughts, isbn/edition cover, `last_opened_at`; per-owner RLS using the `(select auth.uid())` pattern; unique `(user_id, book_id)`) |
| `src/lib/books/isbn.ts` | `normalizeIsbn` (ISBN-10/13 check digits), `looksLikeIsbn` |
| `src/lib/books/open-library.ts` | Pure: types, URL builders, `toBookResults`, `toEdition`, `isWorkKey`, `coverUrl` |
| `src/lib/books/catalog.ts` | Server fetchers with `"use cache"` + `cacheLife`: `searchBooks`, `getBook`, `getEdition`. They throw `OpenLibraryError` so failures aren't cached. User-Agent is `BookTalk/0.1 (portfolio project)`. |
| `src/lib/library/queries.ts` | `getLibrary`, `getEntry`, `getShelvedWorkKeys`, `isUuid` (as the reader, so RLS applies) |
| `src/lib/library/format.ts` | `spotLabel`, `authorsLabel`, `MAX_FINAL_THOUGHTS` (client-safe) |
| `src/app/books/actions.ts` | `addBook` (re-fetches from Open Library, upserts the catalog with admin and the entry as the reader), `markOpened`, `saveReview`, `removeBook` |
| `src/app/page.tsx` | Library: big "Pick up where you left off" card for the most recent book, then an "Also on your shelf" grid |
| `src/app/add/` | Search page (`next/form`, query in the URL `?q=`), `AddButton` |
| `src/app/books/[id]/` | Book page: cover/title/spot → 2 big buttons (disabled placeholders) → notes-by-chapter empty state → "When you finish" (stars + final thoughts) → remove. `MarkOpened` calls the action from `useEffect` so prefetches don't count as opens. |
| `src/components/AppHeader.tsx`, `src/components/books/Cover.tsx` | Shared header; cover with `unoptimized` next/image (Open Library serves sizes already) and a no-cover placeholder |

### Findings worth mentioning in interviews
- Open Library data is crowd-sourced. A made-up ISBN with a valid check digit (9780000000002)
  turned out to be attached to two different junk records. That's why the reader confirms
  editions and chapters (Step 3).
- Unknown ISBNs redirect to an HTML page instead of returning a 404. `getJson` handles that
  with `allowMissing`.
- "use server" files can only export async functions, so constants live in `lib/library/format.ts`.

### Status
- ✅ tsc, lint, 41 tests, and `next build` pass.
- ✅ Migration 0002 applied by Rachel (2026-10-13). The no-email RLS self-test passed 13/13:
  readers can't write `books` (42501); B can't see, edit, delete, or insert into A's shelf;
  re-adding upserts instead of duplicating; the join works; a 9-star rating is rejected
  (23514); cleanup works. (One real `books` row, Wicked / OL66218W, was left in the catalog
  on purpose.)
- ✅ Manual UI test by Rachel: search, add, covers, ordering, rating, and remove all look good.

### Decisions for Step 3 (2026-10-13)
- **Claude API key: later.** Build the AI chapter suggestion code, but without
  `ANTHROPIC_API_KEY` it must fall back cleanly to "my book has __ chapters". Rachel probably
  won't pay for the API, so the app must be fully usable with no key.
- **Chapter lists: suggestions shared, edits private** (VISION §5.4 updated). Suggested lists
  per book are stored once and shared. Any edit creates the reader's own copy, visible only to
  them.
- **Rachel probably won't deploy.** VISION §10/§11 still say live demo + Vercel; she hasn't
  asked to change them. The README could use screenshots/GIF instead. Ask before Step 7.

### Step 3 build (2026-10-13): built, waiting on migration 0004
| File | What it does |
|---|---|
| `supabase/migrations/0004_chapters.sql` | `chapter_suggestions` (shared, select-only for readers, unique per book+source) + `library_entries` columns: `chapter_suggestion_id`, `chapters` jsonb (private copy), `publisher`, `format`, `total_pages`, `calibration_chapter`/`_page` (must be set together) |
| `src/lib/chapters/list.ts` | `parseChapters` (always renumbers 1…N), `numberedChapters`, `chapterName`, `resolveChapters` (own copy wins over the chosen suggestion), `percentThrough` |
| `src/lib/chapters/open-library-toc.ts` | `tocToChapters`: strict filter (≥3 entries, no "v.1."/"--" junk, ≥80% Latin script, drops front/back matter, keeps untitled "Chapter N" so numbering doesn't shift) |
| `src/lib/books/catalog.ts` → `getTocChapters` | Scans up to 100 editions (English first), `"use cache"` for weeks |
| `src/lib/chapters/ai.ts` | Optional Claude suggestion. Model from `ANTHROPIC_MODEL`, default `claude-opus-5-5` (per the claude-api skill; Rachel can choose `claude-haiku-5-5`). `messages.parse` + Zod schema with a `knows_chapters` gate, titles only (no spoilers), `effort: low`, `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`). No key → never called. |
| `src/lib/chapters/suggestions.ts` | `getSuggestions`, `ensureOpenLibrarySuggestion` (automatic, free), `requestAiSuggestion` (only on click); stored via admin with `ignoreDuplicates` |
| `src/app/books/chapter-actions.ts` | `chooseSuggestion`, `suggestWithAi`, `saveChapters` (private copy; clamps spot), `markSpot` (chapter count from the server, not the form), `moveNote`, `saveEdition` |
| `src/components/chapters/ChapterEditor.tsx` | **"Add ___ chapters" button** (Rachel's request): type 33 → Chapter 1…33 rows with optional titles; remove rows; save |
| `src/components/chapters/ChapterSection.tsx` | List/grid toggle (remembered with `useSyncExternalStore` + localStorage); list rows = `<details>` with notes + per-chapter note form + bookmark spot button; grid tap = **open the chapter below the grid** (`GridChapterPanel`: its notes, note box, "I've read up to here"), changed at Rachel's request; list and grid share `ChapterNotes`; read chapters tinted; **"General notes"** (renamed from "Notes without a chapter" at Rachel's request) with Move-to-chapter |
| `src/components/chapters/ChapterSetup.tsx`, `AiSuggestButton.tsx`, `EditionForm.tsx` | Setup panel when no chapters; edition form |
| `src/app/books/[id]/chapters/page.tsx` | "Chapters & edition" page (`?from=<suggestionId>` starts from a suggestion) |

Spot semantics: `current_chapter` = **last chapter finished**; % = chapter ÷ total.
Not built in Step 3 (deferred): physical dimensions (best-effort in spec), and page/time/% → chapter mapping (Step 4).

### Round after Step 3 (2026-10-13)
- ✅ Migration 0004 applied; chapters RLS self-test passed 15/15.
- **Quick note box: KEEP IT** (Rachel loves it). This question is settled; don't ask again.
- **Speed.** Supabase round trips measured at 0.7–1.8 s from Rachel's machine, with free-tier
  spikes (one single-row update took 16 s). Changes: `getCurrentUser` uses `getClaims()`
  (local ES256 check, no network; trade-off: a revoked session lasts until the token expires,
  about an hour) instead of `getUser()`; optimistic bookmark (`useOptimistic` in
  ChapterSection); optimistic new chapter notes; optimistic note edits. `getUser()` is kept
  only in `resetPin`, on purpose.
- **Dev warning fixed:** "`Date.now()` while prerendering" (every logged-in page since Step 2)
  came from Supabase's expiry check during background prefetch prerenders. Fix:
  `await connection()` at the start of `createClient()` in `lib/supabase/server.ts`.
- **Notes are editable** (Rachel was rightly annoyed they weren't): shared
  `components/notes/NoteCard.tsx` (Edit → textarea, Save / Shift+Enter, Esc cancels), `editNote`
  action. `DeleteNoteButton` moved to `components/notes/`.
- **Shift + Enter saves a note** in every note box (`components/notes/keyboard.ts`; skipped
  while an input method is composing). Plain Enter = new line.
- **Library: "N books read in YYYY"** stat + **progress bar** on every book
  (`components/books/ProgressBar.tsx`). "Read" = `finished_at` set when the reader marks the
  **last chapter**, kept if re-tapped, cleared if the spot moves back (`finishedAtAfterSpot`,
  tested). Year is UTC. Migration **0005_finished_at.sql**: ✅ applied (2026-10-13). Rachel wants to **brainstorm more stats later**.

### Step 4: Find my place (built 2026-10-13, waiting on migration 0006 + Rachel's test)
| File | What it does |
|---|---|
| `src/lib/place/estimate.ts` | Pure page/time/% → chapter: `estimateFromPage` (optional calibration point splits the book at "chapter X starts on page Y"), `estimateFromTime`, `estimateFromPercent`, `parseDuration` ("3h 42m", "3:42", "222"), `formatDuration`. Returns `{ chapter, percent, candidates: [prev, best, next] }`. A `+1e-9` nudge fixes float boundary bugs ((15/22)*22 = 14.999…); there's a test that fails without it. |
| `src/lib/place/memory.ts` | `keywords` (stop words, light stemming, @tags), `matchNotes`: notes-first "last thing I remember", score = share of keywords in the chapter's best note; ties go to the later chapter |
| `src/lib/place/ai-memory.ts` | Optional AI fallback. The model returns **chapter numbers only** (never descriptions), validated against the list, max 3 |
| `src/lib/ai/client.ts` | Shared `AI_MODEL`, `isAiConfigured`, `aiClient`, `logAiError` (chapters/ai.ts now uses it) |
| `src/app/books/place-actions.ts` | `setSpot` (chapter checked against the server's list; saves the estimate %; remembers `total_pages` / `audiobook_minutes`), `findByMemory` (notes → AI → helpful error) |
| `src/components/place/FindMyPlace.tsx` | "Find my place by:" picker. Chapter / Page / Audiobook time / Percentage compute **in the browser** (instant); Memory goes to the server. Candidates show only number, title, % → "This is my spot" |
| `src/app/books/[id]/find/page.tsx` | The page; the book page's "Find my place" BigButton now links here (Recap is still disabled until Step 5) |
| `supabase/migrations/0006_audiobook_length.sql` | `library_entries.audiobook_minutes` |

**Rachel's rule (2026-10-13): % = real position when known.** Page → page ÷ total pages, audiobook →
time ÷ total length, for *every* chapter option (not chapter-based % for the neighbours).
`Candidates` shows "You're 47% through the book (page 212 of 448). Which chapter is that?" once,
and every row saves `estimate.percent`. Memory results still show and save chapter-based %.
Knock-on change in `recapScope`: "at the end of a chapter" now means the % **equals**
`percentThrough(chapter)` (what tapping saves), or ≥100. It used to mean "≥ end of chapter",
which would misfire with real page % (chapter lengths vary) and could recap an unfinished
chapter. Tested.
**Spot semantics changed:** a spot can now be partway through a chapter ("Chapter 13 · 40%").
`current_chapter` = the chapter you've reached; `current_percent` = how far through the book.
Tapping a chapter in the list still means "end of this chapter". **Finished = percent ≥ 100**
(`finishedAtAfterSpot(percent, previous)`), not "on the last chapter".
**Audnexus not used:** it needs an Audible ASIN, which we don't have. Time is estimated from total length.
Mishaps this round (both fixed, no harm): a perl one-liner mangled `lib/chapters/list.ts`
(repaired by hand; use the Edit tool for multi-line edits), and a stray `git stash` that did
nothing (verified empty).

### Step 7: README + deploy (code done 2026-10-13; Rachel deploying)
Rachel's decisions: **deploy publicly** for recruiters; **"Try the demo"** button (anonymous
Supabase accounts with a seeded sample library); **AI on, with a spend cap**, model
`claude-haiku-5-5` via `ANTHROPIC_MODEL`.
| File | What it does |
|---|---|
| `src/lib/ai/client.ts` → `fallbackParams()` | `fallbacks: "default"` + beta header **only** for models that support it (opus-5-5, opus-5, fable-5-1, sonnet-5-5). **Haiku 5.5 has no server-side fallback** (the default form does nothing; the array form returns a 400), so all three AI modules spread this instead of hardcoding it |
| `src/lib/demo/seed.ts` | `seedDemoLibrary(client)`: Alice (OL138052W; 12 real chapter titles; spot = end of ch 6; 6 chapter notes with @tags/page/quote + 1 general note) and Oz (OL18417W; 24 numbered chapters; finished 3 days ago; 5★; final thoughts). Catalog rows via admin, everything else as the demo user |
| `src/app/(auth)/actions.ts` → `startDemo()` | `signInAnonymously()` → seed (failure is logged, not fatal) → `/` |
| `src/components/auth/TryDemo.tsx` | "Just looking around? Try the demo" box under the login and signup cards (`AuthShell` gained `aside` and a tagline) |
| `src/lib/auth/current-user.ts` | `CurrentUser` gains `email: string \| null` and `isDemo` (from `claims.is_anonymous`). The header shows a "Demo" badge + "Leave demo" |
| `supabase/migrations/0009_demo_cleanup.sql` | `delete_stale_demo_users(p_days)`: security definer, deletes anonymous auth.users older than N days (cascades); execute revoked from public/anon/authenticated, granted to service_role |
| `src/app/api/cron/daily/route.ts` + `vercel.json` | Daily 09:00 UTC: requires `Bearer CRON_SECRET`; pings `books` (keeps the free project awake) + runs the cleanup. `/api/cron` added to `PUBLIC` in proxy.ts |
| `README.md` | Recruiter-facing: live demo link (placeholder `YOUR-APP`), why, features, stack, design decisions, run locally. Screenshots expected at `docs/screenshots/{library,book,find,recap}.png` |
| `docs/SETUP.md` → "Deploying (Vercel)" | Click-by-click checklist |

**Deployed (2026-10-13):** live at https://booktalk-rachel-chen.vercel.app (stable alias; the `booktalk-<hash>-rachel-chen` links are single deployments). Migrations 0001–0009 applied, anonymous sign-ins ON, Vercel Deployment Protection disabled by Rachel. First deploy 500ed on every route because no env vars were set in Vercel: `requireEnv` in proxy.ts threw; fixed by adding them and rebuilding without the cache. Page titles added (`title.template` "%s · BookTalk" + Open Graph description in layout.tsx). Note: Rachel's `.env.local` lines are now indented 4 spaces (harmless to Next; trim when parsing it in scripts). ⚠️ `docs/PROGRESS.md` is committed and will be public.
It's a dev log mentioning Rachel's instructions and the Supabase project ID (not a secret).
Ask her whether to keep it public.

### Step 6: The rest of notes (built 2026-10-13, waiting on migration 0008)
| File | What it does |
|---|---|
| `supabase/migrations/0008_note_anchors.sql` | `notes.page`, `notes.audio_minutes`, `notes.quote` (≤300). ⏳ Rachel must run it; book pages error until she does (getNotes selects these columns) |
| `src/lib/library/notes.ts` | `Note` gains optional `page` / `audio_minutes` / `quote`; `sortInChapter` (page order like margin notes, then page-less oldest first); `parseAnchors` (validates the three fields; time uses `parseDuration`) |
| `src/lib/library/tags.ts` | `splitTags` / `extractTags` / `summarizeTags` / `mentionsTag` / `tagKey`. `@Alice`; multi-word names continue through capitalized words (`@Kiamo Ko`); stops at punctuation or a lowercase word; ignores emails; case-insensitive; drops possessives. **Not stored**: read from note text |
| `src/components/notes/AnchorFields.tsx` | Collapsed "+ Page, time or quote" fields (open if any are filled in). Used in QuickNoteBox, the chapter note form, and NoteCard edit |
| `src/components/notes/NoteText.tsx` | `NoteText` (tags highlighted), `NoteAnchors` ("p. 212 · 3h 42m · “quote…”"). Used in NoteCard, TagsPanel, recap notes |
| `src/components/notes/VoiceNoteButton.tsx` | Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`); support read via `useSyncExternalStore`; Firefox gets the spec's message; transcript is appended to the quick note box for editing before save. Chrome sends audio to Google's speech service (noted in the code comment) |
| `src/components/notes/TagsPanel.tsx` | "People & places" on the book page: tag chips with counts → notes mentioning the tag, with chapter names |

`addNote` / `editNote` accept and echo the anchors. Not built: a standalone "stopped here" button
(the one-tap chapter bookmark covers it; a button with no chapter wouldn't know where you stopped).

### Step 5: Recaps (built 2026-10-13)
| File | What it does |
|---|---|
| `src/lib/recap/scope.ts` | Pure, tested spoiler rules: `recapScope` (spot at a chapter's end → through that chapter; partway → only earlier chapters, `partwayInto` never summarized), `notesInScope`, `chaptersInScope`, `recapPromptInput` (tests assert nothing past the spot reaches the AI) |
| `src/lib/recap/text.ts` | `cleanRecapText` / `cleanLines`: strips markdown, bullet markers and chatbot openers ("Sure! Here's your recap:") |
| `src/lib/recap/ai.ts` | `writeShortRecap` (3–5 bullets + up to 8 characters) and `writeDetailRecap` (3–6 paragraphs). One system prompt encodes: never spoil, notes are ground truth, `confidence` + `knows_book`, match the tone of the notes, no chatbot style. `effort: "medium"`, fallbacks on |
| `src/lib/recap/service.ts` | `loadRecapContext` (returns `null` / `"no-chapters"` / context), `fingerprint` (sha256 of level + model + the exact AI input), `getSavedRecap` (only if the fingerprint matches), `writeAndSaveRecap` |
| `src/app/books/recap-actions.ts` | `generateRecap`, called from the browser after the page is on screen (never during prefetch) |
| `src/components/recap/WriteRecap.tsx` | `auto` mode starts on mount (a ref guards React's dev double-run); otherwise the "More detail" button. Skeleton while writing, no typing effect |
| `src/app/books/[id]/recap/page.tsx` | "Previously on" page: header (through chapter N; "partway into N, not included"), low-confidence notice, serif bullets, "Characters so far", "In more detail", a quiet source line, then "Your notes so far". **With no AI key it shows "From your notes" only** (Rachel's current setup) |
| `supabase/migrations/0007_recaps.sql` | Recap cache: one row per entry+level, fingerprint, RLS (own + entry ownership). ⏳ Not applied yet; only needed once an API key is set |

The book page's "Recap to my spot" BigButton now links here. ✅ Migration 0006 applied (2026-10-13).
A recaps RLS self-test is in the scratchpad (`check-recaps.mjs`); run it after 0007 is applied.

### Fixes from Rachel's Step 4 testing
- **Spoiler in placeholder:** the "last thing I remember" example was a real *Wicked* plot
  point and showed on every book. It's now generic, `e.g. "Alice found out Bob was lying"`.
  New rule in VISION §4.1: **example/placeholder text is always generic, never from a real
  book.** (Test files still use Wicked examples; tests aren't shown to readers.)
- **"Add ___ chapters" streamlined:** the number box is now *inside* the sentence (Add [33]
  chapters [+]) instead of a separate box next to a button that showed "___".

### Quick note box (added at Rachel's request, now permanent)
Rachel found it odd that the book page had no notes, so a basic note box was pulled forward
from Step 6 (migration `0003_notes.sql`: `notes` table, chapter number optional for now).
Files: `QuickNoteBox.tsx` (the temporary part), `NotesByChapter.tsx` (`<details>` per chapter,
green dot, "No chapter yet" last), `DeleteNoteButton.tsx`, `addNote`/`deleteNote` in
`books/actions.ts` (both call `refresh()` from next/cache), `getNotes` in queries,
`lib/library/notes.ts` (`groupByChapter`, `parseChapter`, limits; tested). The insert/update
RLS policies also check that the `entry_id` belongs to the reader. Note dates are formatted on
the server (UTC) and can be a day off; Rachel doesn't mind, so leave it.
✅ Migration 0003 applied (2026-10-13). Notes RLS self-test passed 10/10, including attaching
or moving a note onto another reader's entry → 42501.
**Rachel's instruction (updated): she may want to KEEP the quick note box at the top. After the
expandable notes-by-chapter (Step 3) are working, ASK her whether to keep or remove it. Don't
remove it on your own.** Notes then get added from inside each chapter, and the "No chapter yet"
notes need a way to be given a chapter.

## Interview notes
Rachel's interview prep lives in **`docs/PROCESS-NOTES.md`**. It's kept out of git through
`.git/info/exclude` (a local-only ignore list), so it never reaches the public repo. **Add to it at the end of every step**: new design
decisions, trade-offs, bugs found, likely questions. Keep it in plain first-person talking
points.

Open questions for Rachel:
1. (Answered: Step 1 is committed.)
2. (Answered: Supabase is set up. See "Verified" above.)
