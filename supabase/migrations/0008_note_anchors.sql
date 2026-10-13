-- Optional anchors that pin a note to an exact spot (VISION §5.7): a page number, an
-- audiobook time, or a quote snippet ("the paragraph starting with…"). We don't have the
-- book's text, so a quote snippet is the closest thing to attaching a note to a paragraph.
-- @tags aren't stored: they're read from the note text when it's shown.
alter table public.notes
  add column page integer check (page between 1 and 20000),
  add column audio_minutes integer check (audio_minutes between 0 and 60000),
  add column quote text check (char_length(quote) <= 300);
