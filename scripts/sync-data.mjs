import { cpSync, mkdirSync } from 'node:fs';
mkdirSync('public/data', {recursive:true});
cpSync('data','public/data',{recursive:true});
