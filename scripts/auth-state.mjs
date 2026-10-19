import {readFileSync} from 'node:fs';

const allowedHost=host=>host==='offertoday.com'||host.endsWith('.offertoday.com');
// Keep only the website's own login state. Never export unrelated browser data.
export function scopedState(state){
 if(!state||!Array.isArray(state.cookies)||!Array.isArray(state.origins))throw new Error('Invalid login state. Run the Windows login tool again.');
 const cookies=state.cookies.filter(c=>typeof c.domain==='string'&&allowedHost(c.domain.replace(/^\./,'')));
 const origins=state.origins.filter(o=>{try{const u=new URL(o.origin);return u.protocol==='https:'&&allowedHost(u.hostname)}catch{return false}});
 if(!cookies.length&&!origins.some(o=>o.localStorage?.length))throw new Error('No OfferToday login state found. Sign in before saving.');
 return {cookies,origins};
}
export function loadAuthState(path){
 if(!path)return undefined;
 try{return scopedState(JSON.parse(readFileSync(path,'utf8')))}catch{
  // Do not echo a parser error: it could contain credential contents.
  throw new Error('Cannot read OfferToday login state. Replace OFFERTODAY_STORAGE_STATE with a fresh login export.');
 }
}
