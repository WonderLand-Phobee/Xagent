/** Normal browser navigation only. No stealth, cookie injection, captcha solving,
 * request replay, direct private APIs or certificate overrides. */
import {chromium} from '@playwright/test';
import robotsParser from 'robots-parser';
const AGENT='OfferTodayContentDesk';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const origin='https://www.offertoday.com';
export const keywords=['Software Engineer','Software Developer','UI UX Designer','Graphic Designer','Video Editor'];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function objects(value){if(!value||typeof value!=='object')return [];if(Array.isArray(value))return value.flatMap(objects);return [value,...Object.values(value).flatMap(objects)];}
export async function collect(context,{seeds=[],limit=60,searchTerms=keywords,delay=2500,inspect=false}={}){
 const page=await context.newPage();page.setDefaultTimeout(8000);const errors=[],audit=[],jobs=[];const urls=new Set();
 const deadline=Date.now()+12*60*1000;
 let robots;
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(route.request().isNavigationRequest()&&u.origin!==origin)return route.abort('blockedbyclient');
  if(robots&&u.origin===origin&&u.pathname!=='/robots.txt'&&robots.isAllowed(u.href,AGENT)!==true)return route.abort('blockedbyclient');
  return route.fallback();
 });
 const challenge=async()=>{
  const text=await page.locator('body').innerText();
  return /verify (?:that )?you are human|complete the security check|access denied|unusual traffic|安全驗證|安全验证|訪問受限|访问受限/i.test(text);
 };
 const navigate=async url=>{
  if(Date.now()>deadline)throw new Error('Collection time budget exhausted');
  const parsed=new URL(url);
  if(parsed.origin!==origin||robots?.isAllowed(url,AGENT)!==true||/\/(?:en|hk)\/scan(?:\/|$)/.test(parsed.pathname)||parsed.searchParams.has('appliedJobId'))throw new Error('Disallowed page refused');
  await pause(delay);
  const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
  audit.push({url:parsed.origin+parsed.pathname,status:response?.status()??0});
  if(!response?.ok())throw new Error('Official page returned '+response?.status());
  await page.waitForTimeout(delay);
  if(await challenge())throw new Error('Access challenge encountered; stopped without solving it');
 };
 try{
  const robotResponse=await page.goto(origin+'/robots.txt',{waitUntil:'domcontentloaded',timeout:30000});
  if(!robotResponse?.ok())throw new Error('robots.txt unavailable; collection stopped');
  robots=robotsParser(origin+'/robots.txt',await robotResponse.text());
  delay=Math.max(delay,(robots.getCrawlDelay(AGENT)||0)*1000);
  // Operator must first review terms. This browser does
  // not synthesize an API request; it observes the site's own normal responses.
  if(inspect){
   await navigate(origin+'/en/recommend');
   return {jobs:[],audit,errors,inputs:await page.locator('input').evaluateAll(xs=>xs.map(x=>({placeholder:x.placeholder,type:x.type}))),inspection:(await page.locator('body').innerText()).slice(0,18000),links:await page.locator('a[href*="/job/"]').evaluateAll(as=>as.map(a=>a.href).slice(0,20))};
  }
  for(const s of seeds){try{const u=new URL(s);if(u.origin===origin&&/^\/(?:en\/)?job\//.test(u.pathname))urls.add(u.href)}catch{}}
  await navigate(origin+'/en/recommend');
  const addLinks=async()=>{
   for(const href of await page.locator('a[href*="/job/"]').evaluateAll(as=>as.map(a=>a.href))){const u=new URL(href);if(u.origin===origin&&/^\/en\/job\/[^/]+\/?$/.test(u.pathname))urls.add(u.href)}
  };
  await addLinks();
  const initialURLs=new Set(urls);
  for(const term of searchTerms){
   if(urls.size>=limit)break;
   const input=page.locator('input:visible');
   const fields=await input.all();let search;
   for(const field of fields){const ph=(await field.getAttribute('placeholder'))??'';if(/search|job|職位|搜尋|搜索/i.test(ph)){search=field;break}}
   if(!search){errors.push('Could not identify the public search box; collected visible official links only.');break}
   try{await search.fill(term);await search.press('Enter');await pause(delay)}catch{errors.push('Public search became unavailable; using already discovered official links.');break}
   if(await challenge())throw new Error('Access challenge encountered; stopped without solving it');
   for(let scroll=0;scroll<3;scroll++){await addLinks();if(await page.locator('a[href*="/job/"]:visible').count())await page.locator('a[href*="/job/"]:visible').first().hover({timeout:2500}).catch(()=>{});await page.mouse.wheel(0,850);await pause(delay);if(urls.size>=limit)break}
  }
  if(!urls.size)errors.push('No official job links in rendered page. Login/challenge/markup may require a permitted source update.');
  for(const url of [...urls].sort((a,b)=>Number(initialURLs.has(a))-Number(initialURLs.has(b))).slice(0,limit)){
   const records=[];
   const expectedId=decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).at(-1));
   let signalReady;const ready=new Promise(resolve=>{signalReady=resolve});
   const listener=response=>{
    const u=new URL(response.url());
    if(u.origin===origin&&u.pathname==='/wapi/geek/recommend/jobDetail'&&robots.isAllowed(response.url(),AGENT)===true){
     const requestId=u.searchParams.get('id')??u.searchParams.get('jobId');
     if(requestId&&decodeURIComponent(requestId)!==expectedId)return;
     void response.json().then(payload=>{
      const own=objects(payload).filter(v=>typeof v.jobDesc==='string'&&typeof v.jobName==='string'&&v.jobId!=null&&decodeURIComponent(String(v.jobId))===expectedId);
      records.push(...own);if(own.length)signalReady(true);
     }).catch(()=>{});
    }
   };
   page.on('response',listener);
   try{
    await navigate(url);let timer;await Promise.race([ready,new Promise(r=>{timer=setTimeout(r,12000)})]);clearTimeout(timer);
    const unique=[...new Map(records.map(r=>[String(r.jobId),r])).values()];
    const body=await page.locator('body').innerText();
    if(/sign\s*in\s+(?:to\s+)?(?:view|see|unlock|access)[^\n]{0,70}(?:full|job description|more|details)|登入.{0,20}(?:完整|更多).{0,20}(?:職位|描述|內容)/i.test(body)){
     jobs.push({jobUrl:url,jobStatus:'Unverified',jobTitle:'Unknown'});errors.push('Full JD requires sign-in; collection stopped; restricted content was not exported.');break;
    }
    const closed=/this (?:job|position) (?:has expired|is closed|is no longer available)|job expired|applications? closed|職位已(?:關閉|過期|下架)|职位已(?:关闭|过期|下架)/i.test(body);
    const action=page.locator('#jobDetailActionButton').getByText(/^(?:Apply(?: now)?|Chat(?: now)?|Start chat|Send application message|立即申請|立即溝通|立即申请|立即沟通)$/i,{exact:true}).first();
    await action.waitFor({state:'visible',timeout:3000}).catch(()=>{});
    const hasEnabledAction=await action.isVisible().catch(()=>false)&&await action.evaluate(el=>!el.closest('[disabled],[aria-disabled="true"]')&&getComputedStyle(el).pointerEvents!=='none').catch(()=>false);
    if(unique.length!==1){jobs.push({jobUrl:url,jobStatus:'Unverified',jobTitle:'Unknown'});continue}
    const r=unique[0];
    audit.push({url,jobStatus:r.jobStatus,jobSource:r.jobSource,hasEnabledAction,closed,buttons:!hasEnabledAction?(await page.getByRole('button').allTextContents()).slice(0,12):[]});
    jobs.push({jobUrl:url,verifiedAt:new Date().toISOString(),sourceJobId:String(r.jobId),jobTitle:r.jobName,description:r.jobDesc,
      jobStatus:closed?'Expired':r.jobStatus===2&&r.jobSource!==1&&hasEnabledAction?'Active':'Unverified',
      activeEvidence:r.jobStatus===2&&r.jobSource!==1&&hasEnabledAction&&!closed?'Official page observed jobStatus=2 and enabled Apply/Chat action; status semantics confirmed in published official frontend.':null,
      salaryRaw:r.salaryDesc??'',experience:r.workExperienceDesc??'',jobTypeRaw:r.jobTypeDesc??'',workArrangementRaw:r.workingModels??''});
    if(jobs.length%3===0&&process.env.OFFERTODAY_PYTHON){
     const check=spawnSync(process.env.OFFERTODAY_PYTHON,['-m','pipeline.check_batch'],{input:JSON.stringify(jobs),encoding:'utf8',timeout:15000});
     if(check.status===0){const score=JSON.parse(check.stdout);if(score.eligible===12&&score.copyReady===12)break}
    }
   }catch(e){jobs.push({jobUrl:url,jobStatus:'Unverified',jobTitle:'Unknown'});errors.push(e.message);if(/challenge|budget/.test(e.message))break}
   finally{page.off('response',listener)}
  }
 }catch(e){errors.push(e.message)}finally{await page.close()}
 return {jobs,errors:[...new Set(errors)],audit};
}
async function main(){
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH});
 const context=await browser.newContext({locale:'en-HK',userAgent:'OfferTodayContentDesk/1.0 (public jobs; no automated applications)'});
 try{
  const input=process.argv[2]&&process.argv[2]!=='--inspect'?JSON.parse(readFileSync(process.argv[2],'utf8')):{};
  const output=await collect(context,{seeds:input.seeds??[],limit:Math.min(80,Math.max(12,Number(process.env.OFFERTODAY_CANDIDATE_LIMIT)||60)),inspect:process.argv.includes('--inspect')});
  process.stdout.write(JSON.stringify(output));
 }finally{await context.close();await browser.close()}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){main().catch(e=>{process.stderr.write(e.message+'\n');process.exitCode=1})}
