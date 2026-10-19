import {test,expect} from '@playwright/test';
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const p={jobId:'TEST-ONLY',scheduledTime:'11:00',category:'Tech',account:'OfferToday-TechJobs',jobTitle:'TEST Software Engineer',jobUrl:'https://www.offertoday.com/en/job/TEST-ONLY',salary:'Not specified',experience:'Not specified',workArrangement:'Not specified',verifiedAt:today+'T10:00:00+08:00',activeEvidence:'TEST fixture only',repeatRecommendation:false,lastRecommendedDate:null,recommendationCount:1,xCopy:'TEST ONLY: A draft for clipboard testing.',contentHash:'a'.repeat(64)};
function snapshot(date:string){return {date,timezone:'Asia/Hong_Kong',targetCount:12,lastRunAt:date+'T10:00:00+08:00',lastSuccessfulRunAt:date+'T10:00:00+08:00',status:'partial',shortfall:11,posts:[p],demo:false,excludedCandidates:[{jobId:'bad',jobTitle:'Expired fixture',reason:'Expired'}],errors:[]}}
test.beforeEach(async({page})=>{
 await page.route('**/data/index.json',r=>r.fulfill({json:{dates:[today,'2026-01-01']}}));
 await page.route('**/data/daily/*.json',r=>r.fulfill({json:snapshot(r.request().url().split('/').pop()!.slice(0,-5))}));
});
test('fixed job table, history, filters, no review or CSV',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'TEST Software Engineer'})).toBeVisible();
 await expect(page.getByRole('button',{name:/Approve|Sign in/})).toHaveCount(0);
 await expect(page.getByRole('link',{name:/CSV/})).toHaveCount(0);
 await page.getByRole('button',{name:'Design',exact:true}).click();
 await expect(page.getByText('No matching opportunities')).toBeVisible();
 await page.getByRole('button',{name:'All opportunities'}).click();
 await page.getByLabel('Search title or Job ID').fill('unknown');
 await expect(page.getByText('No matching opportunities')).toBeVisible();
 await page.getByLabel('Search title or Job ID').fill('');
 await page.getByLabel('EDITION DATE').selectOption('2026-01-01');
 await expect(page.getByText('Historical edition for 2026-01-01.',{exact:false})).toBeVisible();
 await expect(page.getByRole('button',{name:'Copy X Post'})).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('real X draft clipboard copy and clear failure feedback',async({page})=>{
 await page.context().grantPermissions(['clipboard-read','clipboard-write']);
 await page.goto('/');
 await page.getByRole('button',{name:'Copy X Post'}).click();
 await expect(page.getByRole('status').filter({hasText:'Copied to clipboard.'})).toBeVisible();
 expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe(p.xCopy);
 await page.evaluate(()=>Object.defineProperty(navigator.clipboard,'writeText',{value:()=>Promise.reject(new Error('Denied')),configurable:true}));
 await page.getByRole('button',{name:'Copy X Post'}).click();
 await expect(page.getByRole('status').filter({hasText:'Copy failed.'})).toBeVisible();
});
test('missing today never uses old data as verified',async({page})=>{
 await page.route(`**/data/daily/${today}.json`,r=>r.fulfill({status:404,body:'not found'}));
 await page.goto('/');
 await expect(page.getByRole('alert').filter({hasText:'Data unavailable'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'TEST Software Engineer'})).toHaveCount(0);
 await expect(page.getByText('12 places remain unfilled.',{exact:false})).toBeVisible();
});
