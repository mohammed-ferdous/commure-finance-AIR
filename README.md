# Commure Finance Reporter

AI-powered Income Statement reporting tool — Commure Finance Hackathon 2026.

## How it works
1. Drop in a NetSuite Income Statement Detail CSV export
2. The app parses all account totals (revenue streams, COGS, OpEx)
3. Claude generates board-ready management commentary
4. Interactive dashboard renders — download as a branded HTML/PDF report

## Notes
- The app calls the Anthropic API directly from the browser.
  For production, proxy the API call through a backend to protect your key.
- No data leaves your browser except the financial summary sent to Claude for commentary generation.
