# Commure Finance Reporter

AI-powered Income Statement reporting tool — Commure Finance Hackathon 2026.

## Deploy to Vercel (2 minutes)

### Option A — Vercel CLI (fastest)
```bash
npm install -g vercel
vercel          # follow prompts, done
```
Vercel gives you a live URL instantly.

### Option B — GitHub + Vercel dashboard
1. Push this folder to a new GitHub repo
2. Go to vercel.com → "Add New Project" → import your repo
3. Framework: **Vite** (auto-detected)
4. Click Deploy → get your URL

## Local dev
```bash
npm install
npm run dev     # → http://localhost:5173
```

## How it works
1. Drop in a NetSuite Income Statement Detail CSV export
2. The app parses all account totals (revenue streams, COGS, OpEx)
3. Claude generates board-ready management commentary
4. Interactive dashboard renders — download as a branded HTML/PDF report

## Notes
- The app calls the Anthropic API directly from the browser.
  For production, proxy the API call through a backend to protect your key.
- No data leaves your browser except the financial summary sent to Claude for commentary generation.
