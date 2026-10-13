-- "Try the demo" creates an anonymous Supabase account per visitor. This deletes demo
-- accounts older than `p_days`; their libraries, notes and recaps go with them through
-- the `on delete cascade` foreign keys. Real (email) accounts are never touched.
-- Called once a day by /api/cron/daily.

create function public.delete_stale_demo_users(p_days integer default 7)
returns integer
language plpgsql
-- Runs as its owner so it can delete from auth.users, which the API roles can't touch.
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from auth.users
  where is_anonymous
    and created_at < now() - make_interval(days => p_days);
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- Only the server (service role) may call it. Without this, anyone could call it
-- through Supabase's API.
revoke execute on function public.delete_stale_demo_users(integer) from public, anon, authenticated;
grant execute on function public.delete_stale_demo_users(integer) to service_role;
