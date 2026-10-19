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
