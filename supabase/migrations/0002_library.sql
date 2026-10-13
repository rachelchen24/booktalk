-- Library: a shared catalog of books, plus each reader's own shelf.

-- One row per book (an Open Library "work" — the book itself, not a particular
-- printing). Shared by every reader, so chapter lists added in step 3 can be
-- confirmed once and reused by everyone.
create table public.books (
  id                 uuid primary key default gen_random_uuid(),
  ol_work_key        text not null unique,  -- e.g. "OL66218W"
  title              text not null,
  authors            text[] not null default '{}',
  cover_id           integer,               -- covers.openlibrary.org/b/id/<cover_id>-M.jpg
  first_publish_year integer,
  created_at         timestamptz not null default now()
);

-- Logged-in readers can look books up, but nobody can write to the catalog through
-- the API: there are no insert/update/delete policies. Our server adds books with the
-- service-role key, after re-fetching the details from Open Library itself, so a
-- reader can't plant a fake title or vandalize a book everyone shares.
alter table public.books enable row level security;
create policy "Logged-in readers can see books"
  on public.books for select to authenticated using (true);


-- One row per reader per book: their spot, rating and final thoughts.
create table public.library_entries (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  book_id          uuid not null references public.books (id) on delete restrict,
  -- Set when the reader added the book by ISBN: their exact edition.
  isbn             text,
  edition_cover_id integer,
  -- Current spot. Every way of finding your place resolves to a chapter (VISION §4).
  current_chapter  integer check (current_chapter > 0),
  current_percent  numeric(5, 2) check (current_percent between 0 and 100),
  rating           smallint check (rating between 1 and 5),
  final_thoughts   text check (char_length(final_thoughts) <= 5000),
  -- "Most recently read" = most recently opened (or added).
  last_opened_at   timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  unique (user_id, book_id)
);

-- The home screen's query: "my books, most recently opened first".
create index library_entries_user_recent on public.library_entries (user_id, last_opened_at desc);

-- Each reader sees and changes only their own shelf. `(select auth.uid())` rather than
-- `auth.uid()` lets Postgres compute the user once per query instead of once per row.
alter table public.library_entries enable row level security;
create policy "Readers see their own entries"
  on public.library_entries for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Readers add to their own library"
  on public.library_entries for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Readers update their own entries"
  on public.library_entries for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Readers remove their own entries"
  on public.library_entries for delete to authenticated
  using ((select auth.uid()) = user_id);
