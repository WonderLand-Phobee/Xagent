import {describe,it,expect} from 'vitest';
import {hkDate,tweetLength} from './lib';
describe('Hong Kong dates and optional copy counts',()=>{
 it('uses Hong Kong date across UTC midnight',()=>{expect(hkDate(new Date('2026-10-18T17:00:00Z'))).toBe('2026-10-19')});
 it('counts URLs as 23 and emoji sequences as 2',()=>{expect(tweetLength('a https://www.offertoday.com/en/job/longjobidentifier')).toBe(25);expect(tweetLength('👨‍👩‍👧‍👦')).toBe(2)});
});
