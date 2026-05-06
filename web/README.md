# GVK Web

Next.js app for GVK annual meeting guessing game.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

1. Copy `.env.example` to `.env`
2. Fill required values (for example target coordinates and Supabase auth)

`.env` is ignored by git. Only `.env.example` is committed.

### Deployment

The login API uses the Supabase `public.members` table as the member source of
truth. Supabase Auth is used only to issue sessions, and the app stores
Supabase access/refresh tokens in HTTP-only cookies.

Set these variables in every runtime that can serve `/api/*` requests (for
example Railway, and Vercel too if Vercel API routes remain active):

- `SUPABASE_URL`: Supabase Project URL.
- `SUPABASE_ANON_KEY`: Supabase anon public key. Kept server-side here, but it
  is safe to expose if a browser client is added later.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service-role key. Keep this secret; it
  is used only server-side to read/write `public.members` and sync hidden auth
  users for sessions.
- `SUPABASE_MEMBER_PASSWORD_SECRET`: app-owned random secret used to derive a
  stable Supabase password per member.
- `SUPABASE_AUTH_EMAIL_DOMAIN` (optional): domain for synthetic member emails;
  defaults to `auth.gvk-guessr.local`.

Generate `SUPABASE_MEMBER_PASSWORD_SECRET` with:

```bash
openssl rand -base64 32
```

If `/api/auth/login` returns `{"error":"Palvelin puuttuu SUPABASE_..."}`, the
API runtime that handled the request is missing one of the Supabase auth
variables above. After setting those, also ensure that runtime has `DATABASE_URL`
for guesses and the target coordinate variables it needs.

#### Supabase members table

Apply the SQL migration in `supabase/migrations/20260506071900_create_members_table.sql`
to the Supabase project. It creates `public.members` with these columns:

- `id`: UUID primary key
- `key`: normalized login name, unique
- `name`: display name
- `is_admin`: admin flag
- `created_at` / `updated_at`

#### First admin user

There is no `MEMBERS`/`ADMIN_NAMES` environment seeding anymore. Create the
first admin row in Supabase Dashboard under Table Editor > `members`, or run:

```sql
insert into public.members (key, name, is_admin)
values ('teppo', 'Teppo', true);
```

Use the same normalized key that the app uses for login names: lowercase,
trimmed, and repeated spaces collapsed. After the first admin can log in, use
the app's admin page to manage the rest of the members in the Supabase table.

## GitHub upload (first push)

Run in `web/` after installing Git:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

## Notes

- Large/generated files are already ignored by `.gitignore` (`node_modules`, `.next`, local SQLite DB, `.env`).
- If GitHub rejects push for large files, run `git status` and check that ignored files are not staged.
