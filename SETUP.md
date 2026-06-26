# Chutômetro — Setup Guide

Complete instructions for running Chutômetro locally and deploying to Railway + Vercel.

---

## Prerequisites

- Node.js 20+ (`node --version`)
- npm 8+
- A Railway account (free tier) — [railway.app](https://railway.app)
- A Resend account (free tier, for magic-link emails) — [resend.com](https://resend.com)
- A football-data.org API key (free tier) — [football-data.org](https://www.football-data.org/client/register)

---

## 1. Clone & Install

```bash
git clone <your-repo-url>
cd chutometro
npm install
```

---

## 2. Environment Variables

```bash
cp packages/api/.env.example packages/api/.env
```

Edit `packages/api/.env`:

| Variable | Description |
|---|---|
| `PORT` | API port (default `3001`) |
| `NODE_ENV` | `development` or `production` |
| `JWT_SECRET` | Long random string — run `openssl rand -hex 32` |
| `FRONTEND_URL` | In dev: `http://localhost:5173`. In prod: your Railway URL |
| `RESEND_API_KEY` | From [resend.com](https://resend.com) → API Keys |
| `RESEND_FROM` | Verified sender email, e.g. `bolao@yourdomain.com` |
| `FOOTBALL_API_KEY` | From [football-data.org](https://www.football-data.org/client/register) — free tier |
| `DB_PATH` | SQLite file path, default `./chutometro.db` |

> **In development** magic links are printed to the console — you don't need Resend to test locally.

---

## 3. Run Locally

```bash
npm run dev
```

This starts:
- API on `http://localhost:3001`
- Web on `http://localhost:5173`

On first run the database is created and seeded with all 104 matches (72 group stage + 32 knockout).

### First-time setup

1. Open `http://localhost:5173`
2. Click **Join / Create a bolão** 
3. Enter your email and create a new group (you become the admin)
4. The magic link is printed in the API terminal — copy and open it
5. Set your display name
6. In the Admin panel, copy the invite link and share it with players via WhatsApp

---

## 4. Deploy to Railway

Railway runs the backend (Express + SQLite) with the built React frontend bundled inside.

### 4.1 Create a Railway project

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Connect your GitHub repo

### 4.2 Set environment variables in Railway

In Railway → your service → **Variables**, add:

```
NODE_ENV=production
JWT_SECRET=<run: openssl rand -hex 32>
FRONTEND_URL=https://<your-railway-domain>.up.railway.app
RESEND_API_KEY=<your key>
RESEND_FROM=bolao@yourdomain.com
FOOTBALL_API_KEY=<your key>
DB_PATH=/app/data/chutometro.db
PORT=3000
```

### 4.3 Add a persistent volume

SQLite needs persistent storage. In Railway:

1. Your service → **Volumes** → **Add Volume**
2. Mount path: `/app/data`

### 4.4 Deploy

Railway auto-deploys on every push to `main`. First deploy runs:
```
npm install && npm run build  # builds the React frontend
npm run start                 # starts Express (serves API + static frontend)
```

Your app will be live at `https://<name>.up.railway.app`.

---

## 5. Custom Domain (optional)

In Railway → your service → **Settings** → **Domains** → add your custom domain.
Update `FRONTEND_URL` to match.

---

## 6. Admin Setup

After first deploy:

1. Open the app URL
2. Log in with your email (the magic link arrives via Resend)
3. Create a group — you are automatically the admin
4. Go to **Admin** panel (profile menu) → copy the invite link
5. Share the link with players

---

## 7. Football Data Sync

The backend polls [football-data.org](https://www.football-data.org) automatically:

- Every 4 minutes: live match scores
- Every 10 minutes: finished match scores → triggers point calculation
- Every hour: scheduled match updates (team names for knockout bracket)

You can also trigger a manual sync from the **Admin** panel → **Results** tab → **Sync now**.

If the API result is wrong, use **Admin** → **Results** → select the match → enter the correct score manually. Manual overrides are preserved and won't be overwritten by the API.

---

## 8. Local Development Tips

```bash
# Run only the API
npm run dev --workspace=packages/api

# Run only the web
npm run dev --workspace=packages/web

# Build for production (Railway does this automatically)
npm run build

# Check the database directly
sqlite3 packages/api/chutometro.db ".tables"
sqlite3 packages/api/chutometro.db "SELECT * FROM matches WHERE stage = 'ROUND_OF_32';"
```

---

## Troubleshooting

**Magic links don't arrive** — In development, check the API terminal output. The link is printed there. In production, verify `RESEND_API_KEY` is set and the sender domain is verified in Resend.

**Scores aren't updating** — Check that `FOOTBALL_API_KEY` is set. Tail Railway logs: Railway → your service → **Logs**. You should see `[football-api] Polling started.` on startup.

**Database resets on redeploy** — Make sure the Railway volume is mounted at `/app/data` and `DB_PATH=/app/data/chutometro.db`.

**Wrong team names in knockout bracket** — Team names are placeholders until the API provides them. They update automatically each hour, or trigger a manual sync.
