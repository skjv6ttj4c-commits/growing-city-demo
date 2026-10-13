(()=>{
'use strict';
const $=s=>document.querySelector(s),DAY=86400000,dt=s=>Date.parse(s+'T00:00:00Z'),END=dt('2026-10-08')+DAY-1;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const spans={week:{start:dt('2026-10-02'),label:'这一周',short:'近一周'},month:{start:dt('2026-09-09'),label:'这个月',short:'近一个月'},half:{start:dt('2026-04-09'),label:'这半年',short:'近半年'}};
const rangeKeys=Object.keys(spans);
/*SHARED_DATA*/
const fmt=t=>new Date(t).toISOString().slice(0,10).replaceAll('-','.'),get=id=>stores.find(s=>s.id===id),first=id=>Math.min(...events.filter(e=>e.s===id).map(e=>e.t)),clamp=v=>Math.max(0,Math.min(1,v)),smooth=v=>(v=clamp(v),v*v*(3-2*v));
let mode='overview',entry=0,entryStart=0,range='month',p=0,target=0,raf=0,last=0,chapter=-1,chapters=[],rows=[],coffeeRows=[],fresh=[],again=[],total=0,uses=0,W=390,H=700,usable=490,rangeLock=false,dragging=false,settleTimer=0,focusTimer=0,snapRunning=false;
/*SHARED_CITY*/
const dom=Object.fromEntries(stores.map(s=>[s.id,{el:$('#b-'+s.id),model:$('#b-'+s.id+' .model'),label:$('#b-'+s.id+' .label'),glow:$('#b-'+s.id+' .glow'),windows:[...document.querySelectorAll('#b-'+s.id+' .window')]}]));
const narrative=$('.narrative'),details=$('.detail-label'),world=$('#world'),screen=$('.screen'),dock=$('.dock'),dial=$('#time-dial');
function buildChapters(preferred=null){
 rows=events.filter(e=>e.t>=spans[range].start&&e.t<=END);
 const ids=[...new Set(rows.map(e=>e.s))];
 fresh=ids.filter(id=>first(id)>=spans[range].start);again=ids.filter(id=>!fresh.includes(id));
 total=rows.reduce((n,e)=>n+e.off,0);uses=rows.filter(e=>e.off>0).length;coffeeRows=rows.filter(e=>e.s==='coffee');
 const coffee={ids:['coffee'],subject:'coffee',title:'兜兜转转，<br>还是这杯熟悉的拿铁。',tag:spans[range].label+' · 又见面',chapter:'又见面'};
 const spa={ids:['spa'],subject:'spa',title:'这一小时，<br>把日子过慢一点。',tag:'10.02 · 留给自己的片刻',chapter:'另一段日常'};
 const book={ids:['book'],subject:'book',title:'熟悉的城，<br>又认识了一个新角落。',tag:'09.12 · 新相遇',chapter:'新相遇'};
 const cinema={ids:['cinema','hotpot'],subject:'cinema',title:'电影散场，<br>这一天还没有结束。',tag:'05.16 · 一个周末',chapter:'一个周末'};
 const hotel={ids:['hotel'],subject:'hotel',title:'住进两晚远方，<br>把风景留在日常。',tag:'07.11 · 两晚远方',chapter:'两晚远方'};
 chapters=range==='week'?[spa,coffee]:range==='month'?[book,coffee,spa]:[cinema,coffee,hotel];
 if(preferred&&!chapters.some(c=>c.ids.includes(preferred))&&rows.some(e=>e.s===preferred)){
  chapters[0]={ids:[preferred],subject:preferred,title:'同一个地方，<br>换一段时间再看看。',tag:spans[range].label+' · 重新取景',chapter:'重新取景'};
 }
 chapters.push({ids:[],subject:null,title:'原来，这些小事，<br>组成了我的生活。',tag:spans[range].label+' · 生活全貌',chapter:'生活全貌'});
 chapters.forEach(c=>{
  const s=c.subject?get(c.subject):null,list=rows.filter(e=>c.ids.includes(e.s));
  c.records=list;c.quote=[...list].reverse().find(e=>e.q)?.q||'';
  c.money=list.reduce((n,e)=>n+e.off,0);c.uses=list.filter(e=>e.off>0).length;
  c.x=s?s.x:380;c.y=s?s.y:310;c.w=!s?810:c.ids.length>1?350:170;
  c.name=c.ids.map(id=>get(id).name).join(' × ');if(c.ids.length>1){c.x=435;c.y=330;}c.roof=s?s.h+s.d:0;
 });
 $('.steps').innerHTML=chapters.map(()=>'<i></i>').join('');
 $('#cafe-cups').innerHTML=coffeeRows.map((e,i)=>{const c=get('coffee'),x=c.x-30+i*8,y=c.y-19+i*2;return '<g class="cup"><path d="M'+x+' '+y+'h5l-.5 6h-4Z" fill="#ffeec7"/><path d="M'+(x+5)+' '+(y+1)+'q4 2 0 4" fill="none" stroke="#ffeec7"/></g>';}).join('');
 $('#period').textContent=fmt(spans[range].start).slice(2)+' — '+fmt(END).slice(2);
 $('#intro-places').textContent=stores.filter(s=>first(s.id)<=END).length;
 $('#intro-new').textContent=fresh.length;$('#intro-again').textContent=again.length;
 updateDial(rangeKeys.indexOf(range));chapter=-1;
}
function updateDial(v){
 const value=Math.max(0,Math.min(2,v)),key=rangeKeys[Math.round(value)];
 $('.wheel-ticks').style.transform='rotate('+((1-value)*56)+'deg)';
 $('.wheel-pointer').style.transform='rotate('+((value-1)*56)+'deg)';
 $('#scale-name').textContent=spans[key].short;dial.setAttribute('aria-valuenow',Math.round(value));dial.setAttribute('aria-valuetext',spans[key].short);
 document.querySelectorAll('[data-range]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.range===key));
}
$('.wheel-ticks').innerHTML=Array.from({length:90},(_,i)=>'<i class="'+(i%7===0?'major':'')+'" style="transform:rotate('+(i*4)+'deg)"></i>').join('');
function overviewCamera(){
 const heading=$('.intro-heading'),bottom=$('.intro-bottom');
 const top=heading.offsetTop+heading.offsetHeight+22,end=bottom.offsetTop-24;
 const w=Math.max(810,470*W/Math.max(140,end-top)),h=w*H/W;
 return {x:380-w*.5,y:290-h*((top+end)/2)/H,w,h};
}
function camera(c){
 if(usable<420){
  const titleHeight=narrative.offsetHeight||90,detailHeight=details.offsetHeight||108;
  const space=Math.max(c.subject?82:72,usable-titleHeight-detailHeight-(c.subject?44:92));
  const w=Math.max(c.w,(c.subject?c.roof:480)*W/space),h=w*H/W;
  return{x:c.x-w*.52,y:(c.subject?c.y:530)-h*(titleHeight+22+space)/H,w,h};
 }
 const w=c.subject?Math.max(c.w,c.w*440/Math.max(290,usable)):Math.max(c.w,480*W/Math.max(210,usable*.7)),h=w*H/W;
 return{x:c.x-w*.52,y:c.y-h*(usable/H)*(c.subject?.60:.53),w,h};
}
const mixCamera=(a,b,t)=>Object.fromEntries(['x','y','w','h'].map(k=>[k,a[k]+(b[k]-a[k])*t]));
function setCamera(cam){world.setAttribute('viewBox',cam.x+' '+cam.y+' '+cam.w+' '+cam.h);}
function drawOverview(){
 setCamera(overviewCamera());narrative.style.opacity=details.style.opacity=0;
 $('.scene-connector').style.opacity=0;$('.end-options').hidden=true;
 stores.forEach(s=>{const el=dom[s.id];el.el.style.opacity=1;el.model.style.transform='none';el.label.style.opacity=0;el.glow.style.opacity=0;el.el.style.pointerEvents='none';});
 ['#road','#traveler','#connection'].forEach(sel=>$(sel).style.opacity=0);
 document.querySelectorAll('.cup').forEach(el=>el.style.opacity=0);
 screen.dataset.mode=mode;screen.dataset.node='overview';screen.dataset.range=range;screen.dataset.progress='0';
}
function draw(){
 if(mode==='overview'){drawOverview();return;}
 const n=chapters.length,index=Math.min(n-1,Math.floor(p*n)),u=clamp(p*n-index),c=chapters[index],wide=!c.subject;
 if(chapter!==index){
  chapter=index;$('#kicker').textContent=c.tag+' · '+(c.name||'我的生活城');$('#title').innerHTML=c.title;$('#chapter-name').textContent=c.chapter;
  document.querySelectorAll('.steps i').forEach((el,i)=>el.classList.toggle('active',i===index));
 }
 // Camera position follows scroll continuously. Entry is one uninterrupted wide-to-close shot.
 let cam=camera(c),arrival=smooth(u/.22);
 if(index>0&&!reduce)cam=mixCamera(camera(chapters[index-1]),cam,arrival);
 const entryEase=smooth(entry);
 if(mode==='entering')cam=mixCamera(overviewCamera(),cam,entryEase);
 setCamera(cam);
 const project=(x,y)=>({x:(x-cam.x)/cam.w*W,y:(y-cam.y)/cam.h*H});
 const base=project(c.x,c.y),roof=project(c.x,c.y-c.roof);
 const fade=(mode==='entering'?smooth((entry-.45)/.45):1)*(index===0||reduce?1:clamp(u/.16));
 $('.scene-connector').style.opacity=fade;
 // The memory is immediately readable at a resting node, without a secondary dialog.
 if(wide){
  $('#stat').textContent=fresh.length+' 个新相遇 · '+again.length+' 个熟悉的地方';
  $('#quote').textContent='旧的记忆还在，新的日常接着生长。';
  $('#dates').textContent=rows.length+' 条本阶段记录 · 每一处变化都有来处';
  $('#benefit').textContent='会员权益 '+uses+' 次 · 实际节省 ¥'+total;
 }else{
  const count=c.subject==='coffee'?Math.min(coffeeRows.length,Math.floor(clamp((u-.06)/.4)*coffeeRows.length)):c.records.length;
  $('#stat').textContent=c.subject==='coffee'?(count?spans[range].label+'，又选择了它 '+count+' 次。':'熟悉的小店，正在重新亮灯。'):c.ids.length>1?'一场电影，接上一顿晚餐。':c.subject==='hotel'?'两晚住宿，一句关于风的记忆。':'这段时间，留下了 '+c.records.length+' 条记录。';
  $('#quote').textContent=c.quote;
  $('#dates').textContent=c.subject==='coffee'?coffeeRows.map(e=>fmt(e.t).slice(5)).join(' · ')+' · 已完成咖啡记录':c.ids.length>1?'05.16 · 15:20 电影 / 18:10 餐饮核销（记录关联）':c.records.map(e=>fmt(e.t).slice(5)+' · '+e.item).join(' / ');
  $('#benefit').textContent=c.uses?'本节点 · 使用权益 '+c.uses+' 次 · 省 ¥'+c.money:'本节点没有使用会员优惠';
 }
 const titleH=narrative.offsetHeight,titleW=narrative.offsetWidth,detailH=details.offsetHeight,detailW=details.offsetWidth;
 const titleX=Math.max(18,Math.min(W-titleW-18,roof.x-titleW*.54));
 const titleY=wide?12:Math.max(12,Math.min(usable*.22,roof.y-titleH-20));
 const detailX=Math.max(18,Math.min(W-detailW-18,base.x-detailW*.53));
 const maxDetailY=usable-detailH-(wide?60:12);
 const detailY=wide?maxDetailY:Math.min(maxDetailY,Math.max(titleY+titleH+95,base.y+20));
 narrative.style.transform='translate3d('+titleX+'px,'+titleY+'px,0)';narrative.style.opacity=fade;
 details.style.transform='translate3d('+detailX+'px,'+detailY+'px,0)';details.style.opacity=fade*(wide?smooth((u-.16)/.24):index===0?1:Math.max(.15,smooth(u/.27)));
 const lx=Math.min(titleX+55,roof.x),ly=titleY+titleH+8;
 $('#leader').setAttribute('d','M'+lx+' '+ly+'V'+Math.max(ly,roof.y-13)+'L'+roof.x+' '+(roof.y-7));$('#leader').style.opacity=wide?0:.45;
 $('#anchor').setAttribute('cx',roof.x);$('#anchor').setAttribute('cy',roof.y-7);$('#anchor').style.opacity=wide?0:1;
 stores.forEach(s=>{
  const ci=chapters.findIndex(ch=>ch.ids.includes(s.id)),before=first(s.id)<spans[range].start;
  let birth=before||ci===0?1:ci<0?smooth((p-(n-1)/n)/(.7/n)):smooth((p*n-ci+.1)/.48);
  if(mode==='entering')birth=1;
  const el=dom[s.id],selected=c.ids.includes(s.id);
  const opacity=birth*(selected||wide?1:.20);
  el.el.style.opacity=mode==='entering'?1+(opacity-1)*entryEase:opacity;
  el.model.style.transform='translateY('+((1-birth)*24)+'px) scaleY('+(.07+.93*birth)+')';
  el.label.style.opacity=wide?clamp((u-.45)/.25):0;el.glow.style.opacity=selected&&c.subject==='coffee'?.24*smooth(u/.5):0;
  el.windows.forEach((w,i)=>w.setAttribute('fill',c.subject==='coffee'&&s.id==='coffee'&&u<i/14?'#9482b0':'#ffe3b9'));
  el.el.style.pointerEvents=mode==='journey'&&p>.96?'auto':'none';
 });
 document.querySelectorAll('.cup').forEach((cup,i)=>cup.style.opacity=c.subject==='coffee'?smooth((u-.1-i*.4/Math.max(1,coffeeRows.length))/.12):0);
 const prev=index>0?chapters[index-1]:{x:c.x-80,y:c.y+50},road=$('#road');
 road.setAttribute('d','M'+prev.x+' '+prev.y+'Q'+((prev.x+c.x)/2)+' '+(Math.max(prev.y,c.y)+65)+' '+c.x+' '+(c.y+6));
 const length=road.getTotalLength();road.style.strokeDasharray=length;road.style.strokeDashoffset=length*(1-smooth(u/.4));road.style.opacity=wide?0:.55*fade;
 const point=road.getPointAtLength(length*smooth(u/.4));$('#traveler').setAttribute('cx',point.x);$('#traveler').setAttribute('cy',point.y);$('#traveler').style.opacity=wide?0:.7*fade;
 $('#connection').style.opacity=c.ids.length>1?clamp((u-.45)/.25):0;
 $('.end-options').hidden=p<.965||mode!=='journey';$('.end-options').style.bottom=(dock.offsetHeight+10)+'px';
 $('#skip').textContent=p>.96?'回到起点 ↖':'看全貌 ↘';
 $('#hint').textContent=rangeLock?'沿圆弧拨动，松手重新取景':p>.96?'轻点地标 · 回看生活痕迹':u>.4&&u<.78?'停一会儿，看看自己的痕迹':'↑ 轻推继续 · ↓ 随时回看';
 screen.dataset.progress=p.toFixed(4);screen.dataset.node=c.subject||'overview';screen.dataset.range=range;screen.dataset.mode=mode;
}
function travelHeight(){return Math.max(1,$('.track').offsetHeight-screen.offsetHeight);}
function readTarget(){return clamp((window.scrollY-$('.track').offsetTop)/travelHeight());}
function wake(){if(!raf)raf=requestAnimationFrame(tick);}
function finishEntry(){
 mode='journey';entry=1;screen.dataset.mode=mode;$('.intro').hidden=true;
 document.body.classList.remove('overview-mode');dock.inert=false;dock.setAttribute('aria-hidden','false');$('#skip').tabIndex=0;
 p=target=0;window.scrollTo({top:0,behavior:'instant'});$('#skip').focus({preventScroll:true});
}
function tick(now){
 raf=0;const delta=Math.min(40,last?now-last:16);last=now;
 if(mode==='entering'){
  if(!entryStart)entryStart=now;entry=reduce?1:clamp((now-entryStart)/1450);
  if(entry>.6)screen.classList.add('dock-reveal');
  if(entry===1)finishEntry();
  draw();if(mode==='entering')wake();else last=0;return;
 }
 p=reduce?target:p+(target-p)*(1-Math.exp(-delta/55));if(Math.abs(p-target)<.00015)p=target;
 draw();if(p!==target)wake();else last=0;
}
$('#enter').onclick=()=>{
 if(mode!=='overview')return;mode='entering';entry=0;entryStart=0;screen.dataset.mode=mode;$('.intro').inert=true;wake();
};
function settle(){
 clearTimeout(settleTimer);
 settleTimer=setTimeout(()=>{
  if(mode!=='journey'||dragging||rangeLock||reduce||$('#detail').open||snapRunning)return;
  const actual=readTarget(),candidates=chapters.map((c,i)=>c.subject?(i+.6)/chapters.length:1),near=candidates.reduce((a,b)=>Math.abs(b-actual)<Math.abs(a-actual)?b:a);
  if(Math.abs(near-actual)<.022&&Math.abs(near-actual)>.003){snapRunning=true;window.scrollTo({top:$('.track').offsetTop+near*travelHeight(),behavior:'smooth'});setTimeout(()=>snapRunning=false,450);}
 },240);
}
window.addEventListener('scroll',()=>{if(mode!=='journey')return;target=readTarget();wake();if(!snapRunning)settle();},{passive:true});
window.addEventListener('pointerdown',()=>{dragging=true;clearTimeout(settleTimer);if(snapRunning){window.scrollTo({top:window.scrollY,behavior:'instant'});snapRunning=false;}},{passive:true});
window.addEventListener('pointerup',()=>{dragging=false;if(mode==='journey')settle();},{passive:true});
window.addEventListener('pointercancel',()=>dragging=false,{passive:true});
function go(v,immediate=false){
 if(mode!=='journey')return;clearTimeout(settleTimer);target=v;
 window.scrollTo({top:$('.track').offsetTop+v*travelHeight(),behavior:immediate||reduce?'instant':'smooth'});
 if(immediate||reduce){p=v;draw();}
}
function switchRange(next){
 if(mode!=='journey')return;rangeLock=false;
 if(next===range){updateDial(rangeKeys.indexOf(range));return;}
 const old=chapters[Math.min(chapters.length-1,Math.floor(p*chapters.length))].subject,wasEnd=p>.95;
 range=next;buildChapters(old);const match=chapters.findIndex(c=>c.ids.includes(old));
 const nextP=wasEnd?1:match>=0?(match+.6)/chapters.length:.12/chapters.length;
 screen.classList.add('focusing');clearTimeout(focusTimer);focusTimer=setTimeout(()=>screen.classList.remove('focusing'),180);go(nextP,true);
}
let wheelPointer=null,wheelStart=0,wheelValue=1,wheelOrigin=1,wheelMoved=false,suppressClick=false;
function pointerAngle(e){const b=dial.getBoundingClientRect();return Math.atan2(e.clientX-b.left-b.width/2,b.top+b.width/2-e.clientY)*180/Math.PI;}
dial.addEventListener('pointerdown',e=>{
 if(mode!=='journey'||e.button>0)return;
 wheelPointer=e.pointerId;wheelStart=pointerAngle(e);wheelOrigin=wheelValue=rangeKeys.indexOf(range);wheelMoved=false;rangeLock=true;clearTimeout(settleTimer);
 // Capture on the original element so a stationary tap still reaches its label button.
 e.target.setPointerCapture(e.pointerId);dial.classList.add('dragging');
});
dial.addEventListener('pointermove',e=>{
 if(e.pointerId!==wheelPointer)return;
 const change=pointerAngle(e)-wheelStart;
 if(Math.abs(change)>3)wheelMoved=true;
 if(wheelMoved){e.preventDefault();wheelValue=Math.max(0,Math.min(2,wheelOrigin-change/56));updateDial(wheelValue);$('#hint').textContent='松手切换范围，保留仍有记录的地点';}
});
function endWheel(e,cancel=false){
 if(e.pointerId!==wheelPointer)return;
 wheelPointer=null;dial.classList.remove('dragging');rangeLock=false;
 if(wheelMoved&&!cancel){suppressClick=true;switchRange(rangeKeys[Math.round(wheelValue)]);setTimeout(()=>suppressClick=false,0);}
 else updateDial(rangeKeys.indexOf(range));
}
dial.addEventListener('pointerup',e=>endWheel(e));
dial.addEventListener('pointercancel',e=>endWheel(e,true));
dial.addEventListener('lostpointercapture',e=>{if(wheelPointer===e.pointerId)endWheel(e,true);});
dial.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();return;}const button=e.target.closest('[data-range]');if(button)switchRange(button.dataset.range);});
dial.addEventListener('keydown',e=>{
 if(e.target.closest('button'))return;
 const index=rangeKeys.indexOf(range);
 const next=e.key==='Home'?0:e.key==='End'?2:['ArrowLeft','ArrowDown'].includes(e.key)?Math.max(0,index-1):['ArrowRight','ArrowUp'].includes(e.key)?Math.min(2,index+1):null;
 if(next!==null){e.preventDefault();e.stopPropagation();switchRange(rangeKeys[next]);}
});
$('#skip').onclick=()=>go(p>.96?0:1);$('#restart').onclick=()=>go(0);
function resize(){
 W=$('.stage').clientWidth;H=$('.stage').clientHeight;usable=Math.max(220,H-dock.offsetHeight-8);
 if(mode==='journey'){target=readTarget();p=target;}draw();
}
new ResizeObserver(()=>{if(chapters.length)resize();}).observe($('.stage'));
document.addEventListener('keydown',e=>{
 if(mode!=='journey'||e.target.closest('input,button,a,dialog,[role=slider]')||$('#detail').open)return;
 if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(e.key)){e.preventDefault();go(e.key==='Home'?0:e.key==='End'?1:clamp(target+(['ArrowUp','PageUp'].includes(e.key)?-.12:.12)));}
});
function showSummary(){
 clearTimeout(settleTimer);$('#dialog-label').textContent=fmt(spans[range].start)+' — '+fmt(END);
 $('#dialog-body').innerHTML='<h2>每个变化，都有来处。</h2><p>'+fresh.length+' 个新地方 · '+again.length+' 个熟悉的地方 · '+rows.length+' 条有效记录。</p><div class="places">'+[...new Set(rows.map(e=>e.s))].map(id=>'<button data-detail="'+id+'">'+get(id).name+'</button>').join('')+'</div><h2>会员足迹 · ¥'+total+'</h2>'+rows.filter(e=>e.off>0).map(e=>'<div class="row"><span>'+get(e.s).name+'<small>'+fmt(e.t)+' · '+e.item+'</small></span><span>¥'+e.off+'</span></div>').join('')+'<p><a href="./lens-classic.html">原镜头版</a> · <a href="./stroll.html">滑动生长版</a> · <a href="./index.html">初版</a></p><small>虚构示例；演示时钟 2026.10.08。近一个月按最近30天统计。“本月城事”为入口标题。仅统计已使用优惠，不包含未使用券。主题编排不代表实际出行路线。</small>';
 if(!$('#detail').open)$('#detail').showModal();
}
function showPlace(id){
 clearTimeout(settleTimer);const s=get(id),list=rows.filter(e=>e.s===id),q=[...list].reverse().find(e=>e.q);
 $('#dialog-label').textContent=spans[range].label+' · '+s.name;
 $('#dialog-body').innerHTML='<h2>'+s.name+'</h2><p>这一阶段 '+list.length+' 条记录，过去的记忆也依然保留。</p>'+(q?'<div class="quote">'+q.q+'</div>':'')+list.map(e=>'<div class="row"><span>'+e.item+'<small>'+fmt(e.t)+'</small></span><span>'+(e.off?'省 ¥'+e.off:'')+'</span></div>').join('')+'<div class="places"><button id="summary-back">回到本阶段依据</button></div>';
 if(!$('#detail').open)$('#detail').showModal();
}
$('#facts').onclick=showSummary;$('.close').onclick=()=>$('#detail').close();
document.addEventListener('click',e=>{const el=e.target.closest('[data-detail]'),building=e.target.closest('[data-place]');if(el)showPlace(el.dataset.detail);else if(building&&mode==='journey'&&p>.96)showPlace(building.dataset.place);if(e.target.closest('#summary-back'))showSummary();});
$('#detail').addEventListener('click',e=>{if(e.target===$('#detail')&&e.clientY<$('#detail').getBoundingClientRect().top)$('#detail').close();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(settleTimer);cancelAnimationFrame(raf);raf=0;last=0;}else{if(mode==='journey')target=readTarget();wake();}});
if('scrollRestoration' in history)history.scrollRestoration='manual';
window.scrollTo({top:0,behavior:'instant'});buildChapters();resize();
})();
