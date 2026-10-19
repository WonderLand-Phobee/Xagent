import {chromium} from '@playwright/test';
import {mkdir,writeFile,chmod} from 'node:fs/promises';
import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
import {fileURLToPath} from 'node:url';
import {scopedState} from './auth-state.mjs';
const directory=fileURLToPath(new URL('../.private/',import.meta.url));
const output=fileURLToPath(new URL('../.private/offertoday-login.json',import.meta.url));
const browser=await chromium.launch({headless:false});
const context=await browser.newContext({locale:'en-HK',userAgent:'OfferTodayContentDesk/1.0 (public jobs; no automated applications)'});
const terminal=createInterface({input:stdin,output:stdout});
try{
 const page=await context.newPage();
 await page.goto('https://www.offertoday.com/en',{waitUntil:'domcontentloaded'});
 console.log('\nLog in yourself in the browser. Complete any verification yourself.');
 console.log('Open a job and confirm the full JD and salary are visible.');
 console.log('This tool does not apply to jobs or send messages.');
 await terminal.question('When ready, return here and press ENTER to save (Ctrl+C cancels). ');
 const state=scopedState(await context.storageState());
 const text=JSON.stringify(state);
 if(Buffer.byteLength(text,'utf8')>47000)throw new Error('Login state exceeds the GitHub Secret size limit. Nothing saved.');
 await mkdir(directory,{recursive:true,mode:0o700});
 await writeFile(output,text,{mode:0o600});await chmod(output,0o600);
 console.log('\nSaved locally: '+output);
 console.log('In GitHub Actions secrets, add OFFERTODAY_STORAGE_STATE and paste the file contents.');
 console.log('Never send this file in chat or commit it. Delete the file after saving the secret.');
 console.log('The file contains sensitive login credentials. Export does not prove the session will work on GitHub.');
}catch{
 console.error('Login export did not finish. No credentials are printed. Try again after signing in.');
 process.exitCode=1;
}finally{terminal.close();await context.close();await browser.close()}
