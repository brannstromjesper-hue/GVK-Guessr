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
