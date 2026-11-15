/* Independent module: existing workspace data and backup format stay unchanged. */
(() => {
  const nav = document.querySelector('nav[aria-label="Main"]');
  const button = document.createElement('button');
  button.type = 'button';button.dataset.view = 'analytics';button.innerHTML='<span>▥</span>Analytics';nav.append(button);
  HEADINGS.analytics='PrimeRidge website analytics';
  const baseRender=render;
  let days=7, result=null, loading=false, message='', requestId=0;
  const number=n=>Math.round(n).toLocaleString();
  function content() {
    return `<div class="toolbar"><button class="btn filter ${days===7?'active':''}" data-days="7">7 days</button><button class="btn filter ${days===30?'active':''}" data-days="30">30 days</button><button class="btn" id="analytics-refresh" ${loading?'disabled':''}>${loading?'Loading…':'Refresh'}</button></div><p class="muted">Cloudflare Web Analytics · Daily figures use UTC. Today is incomplete. Cached for up to 5 minutes.</p><div id="analytics-status" role="status">${message?esc(message):loading?'Fetching analytics…':''}</div>${result ? `<div class="stats"><div class="stat"><label>VISITS · ${days} DAYS</label><b>${number(result.totals.visits)}</b><small>Visits, not unique people</small></div><div class="stat"><label>PAGE VIEWS · ${days} DAYS</label><b>${number(result.totals.pageViews)}</b><small>Cloudflare RUM estimates</small></div></div><div class="panel pad"><h2>Daily visits</h2><div class="analytics-bars" role="img" aria-label="Daily visits chart. Exact values in the table below.">${result.daily.map(d=>`<div class="analytics-column"><div class="analytics-bar" style="height:${Math.max(0,d.visits/Math.max(1,...result.daily.map(x=>x.visits))*130)}px" title="${esc(d.date)}: ${number(d.visits)} visits"></div><small>${esc(d.date.slice(8))}</small></div>`).join('')}</div><div class="analytics-table"><table><caption>Daily traffic · Last fetched ${esc(new Date(result.updatedAt).toLocaleString())}</caption><thead><tr><th scope="col">Date (UTC)</th><th scope="col">Visits</th><th scope="col">Page views</th></tr></thead><tbody>${result.daily.map(d=>`<tr><th scope="row">${esc(d.date)}</th><td>${number(d.visits)}</td><td>${number(d.pageViews)}</td></tr>`).join('')}</tbody></table></div>${result.totals.pageViews===0?'<p>No page views were returned for this period. Verify the site tag if Cloudflare’s own dashboard shows traffic.</p>':''}</div>`:''}`;
  }
  render=function(){
    baseRender();
    if(view!=='analytics')return;
    document.querySelector('#search').classList.add('hidden');
    document.querySelector('#add').classList.add('hidden');
    document.querySelector('#subtitle').textContent='Traffic for the configured PrimeRidge Web Analytics site.';
    document.querySelector('#content').innerHTML=content();
  };
  async function load(){
    const id=++requestId;loading=true;message='';render();
    try {
      if(!['localhost','127.0.0.1'].includes(location.hostname)||location.port!=='3000') throw Error('Start Command Desk with npm start, then open http://127.0.0.1:3000. Live Server does not provide the analytics API.');
      const r=await fetch(`/api/analytics?days=${days}`,{cache:'no-store'});
      const d=await r.json();if(!r.ok)throw Error(d.error||'Unable to fetch analytics.');
      if(id!==requestId)return;
      result=d;
    }catch(e){if(id!==requestId)return;result=null;message=e.message;}
    finally{if(id===requestId){loading=false;if(view==='analytics')render();}}
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.view==='analytics')load();
    if(b.dataset.days){days=Number(b.dataset.days);result=null;load();}
    if(b.id==='analytics-refresh')load();
  });
})();
