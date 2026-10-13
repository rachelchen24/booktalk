# BookTalk — Vision & Spec

> **BookTalk gets you back into your book in 30 seconds.** Tell it where you are, and it tells you what's happened so far — without spoilers.

Tagline: *Spoiler-free recaps of what you've read so far.*

---

## 1. The problem

You pick a book back up — an audiobook on your commute, a paperback on the couch — and think *"wait, what happened before?"* You read it. You just don't remember it.

BookTalk lets you say where you're picking up (page, chapter, audiobook time, percentage, or even the last thing you remember) and gives you a quick recap so you can regain your train of thought and go *"oh right."*

Readers often stop abruptly (getting off a plane, arriving somewhere), so BookTalk can't rely on them doing anything at the moment they stop. It has to work even when they did nothing but close the book.

## 2. Who it's for

**Anyone who reads**, in any format:
- **Audiobook listeners** — know their time (e.g. 3h 42m) or percentage.
- **Ebook readers** — know their percentage or chapter.
- **Paper book readers** — know their page or chapter, and sometimes lose their bookmark entirely.

## 3. The core moment

Log in → tap your **most recent book** → tap the **last chapter you read** → read a short "previously on…" → *"oh right."*

Every feature should make that moment faster or more trustworthy.

## 4. Principles

1. **Never spoil.** Recaps, lookups, and place-finding only ever describe the story *up to* the reader's spot. When unsure, say less.
   - Example of why this matters: describing Kiamo Ko as "where Fiyero's widow lives" would spoil *Wicked* for someone who hasn't reached that part.
2. **Be honest about uncertainty.** AI models know popular books well but can invent details for less popular ones. If BookTalk doesn't know a book well, it says so (e.g. "I'm not confident about this book — this recap may be inaccurate") instead of making things up. The reader's own notes are always treated as the most trustworthy source.
3. **Short over thorough.** 3–5 bullets first; more detail on request.
4. **Format-agnostic.** Page, timestamp, percentage, chapter, or remembered event in — the same recap out. Under the hood, every input is converted to a **chapter**.
5. **Low friction.** Easy login, adding books and marking your spot should take one or two taps. No password gymnastics.
6. **Feels like a book, not a chatbot.** Recaps, lookups, and place-finding results should read like part of the book's world — a "previously on…" page in a novel, a friend catching you up — not like output pasted from an AI chat.
   - **Writing:** plain, natural sentences in the recap's tone. No chatbot filler ("Sure! Here's a recap…", "Great question", "I hope this helps"), no "As an AI…", no emojis, no wall of bold text, no stock AI phrasing ("delve", "tapestry", "it's worth noting", "a testament to"), no em-dash pileups.
   - **Look:** no chat bubbles, no typing/streaming text effect, no sparkle ✨ or robot icons, no "AI-generated" badges. Recaps use the same book typography as the rest of the app (serif headings, comfortable reading width).
   - **Still honest (see principle 2):** not *looking* like a chatbot is not the same as hiding the source. A small, quiet line says where a recap comes from (e.g. "Based on BookTalk's knowledge of this book and your notes"), and the low-confidence warning is shown in plain words.

---

## 5. v1 features

### 5.1 Accounts
- Sign up / log in with **email** + a **numeric PIN**.
- **No complexity rules** (no "12 characters with a capital, number, and symbol").
- **Reader chooses a 4- or 6-digit PIN.** 4 digits for people who just want it easy; 6 for people who want more security.
  - Implementation note: Supabase requires passwords of 6+ characters, so the PIN is converted server-side into a longer password before it reaches Supabase. The reader only ever types their PIN.
- Security that doesn't add friction:
  - PIN is hashed, never stored in plain text.
  - **Lockout after 5 failed attempts** for 15 minutes (this is what makes a 4-digit PIN safe enough — a bot can't try all 10,000).
  - **Unlock any time by email:** a locked-out reader can get a one-time link that logs them in and lifts the lock, instead of waiting.
  - Forgot PIN → reset link by email.
- The library, spots, and notes are saved to the account (database), so they sync across devices.

### 5.2 Library
- Add books easily: search by title/author, or enter an ISBN.
- Home screen shows the reader's books, **most recently read first** — "read" means most recently *opened* (or added), so the book you're in sits at the top.
- Each book shows its **cover** (from Open Library, with a plain fallback when there isn't one).
- Each book shows the reader's current spot (chapter + %) and a **progress bar** for % complete, right on the library page. A book at 100% shows as **Finished**.
- **Reading stats** at the top of the library. First stat: **"N books read in [year]"**, where a book counts as read when the reader marks its last chapter as their spot (moving the spot back un-finishes it). More stats to be brainstormed later.

### 5.2a Book page (what you see when you click a book)
Top to bottom:

1. **Two big buttons across the top, in this order:**
   1. **Recap to my spot** → runs the recap (5.6).
   2. **Find my place** → opens the "find my place by…" options (5.5).
   (No separate "view notes" button — the notes are already right below.)
2. **Notes, listed by chapter, collapsed by default.** Click a chapter to expand its notes.
   - A small **green dot** next to every chapter that has notes, so readers can see at a glance where they've been — and often figure out their spot just from where the dots stop.
   - The reader's current spot is marked separately (e.g. a bookmark icon).
3. **Final notes / rating** at the very end, after the last chapter:
   - **Rate the book** (e.g. 1–5 stars).
   - A short "final thoughts" note.

### 5.3 Editions (paper books)
Page numbers differ between editions, so paper readers can tell BookTalk which version they have. Any of these help:
- **ISBN** (most reliable — on the barcode / copyright page).
- **Publisher / printer** and **format** (paperback, hardcover, mass market, etc.).
- **Total number of pages.**
- **What page chapter X starts on** (calibration point).
- **Physical dimensions** of the book (best-effort — this data is often missing from book databases, so it's a helper, not a requirement).

BookTalk uses this to find the right edition (or the closest match) and map page numbers → chapters accurately. If no exact edition is found, it estimates using page count and any calibration points.

### 5.4 Chapters & marking your spot
- When a book is added, BookTalk proposes a chapter list (number + title):
  - from Open Library's table of contents if available,
  - otherwise AI-suggested.
- The reader can **confirm or edit** it (e.g. "my edition has 32 chapters, not 30").
  - **Suggestions are shared, edits are private.** The suggested list for a book (from Open Library or the AI) is stored once and offered to every reader, so the next reader gets it instantly and the AI isn't asked twice.
  - **A reader's edits only ever apply to them.** Editing makes the reader's own copy; nobody else sees it, and nobody can change another reader's chapters.
  - If no suggestion is available (no table of contents, AI not set up), the reader can say "my book has __ chapters" and add titles if they want.
- **Marking your spot is one tap** on a chapter.
- **Two views, toggleable:**
  - **List** of chapters.
  - **Grid of chapter boxes** across the screen, clickable.
- Chapter boxes/rows show: the reader's current spot, chapters already read, and a **green dot** if the chapter has notes.

### 5.5 Find my place by…
A clear "**Find my place by:**" selector with these options:
- **Chapter** — tap it in the list or grid.
- **Page number** — mapped to a chapter using the edition (5.3).
- **Audiobook time** — hours and minutes (e.g. 3h 42m). Estimated from the audiobook's total length (asked once, then remembered). *Later:* real chapter timings from Audnexus for Audible titles, which needs the book's Audible ID (ASIN).
- **Page, time and % results are estimates** (chapters vary in length), so BookTalk shows its best guess plus the chapters on either side, and the reader taps the right one. A "chapter X starts on page Y" reference point from the edition (5.3) makes page estimates more accurate.
- A spot can be partway through a chapter (e.g. "Chapter 13 · 40%"). A book counts as finished at 100%.
- **Percentage** through the book.
- **Last remembered event** — the reader types the last thing they remember, e.g. *"Elphaba ran away with Fiyero."*
  - BookTalk returns **several possible spots**, each showing **only**:
    - chapter number,
    - chapter title,
    - % through the book.
  - **No event descriptions** in the options (they could spoil).
  - The reader picks one, and that becomes their spot.
  - The reader's own notes are searched first, then the AI's knowledge of the book.
  - Designed especially for **paper book readers who lost their bookmark**.

### 5.6 Recap ("previously on…")
- Spoiler-free summary of everything **up to the reader's spot**, nothing after.
- Format:
  - 3–5 bullet "previously on…" summary.
  - "More detail" option for a longer recap.
  - List of main characters introduced so far.
- Uses the reader's notes as ground truth.
- **Tone:** neutral by default, but **inferred from the reader's notes** — e.g. if the reader leaves humorous notes, the recap matches that energy.
- Shows a confidence warning when BookTalk doesn't know the book well.
- **Must not look or read like a chatbot** — see principle 6.

### 5.7 Notes
Not one big text box for the whole book — each note is its own small card, attached to a spot.
- **Notes are editable and deletable** in place, wherever they're shown.
- **Two ways to add a note:** a **quick note box** at the top of the book page (chapter optional, the fastest way to jot something when you stop), and an "add a note" box inside each chapter. Notes saved without a chapter appear under "Notes without a chapter" with a "Move to chapter" option.
- **Shift + Enter saves** a note in any note box; plain Enter makes a new line.
- Short notes like *"Character A killed Character B."*
- Anchored to a **chapter** (required) plus optional:
  - **page number**,
  - **audiobook timestamp**,
  - **quote snippet** ("the paragraph starting with…") to pinpoint the exact paragraph. (Ideally notes would attach to real paragraphs in the book, but we don't have the book text — the quote snippet gets close.)
- Where notes show up:
  - On the **book page** (5.2a): every chapter as a collapsed row with a **green dot** if it has notes; click to expand. Read them all in one place, or just one chapter at a time.
  - Inside an expanded chapter, notes are in page order (like margin notes).
  - Green dots also appear on the chapter list/grid views (5.4).
- **Final notes / rating** at the end of the book: star rating + final thoughts.
- **@tags** for characters and places (e.g. `@Elphaba`, `@Kiamo Ko`) — these link notes to character/place lookups (v1.5).
- Notes feed the recap (accuracy + tone) and "last remembered event" search.

### 5.8 Optional "what just happened?" voice/quick note
Because readers often stop abruptly, this is **optional**, never required:
- A quick "stopped here" button to save your spot in one tap.
- Optionally record a short **voice note** or type a quick note about what just happened.
  - Voice notes use the browser's built-in speech-to-text (works in Chrome, Edge, and Safari). The reader sees the text and can fix it before saving.
  - **Firefox doesn't support it.** Firefox users see a short message instead of the mic button, e.g. "Voice notes don't work in Firefox yet — try Chrome, Edge, or Safari, or type your note."
- These become regular notes attached to that spot.
- No reminder notifications (dropped).

---

## 6. v1.5 — Character & place lookups
- Tap a character or place to get a **short paragraph**:
  - **Characters:** personality, past actions, relationships.
  - **Places/settings:** what and where it is, who's connected to it (e.g. Kiamo Ko).
- **Spoiler-safe:** only describes what's known up to the reader's spot.
- Includes the reader's own @tagged notes about that character/place.

## 7. Later / future ideas
- **Analysis notes** — themes, symbolism, deeper notes beyond plot.- **Photo of a page → text recognition (OCR)** — anchor notes to real paragraphs and auto-detect position (great for paper books).
- **Audiobook app integration** — use BookTalk right inside Audible, Libby, Spotify, etc. Not possible yet: these apps are closed and DRM-protected, so this requires official partnerships.
- **Read-aloud recaps** (fits audiobook listeners).
- **Series recaps** ("what happened in book 1?").
- **Better edition finder** using physical details.

## 8. Constraints & known limits
- **No access to book text.** Books are copyrighted and audiobook/ebook apps are DRM-protected; BookTalk does not scrape SparkNotes/LitCharts or extract book content. Recaps come from the AI's general knowledge, shared chapter data, and the reader's notes.
- **AI accuracy varies by book popularity.** Strong for popular books, weaker for obscure ones — hence the confidence warnings and notes-as-ground-truth.
- **Chapter data isn't freely available everywhere** — hence shared suggestions (Open Library table of contents, else AI) that each reader confirms or edits privately. In practice Open Library rarely has a usable table of contents (checked: 2 of 54 *Wicked* editions, both junk), so the AI suggestion and manual entry carry most of the weight.

## 9. Stack
- **Next.js + TypeScript + Tailwind** — frontend and API routes
- **Supabase** — accounts (email + 4/6-digit PIN) and Postgres database
- **Open Library API** — book search, editions, ISBN lookup, covers
- **Claude API** — recaps, chapter-list suggestions, last-remembered-event matching, tone matching, lookups
- **Vercel** — hosting / live demo

## 10. Project goals (portfolio)
This is a GitHub portfolio project for recruiters, so the repo should have:
- A **live demo link** at the top of the README.
- Screenshots / a demo GIF.
- A short "why I built this" story.
- Tests for core logic (e.g. page/time/% → chapter mapping).
- Clean, meaningful commit history.
- Documented trade-offs (e.g. PIN login vs. complex passwords, spoiler safety, no book text).

Built step by step, with each piece explained, so every design decision can be discussed in interviews.

## 11. Build order
1. Scaffold + accounts (email + 4/6-digit PIN) — ✅ plus "unlock by email" for locked accounts
2. Library + book search / ISBN + book page layout (2 buttons, collapsed notes, rating) — ✅ plus basic notes pulled forward from step 6 (quick note box, editable cards, Shift + Enter)
3. Editions + chapter lists (list/grid views, one-tap spot) — ✅ plus library progress bars and the "books read this year" stat
4. Find my place (chapter, page, time, %, last remembered event) — ✅ built (notes-first memory search; AI optional)
5. Recaps (spoiler-free, notes-aware, tone matching)
6. Notes (remaining: page/timestamp/quote anchors, @tags, optional voice note — cards, editing, quick note and green dots already exist)
7. Deploy + README
8. v1.5: character & place lookups
