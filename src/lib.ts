import twitter from 'twitter-text';
export function hkDate(now=new Date()) {
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
}
export function hkTime(value:string|null|undefined) {
 return value ? new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Hong_Kong',dateStyle:'medium',timeStyle:'short'}).format(new Date(value))+' HKT' : 'No successful run yet';
}
export function tweetLength(text:string) { return twitter.parseTweet(text).weightedLength; }
