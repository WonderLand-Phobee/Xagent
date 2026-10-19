import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {scopedState,loadAuthState} from './auth-state.mjs';
test('credentials are restricted to the exact OfferToday domain family',()=>{
 const cookie=domain=>({domain,name:'fixture',value:'test-only'});
 const origin=origin=>({origin,localStorage:[{name:'fixture',value:'test-only'}]});
 const result=scopedState({cookies:['.offertoday.com','www.offertoday.com','eviloffertoday.com','offertoday.com.evil.test'].map(cookie),origins:['https://www.offertoday.com','http://www.offertoday.com','https://unrelated.test'].map(origin)});
 assert.deepEqual(result.cookies.map(c=>c.domain),['.offertoday.com','www.offertoday.com']);
 assert.deepEqual(result.origins.map(o=>o.origin),['https://www.offertoday.com']);
});
test('public mode needs no session; empty or malformed exports fail closed',()=>{
 assert.equal(loadAuthState(undefined),undefined);
 assert.throws(()=>scopedState({cookies:[],origins:[]}));
 assert.throws(()=>scopedState({}));
});
test('parse errors never echo credential values',()=>{
 const dir=mkdtempSync(join(tmpdir(),'offertoday-test-'));
 try{const file=join(dir,'state.json');writeFileSync(file,'secret-test-marker-invalid-json');
 assert.throws(()=>loadAuthState(file),error=>!error.message.includes('secret-test-marker')&&error.message.includes('fresh login export'));
 }finally{rmSync(dir,{recursive:true,force:true})}
});
