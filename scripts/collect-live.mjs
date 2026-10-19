/** Normal browser navigation only. No stealth, fabricated credentials, captcha solving,
 * request replay, direct private APIs or certificate overrides. */
import {chromium} from '@playwright/test';
import {loadAuthState} from './auth-state.mjs';
import robotsParser from 'robots-parser';
const AGENT='OfferTodayContentDesk';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const origin='https://www.offertoday.com';
export const keywords=['Software Engineer','Software Developer','UI UX Designer','Graphic Designer','Video Editor'];
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function objects(value){if(!value||typeof value!=='object')return [];if(Array.isArray(value))return value.flatMap(objects);return [value,...Object.values(value).flatMap(objects)];}
const loginNotice=/sign\s*in\s+(?:to\s+)?(?:view|see|unlock|access)[^\n]{0,70}(?:full|job description|more|details)|登入.{0,20}(?:完整|更多).{0,20}(?:職位|描述|內容)/i;
export async function jdAccess(page){
 const heading=page.getByText('Job Description',{exact:true}).first();
 if(!await heading.count()){
  const match=(await page.locator('body').innerText()).match(loginNotice);
  return {gated:!!match,scope:'page',notice:match?.[0]??''};
 }
 const section=heading.locator('..');const text=await section.innerText();
 const masked=await section.evaluate(root=>[root,...root.querySelectorAll('*')].some(el=>{
  const style=getComputedStyle(el),height=parseFloat(style.maxHeight);
  return Number.isFinite(height)&&height>0&&height<=500&&['hidden','clip'].includes(style.overflowY);
 }));
 const match=text.match(loginNotice);
 return {gated:masked&&!!match,scope:'job-description',notice:match?.[0]??''};
}
export async function collect(context,{seeds=[],pinned=[],limit=60,searchTerms=keywords,delay=2500,inspect=false}={}){
 const page=await context.newPage();page.setDefaultTimeout(8000);const errors=[],audit=[],jobs=[];
 const deadline=Date.now()+12*60*1000;
 const pinnedURLs=new Set(pinned);
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
  // Source access-policy observations are documented in docs/DATA_SOURCE.md. This browser does
  // not synthesize an API request; it observes the site's own normal responses.
  if(inspect){
   await navigate(origin+'/en/recommend');
   const access=await jdAccess(page);
   return {jobs:[],audit,errors,inputs:await page.locator('input').evaluateAll(xs=>xs.map(x=>({placeholder:x.placeholder,type:x.type}))),inspection:access.gated?'Full JD is gated; description omitted.':(await page.locator('body').innerText()).slice(0,18000),links:await page.locator('a[href*="/job/"]').evaluateAll(as=>as.map(a=>a.href).slice(0,20))};
  }
  const canonical=value=>{try{const u=new URL(value);return u.origin===origin&&/^\/(?:en\/)?job\/[^/]+\/?$/.test(u.pathname)?u.href:null}catch{return null}};
  const seedURLs=[...new Set([...pinned,...seeds].map(canonical).filter(Boolean))];
  const pinnedList=seedURLs.filter(u=>pinnedURLs.has(u));
  await navigate(origin+'/en/recommend');
  const readLinks=async()=>[...new Set((await page.locator('a[href*="/job/"]').evaluateAll(as=>as.map(a=>a.href))).map(canonical).filter(Boolean))];
  const rootLinks=await readLinks();const groups=[];
  const perTerm=Math.max(1,Math.ceil(limit/Math.max(1,searchTerms.length)));
  for(const term of searchTerms){
   const input=page.locator('input:visible');
   const fields=await input.all();let search;
   for(const field of fields){const ph=(await field.getAttribute('placeholder'))??'';if(/search|job|職位|搜尋|搜索/i.test(ph)){search=field;break}}
   if(!search){errors.push('Could not identify the public search box; collected visible official links only.');break}
   try{await search.fill(term);await search.press('Enter');await pause(delay)}catch{errors.push('Public search became unavailable; using already discovered official links.');break}
   if(await challenge())throw new Error('Access challenge encountered; stopped without solving it');
   const group=new Set();
   for(let scroll=0;scroll<3;scroll++){
    for(const u of await readLinks())if(!rootLinks.includes(u)&&group.size<perTerm)group.add(u);
    if(group.size>=perTerm)break;
    if(await page.locator('a[href*="/job/"]:visible').count())await page.locator('a[href*="/job/"]:visible').first().hover({timeout:2500}).catch(()=>{});
    await page.mouse.wheel(0,850);await pause(delay);
   }
   groups.push([...group]);audit.push({search:term,discovered:group.size});
  }
  // Every query gets a discovery budget; growing history never prevents fresh searches.
  const fresh=[];for(let i=0;i<perTerm;i++)for(const group of groups)if(group[i]&&!fresh.includes(group[i]))fresh.push(group[i]);
  const fallback=seedURLs.filter(u=>!pinnedURLs.has(u));
  const reserve=Math.min(20,fallback.length,Math.max(0,limit-pinnedList.length-1));
  const freshBudget=Math.max(1,limit-pinnedList.length-reserve);
  const candidates=[...new Set([...pinnedList,...fresh.slice(0,freshBudget),...fallback.slice(0,reserve),...fresh.slice(freshBudget),...fallback,...rootLinks])].slice(0,limit);
  if(!candidates.length)errors.push('No official job links in rendered page. Login/challenge/markup may require a permitted source update.');
  let gatedStreak=0;
  for(const url of candidates){
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
    const action=page.locator('#jobDetailActionButton').getByText(/^(?:Apply(?: now)?|Chat(?: now)?|Start chat|Send application message|立即申請|立即溝通|立即申请|立即沟通)$/i,{exact:true}).first();
    await action.waitFor({state:'visible',timeout:3000}).catch(()=>{});
    const access=await jdAccess(page);
    if(access.gated){
     jobs.push({jobUrl:url,jobStatus:'Unverified',jobTitle:await page.locator('#jobDetail-header').innerText().catch(()=>'Unknown'),blockReason:'Full JD requires sign-in'});
     audit.push({url,access:'login required for full JD',scope:access.scope,notice:access.notice});
     gatedStreak++;
     if(gatedStreak>=3){errors.push('Several consecutive full JDs require sign-in; stopped without exporting restricted descriptions.');break}
     continue;
    }
    gatedStreak=0;
    const body=await page.locator('body').innerText();
    const closed=/this (?:job|position) (?:has expired|is closed|is no longer available)|job expired|applications? closed|職位已(?:關閉|過期|下架)|职位已(?:关闭|过期|下架)/i.test(body);
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
 const storageState=loadAuthState(process.env.OFFERTODAY_AUTH_STATE_PATH);
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH});
 const context=await browser.newContext({storageState,locale:'en-HK',userAgent:'OfferTodayContentDesk/1.0 (public jobs; no automated applications)'});
 try{
  const input=process.argv[2]&&process.argv[2]!=='--inspect'?JSON.parse(readFileSync(process.argv[2],'utf8')):{};
  const output=await collect(context,{seeds:input.seeds??[],pinned:input.pinned??[],limit:Math.min(80,Math.max(12,Number(process.env.OFFERTODAY_CANDIDATE_LIMIT)||60)),inspect:process.argv.includes('--inspect')});
  process.stdout.write(JSON.stringify(output));
 }finally{await context.close();await browser.close()}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){main().catch(e=>{process.stderr.write(e.message+'\n');process.exitCode=1})}
