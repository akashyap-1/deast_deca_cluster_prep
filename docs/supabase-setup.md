# Supabase setup

You do this once, in the Supabase dashboard for project `uzkzrnuruzizwtsqsvnp`.

## 1. Create the tables and security rules

1. Open **SQL Editor** → **New query**.
2. Paste the whole of [`supabase/schema.sql`](../supabase/schema.sql) and click **Run**. It should finish with "Success. No rows returned".

This creates the progress tables, turns on Row Level Security (each student can only read and write their own rows),
and adds a trigger that rejects any sign-up whose email isn't `@student.dasd.org` or `@dasd.org`.

## 2. Auth settings

**Authentication → Sign In / Providers → Email**
- Email provider: **on**
- Confirm email: **on**. Without it, someone could sign up with a made-up district address they don't own.
- Minimum password length: 8

**Authentication → URL Configuration**
- Site URL: `https://akashyap-1.github.io/deast_deca_cluster_prep/`
- Redirect URLs: add both
  - `https://akashyap-1.github.io/deast_deca_cluster_prep/**`
  - `http://localhost:5173/**`

Confirmation and password-reset links only work for URLs on that list.

## 3. Email sending (required before students sign up)

Supabase's built-in email sender is for testing only. It sends only to members of your Supabase team and only
a few emails per hour, so students would never get their confirmation email.

Set up your own sender under **Authentication → Emails → SMTP Settings**. Any SMTP provider works, for example
Resend, Brevo, or a Gmail account with an app password. Then raise the email rate limit under
**Authentication → Rate Limits**.

Before the chapter starts using the app, sign up with one real `@student.dasd.org` address and confirm the email
arrives. District filters sometimes quarantine mail from new senders; if it doesn't show up, ask the district IT
team to allow your sender address.

Optional: under **Authentication → Emails → Templates**, edit "Confirm signup" so it mentions East DECA Prep.

## 4. GitHub Pages

In the GitHub repo: **Settings → Pages → Source: GitHub Actions**. Each push to `main` then builds and
deploys the site to `https://akashyap-1.github.io/deast_deca_cluster_prep/`.

## Optional: allow a non-district address (e.g. an admin's Gmail)

1. SQL Editor → New query → paste [`supabase/allowlist.sql`](../supabase/allowlist.sql) → **Run**.
2. In a new query, add the address (lowercase) and run it:
   `insert into public.allowed_emails (email, note) values ('you@gmail.com', 'admin') on conflict do nothing;`
3. Sign up in the app with that address as normal.

The list lives only in the database. The site code never contains it, and signed-in students can't read it.

## Optional: block specific addresses

1. SQL Editor → New query → paste [`supabase/blacklist.sql`](../supabase/blacklist.sql) → **Run**.
2. To block more later, add rows and ban any existing account:
   `insert into public.email_blacklist (email) values ('someone@student.dasd.org') on conflict do nothing;`
   `update auth.users set banned_until = 'infinity' where lower(email) = 'someone@student.dasd.org';`

Blocked addresses can't sign up, can't sign in (if banned), and can't read or write any data.

## Admin stats page

1. Run `supabase/blacklist.sql` first if you haven't (admin.sql relies on the allowlist check it sets up).
2. SQL Editor → New query → paste [`supabase/admin.sql`](../supabase/admin.sql) → **Run**. It makes
   `advikkashyap1@gmail.com` an admin and adds it to the allowlist.
3. Sign up / sign in in the app with that address. An **Admin** tab appears (`#/admin`) with every account's
   accuracy, answers, study time, active days, mock scores and more; click a user for their full history.

To add another admin: `insert into public.admin_emails (email) values ('someone@example.com') on conflict do nothing;`
(a non-district address also needs a row in `allowed_emails`). The stats functions refuse anyone not on this list.
