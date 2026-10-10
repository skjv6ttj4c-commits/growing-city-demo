// Reuse the validated sample data and city assets without changing previous demos.
import fs from 'node:fs';
const old=fs.readFileSync(new URL('./stroll.html',import.meta.url),'utf8');
function between(a,b){const start=old.indexOf(a);if(start<0)throw Error('Missing source anchor: '+a);const end=old.indexOf(b,start);if(end<0)throw Error('Missing source end: '+b);return old.slice(start,end);}
const city=between('<defs>','</svg>');
const data=between('const stores=','const fmt=');
const house=between('function house(b)',"$('#houses').innerHTML");
const setup=between("$('#houses').innerHTML",'const dom=');
const code=fs.readFileSync(new URL('./lens-runtime.js',import.meta.url),'utf8').replace('/*SHARED_DATA*/',data).replace('/*SHARED_CITY*/',house+'\n'+setup);
const html=fs.readFileSync(new URL('./lens-source.html',import.meta.url),'utf8').replace('%%CITY%%',city).replace('%%CODE%%',code);
fs.writeFileSync(new URL('./lens.html',import.meta.url),html);
console.log('Built lens.html — standalone, no external dependencies');
