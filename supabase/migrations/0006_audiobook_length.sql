-- Total audiobook length, so "find my place by audiobook time" (VISION §5.5) only has
-- to be asked once. Minutes; the longest audiobooks run a few hundred hours.
alter table public.library_entries
  add column audiobook_minutes integer check (audiobook_minutes between 1 and 60000);
