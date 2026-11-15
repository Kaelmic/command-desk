import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
export function dateRange(days, now = new Date()) {
  const end = now.toISOString().slice(0, 10);
  const start = new Date(end + 'T00:00:00Z');
  start.setUTCDate(start.getUTCDate() - days + 1);
  return Array.from({length: days}, (_, i) => {
    const d = new Date(start); d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}
export async function getAnalytics(env, days, transport = fetch, now = new Date()) {
  const { CF_API_TOKEN: token, CF_ACCOUNT_ID: account, CF_SITE_TAG: site } = env;
  if (!token || !/^[a-f0-9]{32}$/i.test(account || '') || !/^[a-f0-9]{32}$/i.test(site || '')) {
    const e = new Error('Finish the Cloudflare settings in .env, then restart the server. See ANALYTICS-SETUP.md.');
    e.status = 503; throw e;
  }
  const dates = dateRange(days, now);
  // One day per query avoids dataset time-window limits on longer ranges.
  const daily = [];
  for (const date of dates) {
    const next = new Date(date + 'T00:00:00Z'); next.setUTCDate(next.getUTCDate() + 1);
    const query = `query Daily($account: string!, $filter: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject!) {
      viewer { accounts(filter: {accountTag: $account}) {
        rumPageloadEventsAdaptiveGroups(limit: 1, filter: $filter) { count sum { visits } }
      } }
    }`;
    const response = await transport('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST', headers: {Authorization: `Bearer ${token}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({query, variables: {account, filter: {siteTag: site,
        datetime_geq: date + 'T00:00:00Z', datetime_lt: next.toISOString()}}}),
      signal: AbortSignal.timeout(15000)
    });
    let payload;
    try { payload = await response.json(); } catch { throw new Error('Cloudflare returned an unreadable response. Try again later.'); }
    // GraphQL failures may use HTTP 200. Never present them as zero visits.
    if (!response.ok || payload.errors?.length) {
      throw new Error('Cloudflare could not return analytics. Check the token’s Account Analytics Read permission, account/site IDs, and API access limits.');
    }
    const accounts = payload.data?.viewer?.accounts;
    if (!Array.isArray(accounts) || accounts.length !== 1 || !Array.isArray(accounts[0].rumPageloadEventsAdaptiveGroups)) {
      throw new Error('Cloudflare returned no accessible account. Check CF_ACCOUNT_ID and token permissions.');
    }
    const groups = accounts[0].rumPageloadEventsAdaptiveGroups;
    const row = groups[0];
    if (row && (!Number.isFinite(row.count) || !Number.isFinite(row.sum?.visits))) throw new Error('Cloudflare returned unexpected metrics.');
    daily.push({date, pageViews: row?.count ?? 0, visits: row?.sum.visits ?? 0});
  }
  return {site: 'PrimeRidge Studios', timezone: 'UTC', updatedAt: now.toISOString(), days,
    totals: daily.reduce((a, d) => ({visits: a.visits + d.visits, pageViews: a.pageViews + d.pageViews}), {visits: 0, pageViews: 0}), daily};
}
export function createApp(env = process.env, transport = fetch) {
  let cache = new Map(); let pending = new Map();
  const files = {'/': ['index.html','text/html'], '/index.html': ['index.html','text/html'], '/app.js': ['app.js','text/javascript'], '/analytics.js': ['analytics.js','text/javascript'], '/styles.css': ['styles.css','text/css']};
  return http.createServer(async (req,res) => {
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Cache-Control','no-store');
    // Bind to loopback AND reject DNS rebinding/cross-origin reads.
    const hosts = new Set(['127.0.0.1:3000','localhost:3000']);
    if (!hosts.has(req.headers.host) || (req.headers.origin && !['http://localhost:3000','http://127.0.0.1:3000'].includes(req.headers.origin)) || req.headers['sec-fetch-site'] === 'cross-site') {
      res.writeHead(403); return res.end('Forbidden');
    }
    if (req.method !== 'GET') {res.writeHead(405, {Allow:'GET'});return res.end();}
    const url = new URL(req.url, 'http://127.0.0.1:3000');
    if (url.pathname === '/api/analytics') {
      res.setHeader('Content-Type','application/json');
      const days = Number(url.searchParams.get('days') || 7);
      if (![7,30].includes(days)) {res.writeHead(400);return res.end(JSON.stringify({error:'Choose 7 or 30 days.'}));}
      try {
        let item = cache.get(days);
        if (!item || Date.now() - item.time > 300000) {
          if (!pending.has(days)) pending.set(days, getAnalytics(env,days,transport).then(value=>{cache.set(days,{time:Date.now(),value});return value;}).finally(()=>pending.delete(days)));
          item = {value: await pending.get(days)};
        }
        return res.end(JSON.stringify(item.value));
      } catch (error) {
        res.writeHead(error.status || 502);
        return res.end(JSON.stringify({error: error.name === 'TimeoutError' ? 'Cloudflare timed out. Try again.' : error.message}));
      }
    }
    const file = files[url.pathname];
    if (!file) {res.writeHead(404);return res.end('Not found');}
    try {const content = await readFile(path.join(root,file[0]));res.setHeader('Content-Type',file[1]+'; charset=utf-8');res.end(content);}
    catch {res.writeHead(404);res.end('Not found');}
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createApp();
  server.on('error', e => {console.error(e.code === 'EADDRINUSE' ? 'Port 3000 is in use. Close the other local server and retry.' : 'Unable to start local server.');process.exitCode=1;});
  server.listen(3000,'127.0.0.1',()=>console.log('Command Desk: http://127.0.0.1:3000 — press Ctrl+C to stop.'));
}
