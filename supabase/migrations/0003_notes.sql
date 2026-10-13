-- Notes: small cards a reader leaves in a book, grouped by chapter on the book page.
--
-- The spec (VISION §5.7) makes the chapter required. Chapter lists don't exist until
-- step 3, so for now a reader can type a chapter number or leave it blank; blank
-- notes show under "No chapter yet" and can be assigned a chapter later.
-- Page, timestamp, quote snippet and @tags arrive in step 6.

create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Removing a book from your library removes its notes too.
  entry_id   uuid not null references public.library_entries (id) on delete cascade,
  chapter    integer check (chapter between 1 and 1000),
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

-- The book page's query: "this book's notes, by chapter, oldest first".
create index notes_entry_chapter on public.notes (entry_id, chapter, created_at);

alter table public.notes enable row level security;

create policy "Readers see their own notes"
  on public.notes for select to authenticated
  using ((select auth.uid()) = user_id);

-- Checking user_id alone isn't enough: a reader could label a note as theirs but
-- attach it to someone else's library entry. So the entry must belong to them too.
create policy "Readers add notes to their own books"
  on public.notes for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.library_entries e
      where e.id = entry_id and e.user_id = (select auth.uid())
    )
  );

create policy "Readers update their own notes"
  on public.notes for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.library_entries e
      where e.id = entry_id and e.user_id = (select auth.uid())
    )
  );

create policy "Readers delete their own notes"
  on public.notes for delete to authenticated
  using ((select auth.uid()) = user_id);
