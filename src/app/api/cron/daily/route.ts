import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Daily housekeeping, run by Vercel Cron (see vercel.json):
 * 1. Keeps the free Supabase project awake. Free projects pause after a week without
 *    activity, which would leave the live demo link broken for the next visitor.
 * 2. Deletes "Try the demo" accounts older than a week.
 *
 * Vercel sends `Authorization: Bearer <CRON_SECRET>` with each cron request. Anything
 * without it is turned away, so nobody else can trigger this.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const ping = await admin.from("books").select("id").limit(1);
  const cleanup = await admin.rpc("delete_stale_demo_users", { p_days: 7 });

  if (ping.error || cleanup.error) {
    console.error("Daily cron failed", ping.error ?? cleanup.error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true, demoAccountsDeleted: cleanup.data });
}
