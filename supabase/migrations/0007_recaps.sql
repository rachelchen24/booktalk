-- Saved recaps (VISION §5.6). Writing a recap costs an AI call, so the latest one per
-- book and level ("short" bullets, or "detail") is kept and reused until what it was
-- based on changes: the reader's spot, their notes in scope, or the chapter list.
-- `fingerprint` is a hash of those inputs; a different fingerprint means "rewrite it".

create table public.recaps (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entry_id    uuid not null references public.library_entries (id) on delete cascade,
  level       text not null check (level in ('short', 'detail')),
  through     integer not null check (through between 1 and 1000),
  fingerprint text not null,
  content     jsonb not null,
  created_at  timestamptz not null default now(),
  unique (entry_id, level)
);

alter table public.recaps enable row level security;

create policy "Readers see their own recaps"
  on public.recaps for select to authenticated
  using ((select auth.uid()) = user_id);

-- Like notes: the recap must be the reader's AND attached to their own library entry.
create policy "Readers save recaps for their own books"
  on public.recaps for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.library_entries e where e.id = entry_id and e.user_id = (select auth.uid()))
  );

create policy "Readers replace their own recaps"
  on public.recaps for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.library_entries e where e.id = entry_id and e.user_id = (select auth.uid()))
  );
