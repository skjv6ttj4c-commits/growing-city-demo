// Reuse the validated sample data and city assets without changing previous demos.
import fs from 'node:fs';
const old=fs.readFileSync(new URL('./stroll.html',import.meta.url),'utf8');
function between(a,b){const start=old.indexOf(a);if(start<0)throw Error('Missing source anchor: '+a);const end=old.indexOf(b,start);if(end<0)throw Error('Missing source end: '+b);return old.slice(start,end);}
const city=between('<defs>','</svg>');
const data=between('const stores=','const fmt=');
const house=between('function house(b)',"$('#houses').innerHTML");
const setup=between("$('#houses').innerHTML",'const dom=');
const code=fs.readFileSync(new URL('./lens-runtime.js',import.meta.url),'utf8').replace('/*SHARED_DATA*/',data).replace('/*SHARED_CITY*/',house+'\n'+setup);
// Recolor only this edition. The original data and earlier demos stay unchanged.
const palette={'#052226':'#0b0621','#6d7d60':'#574b83','#365347':'#332450','#27493f':'#23173d','#669a8a':'#b5a1ed','#325e60':'#625398','#a3c2aa':'#dbd3ff','#c3c497':'#c0aee8','#98a17b':'#8e7cad','#0e3028':'#130a2c','#294638':'#382553','#153a31':'#291b48','#7b8c67':'#89759f','#b5ad78':'#bdb0df','#9aac7b':'#8277b2','#98aa86':'#9183b8','#d49c6b':'#aa92ca','#a9684e':'#685387','#ebd4a7':'#e0d4ef','#d0aa78':'#c3a6cb','#91724f':'#81648f','#dcc29a':'#e5d1e4','#748f8b':'#8b87c4','#466866':'#55507e','#aec8b0':'#ccc9ed','#be856d':'#bd95c0','#865347':'#77517f','#e0ae83':'#e6c2db','#c5bd96':'#b5afd7','#8e9776':'#786d9e','#80967b':'#a398c7','#b49779':'#b3a0ce','#766658':'#736085','#d2b999':'#decee9','#98aa88':'#a198c9','#61785f':'#695c93','#b7c4a0':'#cbbfe8','#f4d39a':'#e9cffa','#385545':'#685384'};
const tint=source=>source.replace(/#[0-9a-f]{6}\b/gi,color=>palette[color.toLowerCase()]||color);
const html=fs.readFileSync(new URL('./lens-source.html',import.meta.url),'utf8').replace('%%CITY%%',tint(city)).replace('%%CODE%%',tint(code));
fs.writeFileSync(new URL('./lens.html',import.meta.url),html);
console.log('Built lens.html — standalone, no external dependencies');
