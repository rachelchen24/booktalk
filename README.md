# BookTalk

**Spoiler-free recaps of what you've read so far.**

**[Live demo →](https://YOUR-APP.vercel.app)** · click **Try the demo** for your own sample library, no sign-up needed.

![The BookTalk library page](docs/screenshots/library.png)

## Why I built this

I'd pick up an audiobook on my commute or a paperback after a few days off and think, *wait, what happened?* I'd read it; I just didn't remember it. Searching online for a summary meant either spoilers or a recap of the whole book.

BookTalk gets you back into a book in about 30 seconds. Tell it where you are (a chapter, a page, an audiobook timestamp, a percentage, or just the last thing you remember) and it gives you a short "previously on…" that stops exactly at your spot.

## What it does

- **Library:** search Open Library by title, author or ISBN. Your books show their covers, a progress bar, and how many you've read this year. The book you're in sits at the top.
- **Chapters and one-tap bookmarks:** chapter lists come from Open Library or an AI suggestion, or you type "Add 33 chapters". List or grid view. Tap a chapter to mark your spot.
- **Find my place by:** chapter, page, audiobook time, percentage, or *the last thing you remember*. Page and time become an exact percentage plus a best-guess chapter, with the neighbouring chapters offered too, because chapter lengths vary.
- **Recap to my spot:** 3–5 bullets, the characters met so far, and more detail on request. It stops at your spot, uses your notes as ground truth, matches their tone, and says so when it isn't sure about a book.
- **Notes:** small cards per chapter, with an optional page, audiobook time, or quote snippet. @tags for people and places, voice notes (browser speech-to-text), Shift + Enter to save, and general notes about the whole book.
- **Accounts:** email and a 4- or 6-digit PIN. No password rules, but a real lockout, plus an "unlock by email" link.

| Book page | Find my place | Previously on… |
|---|---|---|
| ![Book page](docs/screenshots/book.png) | ![Find my place](docs/screenshots/find.png) | ![Recap](docs/screenshots/recap.png) |

## How it's built

- **Next.js 16** (App Router, Server Components, Server Actions, Cache Components) + **TypeScript** + **Tailwind**
- **Supabase**: Postgres and auth, with **row-level security** on every table
- **Open Library**: book search, ISBN lookup, editions, covers
- **Claude API** (optional): recaps, chapter suggestions, and the "last thing I remember" search. Everything still works without an API key.
- **Vercel**: hosting, plus a daily cron job
- **Vitest**: 129 unit tests, plus integration checks against the real database

## Design decisions worth talking about

**A 4-digit PIN that's still safe.** Supabase needs 6+ character passwords, so the server turns the PIN into one with `HMAC-SHA256(server secret, email + PIN)`. Because that secret never leaves the server, nobody can skip the app and guess PINs against Supabase directly. Five wrong PINs lock the account for 15 minutes. The failure counter runs inside Postgres with a row lock, so parallel guesses can't race past the limit. The lockout counts guesses for emails that have no account too, so it doesn't reveal who has one.

**Never spoil, enforced in code.** Pure, tested functions decide what the AI may see: only chapter titles and notes up to your spot. A test plants "SPOILER" in a later chapter and checks it never reaches the model. If your spot is mid-chapter, the recap stops at the previous chapter. "Last thing I remember" only ever shows chapter numbers and titles, never events. Even the example text in the app is generic, because a real plot point there would spoil that book for every reader.

**No book text.** Books are copyrighted and audiobook apps are DRM-protected, so BookTalk never scrapes or stores book content. Recaps come from the model's general knowledge plus your own notes, and the notes win when they disagree.

**Honest AI, not a chatbot.** The model reports `knows_book` and a `confidence` level in structured output, and the app shows a plain warning or falls back to your notes. Recaps look like the recap page of a novel: no chat bubbles, no typing effect, and a cleanup step strips "Sure! Here's your recap:" style filler.

**Shared data vs. private data.** The book catalog and chapter-list suggestions are shared and server-written; readers can only read them. Your shelf, spot, notes and edits are yours alone, enforced by row-level security. Editing a suggested chapter list makes a private copy, so one person's mistake can't break anyone else's.

**Messy data, handled honestly.** Open Library is crowd-sourced. Only 2 of 54 *Wicked* editions had a table of contents, and both were junk. So the app filters strictly, treats Open Library as a bonus, and makes manual entry fast.

**Cost and speed.** AI only runs when you open a page, never during Next.js's background prefetching. Recaps are cached by a fingerprint of exactly what the model saw. When the free database was slow (one update took 16 s), I measured first, then cut round trips (local JWT checks with `getClaims()`) and made taps feel instant with optimistic UI.

**A demo that can't be broken.** "Try the demo" creates an anonymous Supabase account per visitor, with a sample library of public-domain books. Each visitor gets their own sandbox under the same row-level security as everyone else. A daily cron job keeps the free database awake and deletes week-old demo accounts.

## Run it locally

See **[docs/SETUP.md](docs/SETUP.md)**: create a Supabase project, run the SQL migrations, fill in `.env.local`, then `npm install && npm run dev`. `npm test` runs the unit tests without a database.

The product spec, including principles and build order, is in **[docs/VISION.md](docs/VISION.md)**.
