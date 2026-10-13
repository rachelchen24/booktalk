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
5. `npm install`, then `npm run dev`, then open http://localhost:3000.

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
