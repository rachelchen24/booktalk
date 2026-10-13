# BookTalk: progress and handoff

Read this first when you pick the project back up. **[VISION.md](VISION.md) is still the spec and
wins over anything here.** This file records how we're working, what's built, and what's next.

_Last updated: 2026-10-12, end of Step 1._

---

## How we work (Rachel's instructions)

- Build in the order of VISION.md §11, **one step at a time**.
- **Explain each piece and the reason for it.** This is a portfolio project, and Rachel needs to
  discuss every design decision in interviews.
- **Ask before starting the next build step.**
- Save finished files made *for Rachel* (PDFs, exports) to `C:\Users\rache\Downloads`, and don't
  overwrite files there. Project files stay in the repo.

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

- **Node 24** is installed at `C:\Program Files\nodejs`, but it wasn't on the terminal PATH in
  the first session. If `node` isn't found, prepend it: bash
  `export PATH="/c/Program Files/nodejs:$PATH"`, PowerShell
  `$env:Path = "C:\Program Files\nodejs;$env:Path"`. (Restarting VS Code should fix this.)
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
- ❌ **Not yet tested against a real Supabase project.** Signup, login, lockout, unlock, and
  reset have never run end to end. Do that before or early in Step 2, once Rachel has created
  the project (docs/SETUP.md).
- ❌ Nothing is committed yet. The repo has no commits. Ask Rachel before committing. The spec
  wants a clean, meaningful history, e.g. one commit for the scaffold and one for PIN auth.

### Small known issues / ideas
- In `LoginForm`, after an unlock link is sent, its message stays visible over later login
  errors until the page reloads. This is minor.
- Supabase's built-in email sender allows only a few emails an hour. Custom SMTP is needed
  before the live demo (see SETUP.md).
- A possible small test target: move `safeNextPath` from `auth/confirm/route.ts` into `lib/` and
  unit-test it.

---

## Next: Step 2 (ask Rachel before starting)

Library + book search/ISBN + book page layout (VISION §5.2, §5.2a):
- DB tables and row-level security: books (shared, from Open Library), the reader's library
  entries (last read at, current spot), and later notes/ratings.
- Open Library search by title/author and ISBN lookup, with covers.
- Home = library sorted by most recently read, each book showing chapter + %.
- Book page: **Recap to my spot** and **Find my place** buttons (placeholders until Steps 4–5),
  notes collapsed by chapter with green dots, rating and final thoughts at the end.

Open questions for Rachel:
1. Commit Step 1 now, and how should the commits be split?
2. Has she set up Supabase yet, so we can test auth end to end?
