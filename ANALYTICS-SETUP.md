# PrimeRidge Cloudflare analytics — local setup

Requires Node 24. No npm dependencies or npm install needed.

## 1. Create a read-only Cloudflare token

In Cloudflare, open API Tokens and create a custom token named Command Desk Analytics.
Grant Account > Account Analytics > Read. Restrict Account Resources to your own account.
Do not grant edit permissions or use your Global API Key.

Reference: https://developers.cloudflare.com/analytics/graphql-api/getting-started/authentication/api-token-auth/

## 2. Find the two IDs

- CF_ACCOUNT_ID: your account ID, available on the domain Overview page in Cloudflare.
- CF_SITE_TAG: open Web Analytics and click PrimeRidge's analytics report. Copy the siteTag from the report URL (32 hexadecimal characters). This is the Web Analytics site identifier, not the zone ID and not automatically the public beacon token. If your report URL does not expose it, open DevTools > Network on that Cloudflare report, filter graphql, and inspect the analytics request's variables for siteTag. Do not share authentication headers.

## 3. Configure locally

In VS Code's terminal, from the command-desk folder, run (PowerShell):

```powershell
Copy-Item .env.example .env
```

Edit .env in VS Code and replace the three example values. Keep the token on your computer. Never paste it into app.js, analytics.js, GitHub, or a chat. The supplied .gitignore excludes .env. If .env was already tracked in another repository, ignoring it does not untrack it.

## 4. Run

```powershell
npm start
```

Open http://127.0.0.1:3000 and select Analytics in the sidebar. Use this local server in place of Live Server when you want analytics. Ctrl+C stops it. Restart after editing .env.

The server listens only on your computer, not your home network. It serves an allowlist of dashboard assets and never serves .env or backend source. Requests from other browser origins are rejected. Do not put this server on a public host without adding authentication.

## 5. Bring over your saved workspace

Your previous Live Server address and port have separate browser storage. Export backup from your old dashboard, then import it at http://127.0.0.1:3000. The integration does not change the workspace save format.

## Metrics and limits

- 7- and 30-day views include today, grouped by UTC calendar date, not Malta local midnight. Today is partial.
- Visits are Cloudflare's visit metric, not unique people. Page views and visits can be sampled estimates.
- Results cover the configured Web Analytics site; if it collects subdomains, those may also be included. Match that site and UTC dates when comparing with Cloudflare.
- Results are cached in memory for five minutes. Refresh reuses that cache; restarting clears it. Fetching 30 days can take longer because each day is queried separately.
- Missing settings, token errors, denied datasets, invalid schema, API limits, and timeouts display an error rather than zero traffic. An empty successful response shows zero. A valid but incorrect site tag can also return no traffic, so check it against Cloudflare's own report.
- Historical collection gaps cannot be recovered by this integration.

## Validation

Run npm test for local backend checks. Live Cloudflare requests must still be tested with your own token and IDs. These credentials are deliberately not included. If you see an error after setup, share only the message shown in the Analytics page, not your .env.
