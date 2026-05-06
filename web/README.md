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
2. Fill required values (for example target coordinates and auth secrets)

`.env` is ignored by git. Only `.env.example` is committed.

### Deployment

The login API signs the `gvk_session` cookie with `AUTH_SECRET`.
Set the same `AUTH_SECRET` value in every runtime that can serve `/api/*`
requests (for example both Vercel and Railway if both deployments are active).
The code also accepts the legacy `NEXTAUTH_SECRET` variable, but `AUTH_SECRET`
is preferred for new deployments.

Generate a value with:

```bash
openssl rand -base64 32
```

If `/api/auth/login` returns `{"error":"Palvelin puuttuu AUTH_SECRET..."}`,
the API runtime that handled the request is missing both `AUTH_SECRET` and
`NEXTAUTH_SECRET`. After setting the secret, also ensure that runtime has
`DATABASE_URL` and the member/admin seed variables it needs.

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
