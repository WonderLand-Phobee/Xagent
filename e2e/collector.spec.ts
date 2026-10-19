import {test,expect} from '@playwright/test';
// @ts-expect-error Plain JS module is also invoked by the Python collector.
import {collect} from '../scripts/collect-live.mjs';
test('normal browser observes only the detail page response; no API replay',async({context})=>{
 let detailRequests=0;
 await context.route('https://www.offertoday.com/**',async route=>{
  const u=new URL(route.request().url());
  if(u.pathname==='/robots.txt')return route.fulfill({contentType:'text/plain',body:'User-agent: *\nAllow: /'});
  if(u.pathname==='/wapi/geek/recommend/jobDetail'){
   detailRequests++;return route.fulfill({json:{data:{jobId:'fixture',jobStatus:2,jobSource:0,jobName:'TEST Software Engineer',jobDesc:'Build accessible software for our customers with a modern engineering team.',salaryDesc:'Not specified',workExperienceDesc:'Not specified'}}});
  }
  if(u.pathname==='/en/recommend')return route.fulfill({contentType:'text/html',body:'<a href="/en/job/fixture">TEST ONLY</a>'});
  if(u.pathname==='/en/job/fixture')return route.fulfill({contentType:'text/html',body:'<div id="jobDetailActionButton"><div tabindex="0">Send application message</div></div><script>fetch("/wapi/geek/recommend/jobDetail?id=fixture")</script>'});
  return route.fulfill({status:404});
 });
 const result=await collect(context,{searchTerms:[],delay:50});
 expect(result.jobs).toHaveLength(1);expect(result.jobs[0].jobStatus).toBe('Active');expect(result.jobs[0].sourceJobId).toBe('fixture');expect(detailRequests).toBe(1);
});
test('browser stops at access challenge without scraping jobs',async({context})=>{
 await context.route('https://www.offertoday.com/**',r=>r.fulfill(r.request().url().endsWith('/robots.txt')?{contentType:'text/plain',body:'User-agent: *\nAllow: /'}:{contentType:'text/html',body:'Verify you are human'}));
 const result=await collect(context,{searchTerms:[],delay:1});
 expect(result.jobs).toHaveLength(0);expect(result.errors.join(' ')).toContain('challenge');
});
test('current robots disallow stops page collection before navigation',async({context})=>{
 let navigated=false;
 await context.route('https://www.offertoday.com/**',r=>{
  if(r.request().url().endsWith('/robots.txt'))return r.fulfill({contentType:'text/plain',body:'User-agent: *\nDisallow: /en/*'});
  navigated=true;return r.fulfill({contentType:'text/html',body:'should not be requested'});
 });
 const result=await collect(context,{searchTerms:[],delay:1});
 expect(result.jobs).toHaveLength(0);expect(navigated).toBe(false);expect(result.errors.join(' ')).toContain('Disallowed');
});
test('login-gated full JD is not exported as a verified public job',async({context})=>{
 await context.route('https://www.offertoday.com/**',r=>{
  const path=new URL(r.request().url()).pathname;
  if(path==='/robots.txt')return r.fulfill({contentType:'text/plain',body:'User-agent: *\nAllow: /'});
  if(path==='/en/recommend')return r.fulfill({contentType:'text/html',body:'<a href="/en/job/gated">TEST ONLY</a>'});
  if(path.includes('/wapi/'))return r.fulfill({json:{data:{jobId:'gated',jobStatus:2,jobSource:0,jobName:'TEST',jobDesc:'A full hidden description must never be exported.'}}});
  return r.fulfill({contentType:'text/html',body:'Sign in to view the full job description.<div id="jobDetailActionButton">Send application message</div><script>fetch("/wapi/geek/recommend/jobDetail?id=gated")</script>'});
 });
 const r=await collect(context,{searchTerms:[],delay:50});
 expect(r.jobs[0].jobStatus).toBe('Unverified');expect(JSON.stringify(r.jobs)).not.toContain('hidden description');expect(r.errors.join(' ')).toContain('sign-in');
});
test('late responses for a different job cannot be attached to the requested URL',async({context})=>{
 await context.route('https://www.offertoday.com/**',r=>{
  const u=new URL(r.request().url());
  if(u.pathname==='/robots.txt')return r.fulfill({contentType:'text/plain',body:'User-agent: *\nAllow: /'});
  if(u.pathname==='/en/recommend')return r.fulfill({contentType:'text/html',body:'<a href="/en/job/correct">TEST ONLY</a>'});
  if(u.pathname.includes('/wapi/')){const id=u.searchParams.get('id');return r.fulfill({json:{data:{jobId:id,jobStatus:2,jobSource:0,jobName:id==='correct'?'Correct requested job':'Wrong prefetched job',jobDesc:'Build and test software with our product team.'}}})}
  return r.fulfill({contentType:'text/html',body:'<div id="jobDetailActionButton">Send application message</div><script>fetch("/wapi/geek/recommend/jobDetail?id=wrong");setTimeout(()=>fetch("/wapi/geek/recommend/jobDetail?id=correct"),250)</script>'});
 });
 const r=await collect(context,{searchTerms:[],delay:30});
 expect(r.jobs).toHaveLength(1);expect(r.jobs[0].sourceJobId).toBe('correct');expect(r.jobs[0].jobTitle).toBe('Correct requested job');
});
test('a same-day verified URL is checked before other seed URLs',async({context})=>{
 await context.route('https://www.offertoday.com/**',r=>{
  const u=new URL(r.request().url());
  if(u.pathname==='/robots.txt')return r.fulfill({contentType:'text/plain',body:'User-agent: *\nAllow: /'});
  if(u.pathname==='/en/recommend')return r.fulfill({contentType:'text/html',body:'<a href="/en/job/new">TEST ONLY</a>'});
  if(u.pathname.includes('/wapi/')){const id=u.searchParams.get('id');return r.fulfill({json:{data:{jobId:id,jobStatus:2,jobSource:0,jobName:'TEST '+id,jobDesc:'Build software with our engineering team.'}}})}
  const id=u.pathname.split('/').pop();return r.fulfill({contentType:'text/html',body:`<div id="jobDetailActionButton">Send application message</div><script>fetch('/wapi/geek/recommend/jobDetail?id=${id}')</script>`});
 });
 const pinned='https://www.offertoday.com/en/job/existing';
 const r=await collect(context,{seeds:['https://www.offertoday.com/en/job/manual',pinned],pinned:[pinned],limit:1,searchTerms:[],delay:30});
 expect(r.jobs).toHaveLength(1);expect(r.jobs[0].sourceJobId).toBe('existing');
});
