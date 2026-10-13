-- When the reader finished the book: set when they mark the last chapter as their
-- spot, cleared if they move their spot back. Powers "books read this year" on the
-- library page.
alter table public.library_entries
  add column finished_at timestamptz;
