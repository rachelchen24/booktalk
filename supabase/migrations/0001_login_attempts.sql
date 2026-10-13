-- Failed-login tracking for PIN lockout (see src/lib/auth/lockout.ts).
--
-- Keyed by email rather than user id so we also count guesses against emails that
-- have no account. That way an attacker can't tell real accounts from fake ones by
-- watching which ones get locked.

create table public.login_attempts (
  email        text primary key,
  failed_count integer     not null default 0,
  locked_until timestamptz,
  updated_at   timestamptz not null default now()
);

-- RLS on with no policies = no access for the anon or logged-in roles.
-- Only the server, using the service-role key, can read or write this table.
alter table public.login_attempts enable row level security;

-- Records one failed attempt and returns the lock expiry (null if not locked).
--
-- Done in the database rather than read-then-write in the app, because two
-- parallel wrong guesses could both read "4 failures", both write "5", and the
-- attacker gets a free extra try. `for update` locks the row so attempts are
-- counted one at a time.
create function public.record_failed_login(
  p_email        text,
  p_max_attempts integer,
  p_lock_minutes integer
) returns timestamptz
language plpgsql
set search_path = ''
as $$
declare
  v_count  integer;
  v_locked timestamptz;
begin
  insert into public.login_attempts (email) values (p_email)
  on conflict (email) do nothing;

  select failed_count, locked_until into v_count, v_locked
  from public.login_attempts
  where email = p_email
  for update;

  -- An expired lock starts a fresh count.
  if v_locked is not null and v_locked <= now() then
    v_count  := 0;
    v_locked := null;
  end if;

  v_count := v_count + 1;
  if v_count >= p_max_attempts then
    v_locked := now() + make_interval(mins => p_lock_minutes);
  end if;

  update public.login_attempts
  set failed_count = v_count, locked_until = v_locked, updated_at = now()
  where email = p_email;

  return v_locked;
end;
$$;

-- Postgres lets everyone execute new functions by default, and Supabase exposes
-- public functions over its API. Without this, anyone could call it to lock out
-- other readers.
revoke execute on function public.record_failed_login(text, integer, integer)
  from public, anon, authenticated;
