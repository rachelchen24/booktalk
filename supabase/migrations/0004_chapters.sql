-- Chapter lists and edition details (VISION §5.3, §5.4).
--
-- Suggestions are shared, edits are private:
-- * chapter_suggestions holds one suggested list per book per source (Open Library's
--   table of contents, or AI). Stored once, offered to every reader. Readers can read
--   it; only the server can write it.
-- * A reader's own list lives on their library entry. Either they use a suggestion
--   as-is (chapter_suggestion_id), or they have their own copy (chapters). Their
--   entry is already private (row-level security from 0002), so edits are too.
--
-- Chapter lists are stored as JSON arrays: [{"number": 1, "title": "Munchkinlanders"}, ...]
-- They're always read and saved as a whole, and the app validates them before saving
-- (src/lib/chapters/list.ts); the checks below are a backstop.

create table public.chapter_suggestions (
  id         uuid primary key default gen_random_uuid(),
  book_id    uuid not null references public.books (id) on delete cascade,
  source     text not null check (source in ('open_library', 'ai')),
  chapters   jsonb not null check (jsonb_typeof(chapters) = 'array' and jsonb_array_length(chapters) between 1 and 1000),
  created_at timestamptz not null default now(),
  unique (book_id, source)
);

alter table public.chapter_suggestions enable row level security;
create policy "Logged-in readers can see chapter suggestions"
  on public.chapter_suggestions for select to authenticated using (true);
-- No write policies: suggestions are written by the server with the service-role key.


alter table public.library_entries
  -- Using a shared suggestion as-is...
  add column chapter_suggestion_id uuid references public.chapter_suggestions (id) on delete set null,
  -- ...or the reader's own list (made by hand, or by editing a suggestion).
  add column chapters jsonb check (
    chapters is null
    or (jsonb_typeof(chapters) = 'array' and jsonb_array_length(chapters) between 1 and 1000)
  ),
  -- Edition details, mainly for paper books (page → chapter mapping in step 4).
  add column publisher text check (char_length(publisher) <= 200),
  add column format text check (format in ('hardcover', 'paperback', 'mass_market', 'ebook', 'audiobook', 'other')),
  add column total_pages integer check (total_pages between 1 and 20000),
  -- One known reference point, e.g. "chapter 12 starts on page 187".
  add column calibration_chapter integer check (calibration_chapter between 1 and 1000),
  add column calibration_page integer check (calibration_page between 1 and 20000),
  add constraint calibration_pair check ((calibration_chapter is null) = (calibration_page is null));
