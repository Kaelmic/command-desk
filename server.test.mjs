import test from 'node:test';
import http from 'node:http';
const request=(url,opts={})=>new Promise((resolve,reject)=>{http.get(url,opts,r=>{let body='';r.on('data',b=>body+=b);r.on('end',()=>resolve({status:r.statusCode,json:async()=>JSON.parse(body)}));}).on('error',reject);});
import assert from 'node:assert/strict';
import {dateRange,getAnalytics,createApp} from './server.mjs';
const env={CF_API_TOKEN:'test-secret-never-returned',CF_ACCOUNT_ID:'a'.repeat(32),CF_SITE_TAG:'b'.repeat(32)};
const now=new Date('2026-11-15T12:00:00Z');
test('UTC range crosses month boundaries',()=>assert.deepEqual(dateRange(3,new Date('2026-03-01T00:10Z')),['2026-02-27','2026-02-28','2026-03-01']));
test('queries only configured site, aggregates visits and fills empty days',async()=>{
 let calls=0;
 const mock=async(url,options)=>{calls++;const v=JSON.parse(options.body).variables;assert.equal(v.filter.siteTag,env.CF_SITE_TAG);assert.equal(options.headers.Authorization,'Bearer '+env.CF_API_TOKEN);return {ok:true,json:async()=>({data:{viewer:{accounts:[{rumPageloadEventsAdaptiveGroups:calls===2?[]:[{count:5,sum:{visits:2}}]}]}}})}};
 const r=await getAnalytics(env,7,mock,now);assert.equal(calls,7);assert.deepEqual(r.totals,{visits:12,pageViews:30});assert.equal(r.daily[1].visits,0);assert.ok(!JSON.stringify(r).includes(env.CF_API_TOKEN));
});
test('GraphQL errors on HTTP 200 are failures, not zero traffic',async()=>{
 await assert.rejects(getAnalytics(env,7,async()=>({ok:true,json:async()=>({errors:[{message:'forbidden'}]})}),now),/could not return/);
});
test('missing configuration never contacts Cloudflare',async()=>{await assert.rejects(getAnalytics({},7,()=>{throw Error('must not fetch')}),/settings/)});
test('local server hides secrets and blocks cross-origin and rebinding requests',async()=>{
 const server=createApp({});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{const url='http://127.0.0.1:'+server.address().port;for(const p of ['/.env','/server.mjs','/package.json','/../.env']){const r=await request(url+p,{headers:{Host:'127.0.0.1:3000'}});assert.equal(r.status,404)}
 assert.equal((await request(url+'/',{headers:{Host:'evil.test:3000'}})).status,403);
 assert.equal((await request(url+'/api/analytics',{headers:{Host:'127.0.0.1:3000',Origin:'https://evil.test'}})).status,403);
 const r=await request(url+'/api/analytics',{headers:{Host:'127.0.0.1:3000'}});assert.equal(r.status,503);assert.match((await r.json()).error,/settings/);
 assert.equal((await request(url+'/api/analytics?days=100',{headers:{Host:'localhost:3000'}})).status,400);
 }finally{await new Promise(r=>server.close(r));}
});
