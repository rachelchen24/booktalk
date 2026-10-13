# Local setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (the free tier is fine).
2. **Run the migrations.** In the Supabase dashboard → SQL Editor, paste and run each file in
   `supabase/migrations/` in order.
3. **Allow the email-link redirect.** Authentication → URL Configuration:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: add `http://localhost:3000/auth/confirm`
4. **Environment variables.** Copy `.env.example` to `.env.local` and fill it in. Keys are under
   Project Settings → API. Generate `PIN_PEPPER` with:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
5. **Optional: AI (chapter suggestions, written recaps, memory search).** Add `ANTHROPIC_API_KEY` to `.env.local` (a key from
   console.anthropic.com; usage is billed per token). Without it the app works fully and
   readers set up chapters with "Add ___ chapters" and recaps show their own notes. `ANTHROPIC_MODEL` picks the model
   (default `claude-opus-5-5`; `claude-haiku-5-5` is much cheaper).
6. `npm install`, then `npm run dev`, then open http://localhost:3000.

Migrations so far: `0001_login_attempts`, `0002_library`, `0003_notes`, `0004_chapters`,
`0005_finished_at`, `0006_audiobook_length`, `0007_recaps`, `0008_note_anchors`,
`0009_demo_cleanup`. Run them in
order (0007 is only
needed once an API key is set).

`npm test` runs the unit tests. They don't need Supabase.

## Optional: email links that work on any device

> On the Free plan, Supabase only allows editing templates once custom SMTP is set up (below).

The default Supabase email templates use a PKCE `?code=` link, which only works in the browser
where you signed up or asked for the reset. To make links work on any device, edit
Authentication → Email Templates and point the link at:

- Confirm signup: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/`
- Magic link (used as the "unlock" link): `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/`
- Reset password: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-pin`

`/auth/confirm` handles both link styles.

## Email sending limits

Supabase's built-in email sender is rate-limited to a handful of emails per hour and is meant
for testing. Before the live demo, set up custom SMTP (Authentication → SMTP Settings, e.g.
Resend), or signup, unlock, and reset emails will start failing under real use.

## Deploying (Vercel)

1. **Supabase → SQL Editor:** run every migration you haven't yet (through `0009_demo_cleanup`).
2. **Supabase → Authentication → Sign In / Providers:**
   - turn on **Allow anonymous sign-ins** (needed for "Try the demo")
   - under **Email**, turn off **Confirm email**, so signups don't depend on the free
     2-emails-an-hour sender
3. **Anthropic (optional, for AI):** at console.anthropic.com, add a little credit, set a
   **monthly spend limit**, and create an API key.
4. **GitHub:** create an empty repo and push this project to it.
5. **Vercel:** sign in with GitHub → **Add New → Project** → import the repo. Before
   deploying, add these environment variables:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | same as `.env.local` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same as `.env.local` |
   | `SUPABASE_SERVICE_ROLE_KEY` | same as `.env.local` |
   | `PIN_PEPPER` | **exactly** the same as `.env.local`, or existing accounts can't log in |
   | `CRON_SECRET` | a new random string (`node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`) |
   | `ANTHROPIC_API_KEY` | optional |
   | `ANTHROPIC_MODEL` | optional, e.g. `claude-haiku-5-5` (cheapest) |

   Then **Deploy**.
6. **After the first deploy**, with your `https://<app>.vercel.app` URL:
   - Vercel → Settings → Environment Variables: add `NEXT_PUBLIC_SITE_URL` = that URL,
     then **Redeploy** (email links use it)
   - Supabase → Authentication → URL Configuration: set **Site URL** to it, and add
     `https://<app>.vercel.app/**` to **Redirect URLs** (keep the localhost one for development)
7. Put the URL in the README's "Live demo" link.

The daily cron job (`vercel.json` → `/api/cron/daily`) keeps the free Supabase project from
pausing and deletes demo accounts older than a week. Check it under Vercel → Settings → Cron Jobs.
