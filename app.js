
(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const main=$('#main');
const hkd=n=>'HKD\u00a0'+Math.round(n).toLocaleString('en-US');
const n0=n=>Math.round(n).toLocaleString('en-US');
const DAY=86400000;
const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const pd=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const fD=d=>DOW[d.getDay()]+' '+d.getDate()+' '+MON[d.getMonth()]+' '+d.getFullYear();
const fS=d=>DOW[d.getDay()]+' '+d.getDate()+' '+MON[d.getMonth()];
const fDM=d=>d.getDate()+' '+MON[d.getMonth()];
const fW=d=>DOW[d.getDay()]+', '+d.getDate()+' '+MON[d.getMonth()]+' '+d.getFullYear();
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const LK='<svg class="lk" aria-hidden="true"><use href="#lock"/></svg>';
const TODAY=(()=>{const t=new Date();t.setHours(0,0,0,0);return t})();

/* ---------- illustrative network ---------- */
const PLACES={HKG:'Hong Kong',NRT:'Tokyo',KIX:'Osaka',ICN:'Seoul',TPE:'Taipei',BKK:'Bangkok',SIN:'Singapore',LHR:'London',SYD:'Sydney'};
const ROUTES={
  NRT:{seed:7,base:3700,tz:1,d:[260,285],no:520,out:['08:35','10:40','15:20'],back:['09:55','15:30','20:10'],ac:'Airbus A350-900'},
  KIX:{seed:21,base:3260,tz:1,d:[230,250],no:594,out:['08:10','13:45','16:25'],back:['10:30','15:05','19:20'],ac:'Airbus A330-300'},
  ICN:{seed:42,base:2980,tz:1,d:[210,225],no:418,out:['09:15','14:00','17:35'],back:['10:40','15:55','20:30'],ac:'Airbus A330-300'},
  TPE:{seed:99,base:1980,tz:0,d:[105,125],no:464,out:['07:50','11:30','18:40'],back:['09:20','14:10','20:35'],ac:'Airbus A321neo'},
  BKK:{seed:123,base:2460,tz:-1,d:[175,165],no:653,out:['08:00','12:25','19:10'],back:['10:55','15:30','21:40'],ac:'Airbus A330-300'},
  SIN:{seed:11,base:2780,tz:0,d:[230,235],no:711,out:['09:30','13:55','20:05'],back:['10:05','15:15','21:10'],ac:'Airbus A350-900'},
  LHR:{seed:57,base:8960,tz:-8,d:[845,780],no:255,out:['00:15','23:30'],back:['11:45','21:05'],ac:'Boeing 777-300ER'},
  SYD:{seed:31,base:7480,tz:3,d:[540,570],no:161,out:['10:15','20:40'],back:['07:30','21:55'],ac:'Airbus A350-1000'}
};
const CABINS={economy:{name:'Economy',k:1},premium:{name:'Premium Economy',k:1.85},business:{name:'Business',k:3.6}};
const FARES={
  economy:[
    {id:'light',name:'Light',add:0,miles:.15,inc:[[1,'Cabin baggage 1 × 7kg'],[1,'Checked baggage 1 × 23kg'],[0,'Seat selection (fee)'],[0,'Changes (fee)']],bag:'1 × 23kg bag'},
    {id:'essential',name:'Essential',add:.13,miles:.25,inc:[[1,'Cabin baggage 1 × 7kg'],[1,'Checked baggage 2 × 23kg'],[1,'Free standard seat selection'],[1,'Upgrade with Asia Miles']],bag:'2 × 23kg bags'},
    {id:'flex',name:'Flex',add:.38,miles:.35,inc:[[1,'Cabin baggage 1 × 7kg'],[1,'Checked baggage 2 × 23kg'],[1,'Free extra legroom seat'],[1,'Free changes']],bag:'2 × 23kg bags'}],
  premium:[
    {id:'essential',name:'Essential',add:0,miles:.3,inc:[[1,'Priority check-in'],[1,'2 checked bags'],[1,'Free seat selection'],[0,'Changes (fee)']],bag:'2 checked bags'},
    {id:'flex',name:'Flex',add:.22,miles:.4,inc:[[1,'Priority check-in'],[1,'2 checked bags'],[1,'Free seat selection'],[1,'Free changes']],bag:'2 checked bags'}],
  business:[
    {id:'light',name:'Light',add:0,miles:.35,inc:[[1,'Lounge access'],[1,'2 checked bags'],[1,'Free seat selection'],[0,'Changes (fee)']],bag:'2 checked bags'},
    {id:'essential',name:'Essential',add:.09,miles:.45,inc:[[1,'Lounge access'],[1,'2 checked bags'],[1,'Free seat selection'],[1,'Lower change fee']],bag:'2 checked bags'},
    {id:'flex',name:'Flex',add:.28,miles:.55,inc:[[1,'Lounge access'],[1,'2 checked bags'],[1,'Free seat selection'],[1,'Free changes']],bag:'2 checked bags'}]
};
const CARDS=['Visa •••• 4021','Mastercard •••• 8890'];
/* illustrative cancellation fee per passenger, charged at any time after booking (no free window) */
const CANCEL_FEES={economy:{light:1000,essential:600,flex:300},premium:{essential:800,flex:400},business:{light:1500,essential:1000,flex:500}};
const cancelFee=(fare,cabin)=>(CANCEL_FEES[cabin]||CANCEL_FEES.economy)[String(fare).toLowerCase()]||600;
const paxOf=p=>(String(p).match(/\d+/g)||['1']).reduce((a,b)=>a+(+b),0)||1;
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function gauss(r){let u=0,v=0;while(!u)u=r();while(!v)v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function history(seed,N,current){const r=rng(seed);let x=0,dip=0,dipLen=0;const out=[];
  for(let t=0;t<N;t++){x=0.9*x+gauss(r)*0.04;if(dipLen<=0&&r()<1/26){dip=-(0.10+r()*0.14);dipLen=1+Math.floor(r()*4)}
    const season=0.07*Math.sin((t/365)*2*Math.PI*2+1.1)+0.04*Math.sin((t/365)*2*Math.PI+0.3);
    const d=dipLen>0?dip:0;dipLen--;out.push(Math.exp(season+x+d));}
  const k=current/out[N-1];return out.map(v=>Math.round(v*k/10)*10);}
function chance(series,ratio,W){let hit=0,n=0;for(let s=0;s+W<series.length;s++){let m=Infinity;for(let j=s+1;j<=s+W;j++)m=Math.min(m,series[j]);n++;if(m/series[s]<=ratio)hit++}return n?hit/n:0}
const dayFactor=d=>[1.03,0.97,0.94,0.95,1,1.06,1.07][d.getDay()];
const timeFactor=(i,n)=>n===3?[0.97,1,1.04][i]:[1,1.03][i];

/* ---------- state ---------- */
const S={};
function resetState(){
  stopSim();
  Object.assign(S,{screen:'search',from:'HKG',to:'NRT',trip:'return',dep:'2027-01-14',ret:'2027-01-18',cabin:'economy',ad:1,ch:0,inf:0,promo:'',
    outIdx:1,retIdx:1,fare:'essential',range:90,target:null,watchDays:30,mode:'auto',notify:{app:true,wa:true,email:false},card:0,lock:null,booked:null,trips:[],jumpNext:false,paxOpen:false});
  histCache={};
}
const dest=()=>S.from==='HKG'?S.to:S.from;                 /* the non-HKG city */
const R=()=>ROUTES[dest()];
const rev=()=>S.from!=='HKG';                              /* travelling towards Hong Kong */
const paxN=()=>S.ad+S.ch+S.inf;
const paxK=()=>S.ad+S.ch*0.75+S.inf*0.1;
const paxText=()=>{const p=[S.ad+' Adult'+(S.ad>1?'s':'')];if(S.ch)p.push(S.ch+' Child'+(S.ch>1?'ren':''));if(S.inf)p.push(S.inf+' Infant'+(S.inf>1?'s':''));return p.join(', ')};
function fareList(){return FARES[S.cabin]}
function fareObj(id){const l=fareList();return l.find(f=>f.id===(id||S.fare))||l[0]}
function priceFor(opts){
  const o=Object.assign({dep:S.dep,outIdx:S.outIdx,retIdx:S.retIdx,fare:S.fare,cabin:S.cabin},opts||{});
  const r=R();const nOut=r.out.length;
  const t=S.trip==='return'?(timeFactor(o.outIdx,nOut)+timeFactor(o.retIdx,r.back.length))/2:timeFactor(o.outIdx,nOut);
  const f=(FARES[o.cabin].find(x=>x.id===o.fare)||FARES[o.cabin][0]).add;
  const oneway=S.trip==='return'?1:0.62;
  return Math.round(r.base*CABINS[o.cabin].k*(1+f)*dayFactor(pd(o.dep))*t*oneway*paxK()/10)*10;
}
const currentPrice=()=>priceFor();
let histCache={};
function hist(fid){fid=fid||S.fare;const k=dest()+S.cabin+fid+S.dep+S.trip+paxN()+S.outIdx+S.retIdx;if(!histCache[k])histCache[k]=history(R().seed,400,priceFor({fare:fid}));return histCache[k]}
function legs(){
  const r=R(),A=S.from,B=S.to;
  const mk=(dir,i)=>{const times=dir===0?r.out:r.back;const d=r.d[dir];const tz=dir===0?r.tz:-r.tz;
    const [h,m]=times[i].split(':').map(Number);let mins=h*60+m+d+tz*60;const plus=Math.floor(mins/1440);mins=((mins%1440)+1440)%1440;
    return {no:'CX '+(r.no+(dir===0?0:1)+i*2*0),dep:times[i],arr:String(Math.floor(mins/60)).padStart(2,'0')+':'+String(mins%60).padStart(2,'0')+(plus>0?'+1':''),dur:Math.floor(d/60)+'h '+String(d%60).padStart(2,'0')+'m',ac:r.ac}};
  /* out = HKG→dest unless travelling towards HKG */
  const outDir=rev()?1:0, backDir=rev()?0:1;
  return {out:(dir=>(i=>mk(dir,i)))(outDir),back:(dir=>(i=>mk(dir,i)))(backDir),nOut:(outDir===0?r.out:r.back).length,nBack:(backDir===0?r.out:r.back).length};
}
function flightNo(dir,i){const r=R();return 'CX '+(r.no+(dir?1:0)+i*10)}

/* ---------- render ---------- */
function setNav(n){$$('.nav button').forEach(b=>b.setAttribute('aria-current',b.dataset.nav===n?'page':'false'))}
function go(screen,keepScroll){S.screen=screen;render();const fc=main.firstElementChild;if(fc)fc.classList.add('anim');if(!keepScroll)window.scrollTo(0,0);try{main.focus({preventScroll:true})}catch(e){}}
function render(){
  setNav(S.screen==='trips'||S.screen==='booked'?'trips':S.screen==='watch'?'watch':'search');
  $('#navCount').hidden=!(S.lock&&!S.booked);
  ({search:renderSearch,select:renderSelect,lock:renderLock,watch:renderWatch,booked:renderBooked,trips:renderTrips})[S.screen]();
}
function stepper(n){const L=['Set your price','Confirm','Watching','Booked'];
  return '<div class="stepper" aria-label="FareLock progress">'+L.map((t,i)=>'<span class="'+(i+1<n?'done':i+1===n?'on':'')+'"'+(i+1===n?' aria-current="step"':'')+'><i>'+(i+1<n?'✓':i+1)+'</i>'+t+'</span>').join('<b aria-hidden="true"></b>')+'</div>'}
function routeLine(){return PLACES[S.from]+' ('+S.from+') '+(S.trip==='return'?'⇄':'→')+' '+PLACES[S.to]+' ('+S.to+')'}
function tripMeta(){return fS(pd(S.dep))+(S.trip==='return'?' – '+fS(pd(S.ret)):'')+' · '+paxText()+' · '+CABINS[S.cabin].name}
function legHTML(l,a,b){return '<div class="leg"><div><div class="t num">'+l.dep+'</div><div class="ap">'+a+'</div></div><div class="mid">'+l.dur+'<i></i>Non-stop · '+l.no+'</div><div style="text-align:right"><div class="t num">'+l.arr+'</div><div class="ap">'+b+'</div></div></div>'}

/* 1 · search */
function renderSearch(){
  const destOpts=S.from==='HKG'?Object.keys(ROUTES):['HKG'];
  const fromOpts=['HKG'].concat(Object.keys(ROUTES));
  const opt=(k,sel)=>'<option value="'+k+'"'+(k===sel?' selected':'')+'>'+PLACES[k]+' ('+k+')</option>';
  main.innerHTML='<div class="screen">'+
  '<section class="hero" aria-label="FareLock"><div class="txt"><span class="eyebrow">New on Cathay Pacific</span><h1>Set your price. We’ll book it.</h1><p class="muted">Search as usual. If the fare isn’t right yet, FareLock watches it for you and books the moment it reaches your price.</p><div><button class="link" id="howLink">How FareLock works →</button></div></div>'+
  '<div class="art" aria-hidden="true"><svg viewBox="0 0 600 260" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="ha" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><path d="M0,70 L50,62 L100,88 L150,80 L200,108 L250,100 L300,128 L350,120 L400,148 L450,168 L500,160 L550,182 L600,200 L600,260 L0,260Z" fill="url(#ha)"/><line x1="0" y1="190" x2="600" y2="190" stroke="#E7C98E" stroke-width="3" stroke-dasharray="12 9"/><polyline points="0,70 50,62 100,88 150,80 200,108 250,100 300,128 350,120 400,148 450,168 500,160 550,182 600,200" fill="none" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><circle cx="560" cy="186" r="12" fill="#fff"/><circle cx="560" cy="186" r="5" fill="#25714F"/></svg></div></section>'+
  '<div class="wtabs" aria-hidden="true"><span class="on"><svg width="16" height="16"><use href="#plane"/></svg>Book a trip</span><span class="off">Manage booking</span><span class="off">Check in</span><span class="off">Check flight status</span></div>'+
  '<form class="widget" id="sform" onsubmit="return false" aria-label="Book flights">'+
    '<div class="subtabs" aria-hidden="true"><span class="on">Book flights</span><span>Multi-city</span><span>Packages</span></div>'+
    '<div class="fgrid">'+
      '<div class="fld dd" style="position:relative"><label for="fFrom">Leaving from</label><select id="fFrom">'+fromOpts.map(k=>opt(k,S.from)).join('')+'</select><button type="button" class="swap" id="swap" aria-label="Swap leaving from and going to">⇄</button></div>'+
      '<div class="fld dd"><label for="fTo">Going to</label><select id="fTo">'+destOpts.map(k=>opt(k,S.to)).join('')+'</select></div>'+
      '<div class="fld dd"><label for="fTrip">Trip type</label><select id="fTrip"><option value="return"'+(S.trip==='return'?' selected':'')+'>Return</option><option value="oneway"'+(S.trip==='oneway'?' selected':'')+'>One way</option></select></div>'+
      '<div class="fld dd" style="position:relative"><button type="button" id="paxBtn" style="border:0;background:none;padding:0;text-align:left" aria-expanded="'+S.paxOpen+'" aria-controls="paxPanel"><span class="lb">Cabin class and passengers</span><span class="val" style="display:block">'+CABINS[S.cabin].name+', '+paxText()+'</span></button>'+paxPanel()+'</div>'+
      '<div class="fld"><label for="fDep">Departing on</label><span class="val" id="vDep">'+fW(pd(S.dep))+'</span><input id="fDep" class="dpick" type="date" min="'+iso(new Date(TODAY.getTime()+DAY))+'" value="'+S.dep+'"></div>'+
      '<div class="fld"'+(S.trip==='return'?'':' style="opacity:.45"')+'><label for="fRet">Returning on</label><span class="val" id="vRet">'+(S.trip==='return'?fW(pd(S.ret)):'One way')+'</span><input id="fRet" class="dpick" type="date" min="'+S.dep+'" value="'+S.ret+'"'+(S.trip==='return'?'':' disabled')+'></div>'+
    '</div>'+
    '<div class="offers"><span class="small muted">Latest offers:</span><button type="button" class="chip" id="offerFL">'+LK+' FareLock: set your price</button><span class="chip" aria-hidden="true">Student fares</span><span class="chip" aria-hidden="true">Asia Miles bonus</span></div>'+
    '<div class="wfoot"><div class="promo">'+(S.promoOpen?'<label class="small" for="fPromo">Promotion code</label><input id="fPromo" value="'+esc(S.promo)+'" autocomplete="off">':'<button type="button" class="link" id="promoBtn">Add a promotion code →</button>')+'</div><button class="btn" id="find" type="button">Search flights</button></div>'+
  '</form>'+
  '<section class="explain" id="explain" aria-label="How FareLock works"><div><b>1 · Set your price</b><span>The most you’ll pay in total. See today’s fare, its history and your chance of getting there.</span></div><div><b>2 · We track the fare</b><span>Every fare change on your trip, day and night, for up to a month.</span></div><div><b>3 · We book at your price</b><span>Approved once with Face ID or Touch ID. Final price check, then booked as a normal Cathay ticket.</span></div></section>'+
  '</div>';
  $('#fFrom').onchange=e=>{S.from=e.target.value;S.to=S.from==='HKG'?(S.to==='HKG'?'NRT':S.to):'HKG';clampIdx();renderSearch()};
  $('#fTo').onchange=e=>{S.to=e.target.value;clampIdx()};
  $('#swap').onclick=()=>{const a=S.from;S.from=S.to;S.to=a;renderSearch()};
  $('#fTrip').onchange=e=>{S.trip=e.target.value;renderSearch()};
  $('#paxBtn').onclick=()=>{S.paxOpen=!S.paxOpen;renderSearch();if(S.paxOpen){const f=$('#paxPanel button');f&&f.focus()}};
  bindPax();
  $('#fDep').onchange=e=>{if(!e.target.value)return;S.dep=e.target.value;if(pd(S.ret)<=pd(S.dep))S.ret=iso(new Date(pd(S.dep).getTime()+4*DAY));renderSearch()};
  $('#fRet').onchange=e=>{if(!e.target.value)return;S.ret=e.target.value;$('#vRet').textContent=fW(pd(S.ret))};
  $$('.dpick').forEach(i=>i.addEventListener('click',()=>{try{i.showPicker()}catch(e){}}));
  const pb=$('#promoBtn');if(pb)pb.onclick=()=>{S.promoOpen=true;renderSearch();$('#fPromo').focus()};
  const pi=$('#fPromo');if(pi)pi.oninput=e=>{S.promo=e.target.value};
  $('#offerFL').onclick=()=>{$('#explain').scrollIntoView({behavior:'smooth',block:'center'})};
  $('#howLink').onclick=()=>{$('#explain').scrollIntoView({behavior:'smooth',block:'center'})};
  $('#find').onclick=()=>{S.paxOpen=false;if(S.trip==='return'&&pd(S.ret)<=pd(S.dep))S.ret=iso(new Date(pd(S.dep).getTime()+4*DAY));S.fare=fareObj().id;go('select')};
}
function clampIdx(){const L=legs();S.outIdx=Math.min(S.outIdx,L.nOut-1);S.retIdx=Math.min(S.retIdx,L.nBack-1)}
function paxPanel(){
  if(!S.paxOpen)return '';
  const c=(k,label,sub,min,max)=>'<div class="counter"><div>'+label+'<small>'+sub+'</small></div><div class="ct"><button type="button" data-pk="'+k+'" data-d="-1" aria-label="Fewer '+label.toLowerCase()+'"'+(S[k]<=min?' disabled':'')+'>−</button><span aria-live="polite">'+S[k]+'</span><button type="button" data-pk="'+k+'" data-d="1" aria-label="More '+label.toLowerCase()+'"'+(S[k]>=max||paxN()>=9?' disabled':'')+'>+</button></div></div>';
  return '<div class="paxpanel" id="paxPanel" role="group" aria-label="Cabin class and passengers"><h3>Cabin class</h3><div class="cabins">'+Object.entries(CABINS).map(([k,v])=>'<button type="button" data-cabin="'+k+'" aria-pressed="'+(S.cabin===k)+'">'+v.name+'</button>').join('')+'</div><h3>Passengers</h3>'+
    c('ad','Adults','12+',1,9)+c('ch','Children','2 to 11',0,8)+c('inf','Infants','Under 2',0,S.ad)+
    '<button type="button" class="btn sm" id="paxDone">Done</button></div>';
}
function bindPax(){
  $$('[data-cabin]').forEach(b=>b.onclick=()=>{S.cabin=b.dataset.cabin;S.fare=fareObj().id;renderSearch()});
  $$('[data-pk]').forEach(b=>b.onclick=()=>{const k=b.dataset.pk;S[k]=Math.max(0,S[k]+(+b.dataset.d));if(S.inf>S.ad)S.inf=S.ad;renderSearch()});
  const d=$('#paxDone');if(d)d.onclick=()=>{S.paxOpen=false;renderSearch();$('#paxBtn').focus()};
}

/* 2 · select */
function renderSelect(){
  const L=legs(),dep=pd(S.dep);
  let strip='';for(let i=-3;i<=3;i++){const d=new Date(dep.getTime()+i*DAY);const ok=d>TODAY;
    strip+='<button data-d="'+iso(d)+'" aria-pressed="'+(i===0)+'"'+(ok?'':' disabled')+'><b>'+fS(d)+'</b><span class="num">'+(ok?hkd(priceFor({dep:iso(d),fare:fareList()[0].id})):'–')+'</span></button>'}
  const flRows=(dir)=>{const n=dir?L.nBack:L.nOut;const sel=dir?S.retIdx:S.outIdx;let h='';
    for(let i=0;i<n;i++){const l=dir?L.back(i):L.out(i);l.no=flightNo(dir^(rev()?1:0),i);
      const p=priceFor(dir?{retIdx:i,fare:fareList()[0].id}:{outIdx:i,fare:fareList()[0].id});
      h+='<button class="fl" data-dir="'+dir+'" data-i="'+i+'" aria-pressed="'+(i===sel)+'"><span class="rd" aria-hidden="true"></span>'+legHTML(l,dir?S.to:S.from,dir?S.from:S.to)+'<span class="pr"><small>'+l.ac+'</small><small>'+(S.trip==='return'?'Return from':'From')+'</small><b class="num">'+hkd(p)+'</b></span></button>'}
    return h};
  const fl=fareList();
  const cards=fl.map(f=>'<div class="fare" role="radio" tabindex="0" data-f="'+f.id+'" aria-checked="'+(f.id===S.fare)+'"><span class="rd" aria-hidden="true"></span><span class="nm">'+CABINS[S.cabin].name+'<b>'+f.name+'</b></span><ul>'+f.inc.map(([y,t])=>'<li class="'+(y?'':'no')+'"><span class="'+(y?'y':'n')+'" aria-hidden="true">'+(y?'✓':'–')+'</span>'+t+'</li>').join('')+'</ul><span class="pr num">'+hkd(priceFor({fare:f.id}))+'<small>Total, incl. taxes &amp; surcharges</small></span></div>').join('');
  const cp=currentPrice();
  main.innerHTML='<div class="screen">'+
  '<div class="sumbar"><span class="route">'+PLACES[S.from]+' to '+PLACES[S.to]+'</span><span class="meta">'+(S.trip==='return'?'Return':'One way')+' · '+tripMeta()+'</span><button class="link" id="modify">Edit search</button></div>'+
  '<div class="ibe-steps" aria-hidden="true"><span class="on">1 Flights</span><span>2 Passengers</span><span>3 Extras</span><span>4 Payment</span></div>'+
  '<div class="sect"><h2>Choose your departure flight</h2><span class="small muted">'+fD(dep)+' · lowest fare per date</span></div>'+
  '<div class="dates" id="dates" role="group" aria-label="Departure date">'+strip+'</div>'+
  '<div class="flist" role="radiogroup" aria-label="Departure flights">'+flRows(0)+'</div>'+
  (S.trip==='return'?'<div class="sect"><h2>Choose your return flight</h2><span class="small muted">'+fD(pd(S.ret))+'</span></div><div class="flist" style="border-top:1px solid var(--line)" role="radiogroup" aria-label="Return flights">'+flRows(1).replace('class="fl"','class="fl" style="border-top:0"')+'</div>':'')+
  '<div class="sect"><h2>Choose your fare</h2><span class="small muted">'+CABINS[S.cabin].name+' · '+paxText()+'</span></div>'+
  '<div class="fares'+(fl.length===2?' two':'')+'" id="fares" role="radiogroup" aria-label="Fare type">'+cards+'</div>'+
  '<div class="decide">'+
    '<div class="flcta"><div class="ic"><svg aria-hidden="true"><use href="#lock"/></svg></div><div><div class="row" style="gap:8px"><h3>Not the price you want?</h3><span class="tag new">FareLock</span></div><p>Set your price. FareLock watches this trip and books it the moment the fare reaches your price.</p><button class="btn" id="setPrice">Set my price</button></div></div>'+
    '<div class="total"><span class="small muted">Total for '+paxText().toLowerCase()+'</span><span class="big num">'+hkd(cp)+'</span><span class="tiny muted">Incl. taxes &amp; surcharges · '+CABINS[S.cabin].name+' '+fareObj().name+' · earn about '+n0(Math.round(cp*fareObj().miles/10)*10)+' Asia Miles</span><button class="btn ghost" style="margin-top:8px" id="bookNow">Continue</button><span class="hold">Want to keep today’s fare while you decide? Hold your fare for 72 hours (fee applies).</span></div>'+
  '</div></div>';
  $('#modify').onclick=()=>go('search');
  $$('#dates button').forEach(b=>b.onclick=()=>{if(b.disabled)return;const old=pd(S.dep),nd=pd(b.dataset.d);S.dep=b.dataset.d;S.ret=iso(new Date(pd(S.ret).getTime()+(nd-old)));renderSelect()});
  $$('.fl').forEach(b=>b.onclick=()=>{if(b.dataset.dir==='1')S.retIdx=+b.dataset.i;else S.outIdx=+b.dataset.i;renderSelect()});
  $$('#fares .fare').forEach(b=>{b.onclick=()=>{S.fare=b.dataset.f;renderSelect()};b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();b.click()}}});
  $('#setPrice').onclick=()=>{S.target=null;go('lock')};
  $('#bookNow').onclick=()=>openModal('<h2 id="mTitle">Book at today’s fare?</h2><p class="muted" style="margin-top:10px">'+hkd(cp)+' for '+routeLine()+', '+tripMeta()+'. Paid with '+CARDS[S.card]+'.</p><div class="row" style="margin-top:18px;gap:10px"><button class="btn ghost" id="mNo" style="flex:1">Not yet</button><button class="btn" id="mYes" style="flex:1.4">Book for '+hkd(cp)+'</button></div>',()=>{$('#mNo').onclick=closeModal;$('#mYes').onclick=()=>{closeModal();bookNow(cp,'Your trip is booked',false)}});
}

/* 3 · set your price */
function rangeStats(){const w=hist().slice(-S.range);return{w,lo:Math.min(...w),hi:Math.max(...w),avg:w.reduce((a,b)=>a+b,0)/w.length}}
function chartSVG(series,opt){
  const W=640,H=opt.h||240,pl=8,pr=64,pt=16,pb=26;
  const lo=Math.min(...series,opt.target||Infinity),hi=Math.max(...series);
  const span=(hi-lo)||1,ylo=lo-span*.12,yhi=hi+span*.1;
  const X=i=>pl+i*(W-pl-pr)/Math.max(1,series.length-1),Y=v=>pt+(yhi-v)/(yhi-ylo)*(H-pt-pb);
  let s='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(opt.label)+'"><defs><linearGradient id="g'+opt.id+'" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#367878" stop-opacity=".22"/><stop offset="1" stop-color="#367878" stop-opacity="0"/></linearGradient></defs>';
  for(let k=0;k<=4;k++){const v=ylo+(yhi-ylo)*k/4,y=Y(v);s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y+'" y2="'+y+'" stroke="#ECEFEC"/>';if(!(opt.target&&Math.abs(y-Y(opt.target))<16))s+='<text x="'+(W-pr+8)+'" y="'+(y+4)+'" font-size="11" fill="#7A7F7B">'+n0(Math.round(v/10)*10)+'</text>'}
  (opt.xlabels||[]).forEach(([i,t])=>{s+='<text x="'+X(i)+'" y="'+(H-6)+'" font-size="11" fill="#7A7F7B" text-anchor="middle">'+t+'</text>'});
  const pts=series.map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1));
  s+='<path d="M'+pts.join(' L')+' L'+X(series.length-1)+','+(H-pb)+' L'+X(0)+','+(H-pb)+'Z" fill="url(#g'+opt.id+')"/>';
  s+='<polyline points="'+pts.join(' ')+'" fill="none" stroke="#2C4036" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
  if(opt.marks){const iLo=series.indexOf(Math.min(...series)),iHi=series.indexOf(Math.max(...series));
    s+='<circle cx="'+X(iLo)+'" cy="'+Y(series[iLo])+'" r="4" fill="#25714F" stroke="#fff" stroke-width="2"/><text x="'+X(iLo)+'" y="'+(Y(series[iLo])+18)+'" font-size="11" fill="#25714F" text-anchor="middle">Low '+n0(series[iLo])+'</text>';
    s+='<circle cx="'+X(iHi)+'" cy="'+Y(series[iHi])+'" r="4" fill="#A2382C" stroke="#fff" stroke-width="2"/><text x="'+X(iHi)+'" y="'+(Y(series[iHi])-9)+'" font-size="11" fill="#A2382C" text-anchor="middle">High '+n0(series[iHi])+'</text>'}
  if(opt.target){const y=Y(opt.target);s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y+'" y2="'+y+'" stroke="#B5862E" stroke-width="2" stroke-dasharray="6 5"/><rect x="'+(W-pr+2)+'" y="'+(y-11)+'" width="'+(pr-2)+'" height="22" fill="#8A6417"/><text x="'+(W-pr+33)+'" y="'+(y+4)+'" font-size="11" fill="#fff" text-anchor="middle">'+n0(opt.target)+'</text>'+(opt.labelLeft?'<text x="'+(pl+4)+'" y="'+(y+16)+'" font-size="11.5" fill="#8A6417">Your price</text>':'<text x="'+(W-pr-6)+'" y="'+(y-7)+'" font-size="11.5" fill="#8A6417" text-anchor="end">Your price</text>')}
  const li=series.length-1;s+='<circle cx="'+X(li)+'" cy="'+Y(series[li])+'" r="9" fill="#2C4036" fill-opacity=".12"/><circle cx="'+X(li)+'" cy="'+Y(series[li])+'" r="4.5" fill="'+(opt.hitColor&&opt.target&&series[li]<=opt.target?'#25714F':'#2C4036')+'" stroke="#fff" stroke-width="2"/>';
  s+='<line class="xh" x1="0" x2="0" y1="'+pt+'" y2="'+(H-pb)+'" stroke="#2D2D2D" stroke-opacity=".25" style="display:none"/></svg>';
  return{svg:s,X,Y,W,H,pl,pr};
}
function histXLabels(n){const out=[];const step=n<=30?7:n<=90?21:61;for(let i=n-1;i>=0;i-=step){const d=new Date(TODAY.getTime()-(n-1-i)*DAY);out.push([i,n<=90?fDM(d):MON[d.getMonth()]])}return out}
function drawHist(){
  const st=rangeStats();
  const c=chartSVG(st.w,{id:'h',label:'Fare history for this trip over the last '+(S.range===365?'year':S.range+' days'),target:S.target,marks:true,xlabels:histXLabels(st.w.length)});
  const box=$('#hchart');box.innerHTML=c.svg+'<div class="tip" id="htip"></div>';
  $('#sLo').textContent=hkd(st.lo);$('#sHi').textContent=hkd(st.hi);$('#sAvg').textContent=hkd(st.avg);
  const svg=box.querySelector('svg'),tip=$('#htip'),xh=svg.querySelector('.xh');
  svg.addEventListener('pointermove',e=>{const r=svg.getBoundingClientRect();const x=(e.clientX-r.left)/r.width*c.W;let i=Math.round((x-c.pl)/((c.W-c.pl-c.pr)/(st.w.length-1)));i=Math.max(0,Math.min(st.w.length-1,i));
    const d=new Date(TODAY.getTime()-(st.w.length-1-i)*DAY);xh.style.display='';xh.setAttribute('x1',c.X(i));xh.setAttribute('x2',c.X(i));
    tip.style.left=(c.X(i)/c.W*100)+'%';tip.style.top=(c.Y(st.w[i])/c.H*100)+'%';tip.textContent=fS(d)+' · '+hkd(st.w[i]);tip.style.opacity=1});
  svg.addEventListener('pointerleave',()=>{tip.style.opacity=0;xh.style.display='none'});
}
function oddsFor(fid,t){const cp=priceFor({fare:fid});if(t>=cp)return 1;return chance(hist(fid),t/cp,S.watchDays)}
const oddsNow=()=>oddsFor(S.fare,S.target);
const ALT={economy:{essential:['light','with one checked bag instead of two'],flex:['essential','without free changes']},premium:{flex:['essential','without free changes']},business:{essential:['light','with standard change rules'],flex:['essential','without free changes']}};
function updateOdds(){
  const cp=currentPrice(),t=S.target,h=hist(),lo1y=Math.min(...h.slice(-365));
  const pct=Math.round(oddsNow()*100);
  $('#tVal').value=n0(t);$('#tRange').value=t;
  const m=$('#oddsBar');m.style.width=pct+'%';m.style.background=pct>=60?'var(--ok)':pct>=30?'#C08A1E':'var(--bad)';
  $('#oddsPct').textContent=pct+'%';
  $('#oddsTxt').textContent='Chance the fare reaches your price in the next '+(S.watchDays===7?'week':S.watchDays===14?'2 weeks':'month');
  let note='';
  if(t>=cp)note='<div class="note info" role="status">✓ Today’s fare is already at or below your price. You can book it now.</div>';
  else if(t<lo1y)note='<div class="note warn" role="status">⚠ This is below the lowest fare of the past year ('+hkd(lo1y)+'). It’s unlikely to happen.</div>';
  else if(pct<30)note='<div class="note warn" role="status">⚠ Possible, but unlikely in this time. Try a little higher or watch for longer.</div>';
  $('#tNote').innerHTML=note;
  $('#until').textContent='Watching until '+fD(new Date(TODAY.getTime()+S.watchDays*DAY));
  $('#start').textContent=t>=cp?'Book now for '+hkd(cp):'Start FareLock at '+hkd(t);
  $('#saveTxt').textContent=t<cp?'That’s '+hkd(cp-t)+' ('+Math.round((cp-t)/cp*100)+'%) below today’s fare.':'';
  drawHist();
}
function priceBounds(){const cp=currentPrice();return{min:Math.floor(cp*0.6/50)*50,max:cp}}
function setTarget(v){const b=priceBounds();S.target=Math.max(b.min,Math.min(b.max,Math.round(v/10)*10));updateOdds()}
function setFare(fid,keepTarget){const t=S.target;S.fare=fid;renderLock(keepTarget?t:null)}
function renderLock(keepT){
  const cp=currentPrice(),h=hist(),lo3m=Math.min(...h.slice(-90)),b=priceBounds(),f=fareObj();
  if(keepT!=null)S.target=Math.min(keepT,cp);
  if(S.target==null||S.target>cp)S.target=Math.round(cp*0.93/50)*50;
  if(S.target<b.min)S.target=b.min;
  main.innerHTML='<div class="screen"><div class="crumb"><button class="link" id="back">← Back to flights</button></div>'+stepper(1)+
  '<div class="row between wrap" style="margin-bottom:16px"><div><div class="row" style="gap:10px"><h1>Set your price</h1><span class="tag new">FareLock</span></div><p class="muted small" style="margin-top:6px">'+routeLine()+' · '+tripMeta()+' · '+f.name+' ('+f.bag+')</p></div></div>'+
  '<div class="lockgrid">'+
    '<section class="box pad" aria-label="Today’s price and history">'+
      '<div class="today"><div><p class="small muted">Today’s price</p><p class="big num">'+hkd(cp)+'</p><p class="tiny muted" style="margin-top:6px">'+(S.trip==='return'?'Return':'One way')+' · '+paxText()+' · incl. taxes &amp; surcharges</p></div>'+
      '<div class="seg" id="rangeSeg" role="group" aria-label="History range"><button data-r="30" aria-pressed="'+(S.range===30)+'">1M</button><button data-r="90" aria-pressed="'+(S.range===90)+'">3M</button><button data-r="365" aria-pressed="'+(S.range===365)+'">1Y</button></div></div>'+
      '<div class="ftype"><span class="tiny muted">Fare</span><div class="seg" id="fareSeg" role="group" aria-label="Fare type" style="grid-template-columns:repeat('+fareList().length+',1fr)">'+fareList().map(x=>'<button data-f="'+x.id+'" aria-pressed="'+(x.id===S.fare)+'">'+x.name+'</button>').join('')+'</div></div>'+
      '<div class="chart" id="hchart"></div>'+
      '<div class="stats"><div class="stat"><div class="l">Lowest</div><div class="v num" id="sLo"></div></div><div class="stat"><div class="l">Highest</div><div class="v num" id="sHi"></div></div><div class="stat"><div class="l">Average</div><div class="v num" id="sAvg"></div></div></div>'+
      '<p class="tiny muted" style="margin-top:12px">History for your dates, flights and '+CABINS[S.cabin].name+' '+f.name+' fare, so baggage is already included.</p>'+
      '<div class="how"><div><i>Step 1</i><b>Set your price</b><span>The most you’ll pay, all-in</span></div><div><i>Step 2</i><b>We track the fare</b><span>Every change, day and night</span></div><div><i>Step 3</i><b>We book at your price</b><span>The moment the fare reaches it</span></div></div>'+
    '</section>'+
    '<section class="box pad" aria-label="Your price">'+
      '<h2 style="font-size:20px">Your price</h2><p class="tiny muted" style="margin:2px 0 12px">The most you’ll pay in total, incl. taxes &amp; surcharges</p>'+
      '<div class="yp"><button id="minus" aria-label="Lower by 50">−</button><div class="val"><span>HKD</span><input id="tVal" inputmode="numeric" aria-label="Your price in HKD"></div><button id="plus" aria-label="Raise by 50">+</button></div>'+
      '<input type="range" id="tRange" min="'+b.min+'" max="'+b.max+'" step="10" aria-label="Your price"><div class="rangelbl"><span class="num">'+hkd(b.min)+'</span><span class="num">Today '+hkd(b.max)+'</span></div>'+
      '<p class="tiny" id="saveTxt" style="margin-top:6px;color:var(--teal)"></p>'+
      '<div class="quick"><button class="chip" data-q="0.95">5% lower</button><button class="chip" data-q="0.9">10% lower</button><button class="chip" data-q="lo3m">3-month low · '+hkd(lo3m)+'</button></div>'+
      '<div class="odds" aria-live="polite"><div class="row between"><span class="small" id="oddsTxt"></span><b class="num" id="oddsPct"></b></div><div class="meter"><i id="oddsBar"></i></div><p class="tiny muted">Based on how often this trip’s fare fell this much within the same time over the past year.</p></div>'+
      '<div id="tNote"></div>'+
      '<p class="lbl">Watch for</p><p class="help">If your price isn’t reached, we stop. You pay nothing.</p>'+
      '<div class="seg" id="watchSeg" role="group" aria-label="Watch for"><button data-w="7" aria-pressed="'+(S.watchDays===7)+'">1 week</button><button data-w="14" aria-pressed="'+(S.watchDays===14)+'">2 weeks</button><button data-w="30" aria-pressed="'+(S.watchDays===30)+'">1 month</button></div><p class="tiny" style="margin-top:6px;color:var(--teal)" id="until"></p>'+
      '<p class="lbl">When the fare reaches your price</p>'+
      '<button class="opt" data-m="auto" aria-pressed="'+(S.mode==='auto')+'"><span class="rd" aria-hidden="true"></span><span><b>Book it for me automatically</b><span>Fastest. Good fares can sell out in minutes.</span></span></button>'+
      '<button class="opt" data-m="ask" aria-pressed="'+(S.mode==='ask')+'"><span class="rd" aria-hidden="true"></span><span><b>Ask me first</b><span>We notify you and hold the fare for 30 minutes.</span></span></button>'+
      '<p class="lbl">Updates</p><p class="help">We’ll tell you once: when it’s booked.</p><div class="quick" style="margin-top:4px"><button class="chip ntf" data-n="app" aria-pressed="'+!!S.notify.app+'">Cathay app</button><button class="chip ntf" data-n="wa" aria-pressed="'+!!S.notify.wa+'">WhatsApp</button><button class="chip ntf" data-n="email" aria-pressed="'+!!S.notify.email+'">Email</button></div>'+
      '<div class="paywith"><span class="cardico" aria-hidden="true"></span><label class="sr" for="card">Pay with</label><select id="card">'+CARDS.map((c,i)=>'<option value="'+i+'"'+(i===S.card?' selected':'')+'>Pay with '+c+'</option>').join('')+'</select></div>'+
      '<div class="fine"><div>Nothing is charged until we book</div><div>Stop it free, any time before it books</div><div>Once booked, cancelling has a fee, even within 24 hours</div><div>You pay the same public fare everyone sees</div></div>'+
      '<button class="btn block" id="start"></button>'+
    '</section>'+
  '</div></div>';
  $('#back').onclick=()=>go('select');
  $$('#rangeSeg button').forEach(x=>x.onclick=()=>{S.range=+x.dataset.r;$$('#rangeSeg button').forEach(y=>y.setAttribute('aria-pressed',y===x));drawHist()});
  $$('#fareSeg button').forEach(x=>x.onclick=()=>{if(x.dataset.f!==S.fare)setFare(x.dataset.f,false)});
  $('#minus').onclick=()=>setTarget(S.target-50);
  $('#plus').onclick=()=>setTarget(S.target+50);
  $('#tRange').oninput=e=>setTarget(+e.target.value);
  $('#tVal').onchange=e=>{const v=parseInt(e.target.value.replace(/[^0-9]/g,''),10);if(v)setTarget(v);else updateOdds()};
  $$('.quick .chip[data-q]').forEach(x=>x.onclick=()=>setTarget(x.dataset.q==='lo3m'?lo3m:currentPrice()*parseFloat(x.dataset.q)));
  $$('#watchSeg button').forEach(x=>x.onclick=()=>{S.watchDays=+x.dataset.w;$$('#watchSeg button').forEach(y=>y.setAttribute('aria-pressed',y===x));updateOdds()});
  $$('.opt').forEach(x=>x.onclick=()=>{S.mode=x.dataset.m;$$('.opt').forEach(y=>y.setAttribute('aria-pressed',y===x))});
  $$('.ntf').forEach(x=>x.onclick=()=>{const k=x.dataset.n;S.notify[k]=!S.notify[k];if(!S.notify.app&&!S.notify.wa&&!S.notify.email)S.notify.app=true;$$('.ntf').forEach(y=>y.setAttribute('aria-pressed',S.notify[y.dataset.n]?'true':'false'))});
  $('#card').onchange=e=>{S.card=+e.target.value};
  $('#start').onclick=()=>{if(S.target>=currentPrice()){bookNow(currentPrice(),'Your trip is booked',false);return}confirmModal()};
  updateOdds();
}
function notifyText(){const n=[];if(S.notify.app)n.push('Cathay app');if(S.notify.wa)n.push('WhatsApp');if(S.notify.email)n.push('Email');return n.join(', ')}
function confirmModal(){
  const until=new Date(TODAY.getTime()+S.watchDays*DAY),f=fareObj();
  openModal('<div class="row" style="gap:8px;color:var(--green)">'+LK+'<h2 id="mTitle">Confirm your FareLock</h2></div>'+
   '<dl class="kv" style="margin-top:16px"><dt>Trip</dt><dd>'+S.from+' '+(S.trip==='return'?'⇄':'→')+' '+S.to+' · '+fDM(pd(S.dep))+(S.trip==='return'?' – '+fDM(pd(S.ret)):'')+'</dd><dt>Passengers</dt><dd>'+paxText()+'</dd><dt>Fare</dt><dd>'+CABINS[S.cabin].name+' '+f.name+'</dd><dt>Your price</dt><dd style="color:var(--gold)">'+hkd(S.target)+' or less</dd><dt>Watch until</dt><dd>'+fD(until)+'</dd><dt>When reached</dt><dd>'+(S.mode==='auto'?'Book automatically':'Ask me first')+'</dd><dt>If you cancel</dt><dd>'+hkd(cancelFee(f.name,S.cabin))+' fee per passenger once booked, at any time</dd><dt>Updates</dt><dd>'+notifyText()+'</dd><dt>Pay with</dt><dd>'+CARDS[S.card]+'</dd></dl>'+
   '<div class="faceid"><div class="ring" id="ring"><svg aria-hidden="true"><use href="#face"/></svg></div><div><b id="fidT" style="font-weight:500">Confirm with Face ID or Touch ID</b><p class="tiny muted">Nothing is charged until we book.</p></div></div>'+
   '<div class="row" style="margin-top:16px;gap:10px"><button class="btn ghost" id="mCancel" style="flex:1">Cancel</button><button class="btn" id="mOk" style="flex:1.4">Confirm</button></div>',
   ()=>{$('#mCancel').onclick=closeModal;$('#mOk').onclick=async()=>{$('#mOk').disabled=true;await sleep(900);$('#ring').classList.add('ok');$('#fidT').textContent='FareLock is on';await sleep(800);closeModal();startLock()}});
}

/* 4 · watching */
let simTimer=null;
function stopSim(){if(simTimer){clearTimeout(simTimer);simTimer=null}}
function startLock(){const cp=currentPrice();
  S.lock={start:cp,now:cp,target:S.target,series:[cp],feed:[{d:'Today',p:cp,t:'FareLock started'}],tick:0,state:'watching',path:makePath(cp,S.target),checks:0};
  S.booked=null;go('watch')}
function makePath(start,target){const r=rng(5);const n=16,out=[];for(let i=1;i<=n;i++){const base=start-(start-target)*Math.pow(i/n,1.1);const noise=(r()-.45)*start*0.022;out.push(Math.round((i===n?target-30:Math.max(target+20,base+noise))/10)*10)}return out}
const simDate=i=>new Date(TODAY.getTime()+Math.ceil(i*0.6)*DAY);
function renderWatch(){
  const L=S.lock;
  if(!L){main.innerHTML='<div class="screen"><div class="empty"><h2>No FareLocks yet</h2><p class="muted">Search for a trip, then choose “Set my price”.</p><button class="btn" id="gs">Book a trip</button></div></div>';$('#gs').onclick=()=>go('search');return}
  if(S.booked&&L.state==='booked'){go('booked');return}
  const gap=Math.max(0,L.now-L.target),prog=Math.min(100,Math.max(0,(L.start-L.now)/(L.start-L.target)*100)),f=fareObj();
  main.innerHTML='<div class="screen"><div class="crumb"></div>'+stepper(3)+
  '<div class="lockgrid">'+
  '<section class="box pad" aria-label="My FareLock">'+
    '<div class="row between wrap" style="align-items:flex-start"><div><p class="small muted">My FareLock</p><h2>'+PLACES[S.from]+' '+(S.trip==='return'?'⇄':'→')+' '+PLACES[S.to]+'</h2><p class="small muted">'+tripMeta()+' · '+f.name+'</p></div>'+
      '<span class="tag '+(L.state==='booking'?'warn':'live')+'" id="wpill"><span class="dot"></span>'+(L.state==='booking'?'Booking…':'Watching')+'</span></div>'+
    '<div class="trio"><div><div class="l">Lowest fare now</div><div class="v num" id="wNow">'+hkd(L.now)+'</div></div><div><div class="l">Your price</div><div class="v t num">'+hkd(L.target)+'</div></div><div><div class="l">To go</div><div class="v g num" id="wGap">'+hkd(gap)+'</div></div></div>'+
    '<div class="prog" aria-hidden="true"><i id="wProg" style="width:'+prog+'%"></i></div><div class="row between tiny muted wrap"><span>Started at '+hkd(L.start)+'</span><span>Watching until '+fS(new Date(TODAY.getTime()+S.watchDays*DAY))+'</span></div>'+
    '<div class="chart" id="wchart"></div><div id="wproc" aria-live="polite"></div>'+
    '<div class="wactions"><button class="btn" id="bookCur">Book now for '+hkd(L.now)+'</button><button class="btn ghost" id="edit">Edit price</button><button class="btn ghost" id="stop">Stop watching</button></div>'+
    '<div class="sim" id="simBox"><span>Demo: skip ahead to see FareLock work.</span><button class="btn ghost sm" id="simDrop">Fare drops</button><button class="btn ghost sm" id="simJump">Fare jumps at checkout</button></div>'+
  '</section>'+
  '<div class="side">'+
    '<section class="box pad"><h3>What happens next</h3><ul class="small muted" style="margin:10px 0 0;padding-left:18px;display:flex;flex-direction:column;gap:6px"><li>We check every fare change for your trip, day and night.</li><li>The moment it reaches '+hkd(L.target)+', we '+(S.mode==='auto'?'book it with '+CARDS[S.card]:'notify you to approve')+'.</li><li>If the fare changes while booking, we don’t book. We keep watching.</li><li>You’ll hear from us once, by '+notifyText()+': when it’s booked.</li></ul></section>'+
    '<section class="box pad"><div class="row between"><h3>Activity</h3><span class="tiny muted" id="checks">Checked '+n0(L.checks)+' times</span></div><ul class="feed" id="feed"></ul></section>'+
  '</div></div></div>';
  drawWatch();drawFeed();
  $('#bookCur').onclick=approveCurrent;
  $('#edit').onclick=()=>{stopSim();S.target=L.target;S.lock=null;go('lock')};
  $('#stop').onclick=()=>openModal('<h2 id="mTitle">Stop watching?</h2><p class="muted" style="margin-top:10px">Your FareLock ends now. Nothing has been charged.</p><div class="row" style="margin-top:18px;gap:10px"><button class="btn ghost" id="mNo" style="flex:1">Keep watching</button><button class="btn" id="mYes" style="flex:1.2">Stop watching</button></div>',()=>{$('#mNo').onclick=closeModal;$('#mYes').onclick=()=>{closeModal();stopSim();S.lock=null;showToast('FareLock stopped. Nothing was charged.');go('select')}});
  $('#simDrop').onclick=()=>{S.jumpNext=false;runSim(380)};
  $('#simJump').onclick=()=>{S.jumpNext=true;runSim(380)};
}
function drawWatch(){const L=S.lock;if(!L||!$('#wchart'))return;const ser=L.series.length>1?L.series:[L.series[0],L.series[0]];
  $('#wchart').innerHTML=chartSVG(ser,{id:'w',h:200,label:'Lowest fare since FareLock started',target:L.target,hitColor:true,labelLeft:true,xlabels:[[0,'Started'],[ser.length-1,ser.length>2?fS(simDate(L.tick)):'Now']]}).svg}
function drawFeed(){const L=S.lock,f=$('#feed');if(!f||!L)return;f.innerHTML=L.feed.slice().reverse().map((x,i)=>'<li class="'+(x.c||'')+(i===0&&L.feed.length>1?' fresh':'')+'"><span class="d">'+x.d+'</span><span>'+x.t+'</span><span class="p num">'+hkd(x.p)+'</span></li>').join('')}
function updWatch(){const L=S.lock;if(!$('#wNow'))return;$('#wNow').textContent=hkd(L.now);$('#wGap').textContent=hkd(Math.max(0,L.now-L.target));
  $('#wProg').style.width=Math.min(100,Math.max(0,(L.start-L.now)/(L.start-L.target)*100))+'%';$('#bookCur').textContent='Book now for '+hkd(L.now);$('#checks').textContent='Checked '+n0(L.checks)+' times';drawWatch();drawFeed()}
function lockButtons(dis){['#bookCur','#edit','#stop','#simDrop','#simJump'].forEach(s=>{const b=$(s);if(b)b.disabled=dis})}
function runSim(speed){
  const L=S.lock;if(!L||L.state!=='watching')return Promise.resolve();
  stopSim();lockButtons(true);const bc=$('#bookCur');if(bc)bc.disabled=false;
  return new Promise(resolve=>{
    const step=()=>{
      if(!S.lock||S.lock!==L||L.state!=='watching'){resolve();return}
      if(!L.path.length){lockButtons(false);resolve();return}
      const v=L.path.shift();L.tick++;L.now=v;L.series.push(v);L.checks+=37+(L.tick*11)%23;
      const hit=v<=L.target;
      L.feed.push({d:fDM(simDate(L.tick)),p:v,t:hit?'Your price is here':(v<L.series[L.series.length-2]?'Fare dropped':'Fare rose'),c:hit?'hit':''});
      updWatch();
      if(hit){resolve(onHit(v));return}
      simTimer=setTimeout(step,speed||420);
    };
    simTimer=setTimeout(step,250);
  });
}
async function onHit(v){
  const L=S.lock;
  if(S.mode==='ask'){return new Promise(res=>{openModal('<div class="row" style="gap:8px;color:var(--green)">'+LK+'<h2 id="mTitle">Your price is here</h2></div><p class="muted" style="margin-top:10px">'+PLACES[S.from]+' '+(S.trip==='return'?'⇄':'→')+' '+PLACES[S.to]+' is now <b style="color:var(--ok);font-weight:500">'+hkd(v)+'</b>, at or below your price of '+hkd(L.target)+'. We’re holding it for 30 minutes.</p><div class="row" style="margin-top:18px;gap:10px"><button class="btn ghost" id="mKeep" style="flex:1">Keep watching</button><button class="btn" id="mBook" style="flex:1.4">Book for '+hkd(v)+'</button></div>',
    ()=>{$('#mKeep').onclick=()=>{closeModal();lockButtons(false);res()};$('#mBook').onclick=async()=>{closeModal();await bookingProcess(v,false);res()}})})}
  const jump=S.jumpNext;S.jumpNext=false;return bookingProcess(v,jump);
}
async function bookingProcess(v,jump){
  const L=S.lock;L.state='booking';const pill=$('#wpill');if(pill){pill.className='tag warn';pill.innerHTML='<span class="dot"></span>Booking…'}
  lockButtons(true);
  const steps=['Fare of '+hkd(v)+' found','Final price check','Paying with '+CARDS[S.card],'Ticket issued'];
  const box=$('#wproc');box.innerHTML='<div class="process"><b class="small" style="font-weight:500">Booking your trip</b><ol>'+steps.map(s=>'<li><span class="s" aria-hidden="true"></span><span>'+s+'</span></li>').join('')+'</ol></div>';
  const lis=$$('#wproc li');
  for(let i=0;i<lis.length;i++){
    lis[i].className='run';await sleep(i===0?500:850);
    if(i===1&&jump){const nv=L.target+40;lis[i].className='bad';lis[i].querySelector('.s').textContent='!';lis[i].lastChild.textContent='Fare changed to '+hkd(nv)+' at checkout';
      for(let k=i+1;k<lis.length;k++)lis[k].style.opacity=.4;await sleep(700);
      box.insertAdjacentHTML('beforeend','<div class="banner warn">⚠ The fare went up to '+hkd(nv)+' while booking, above your price. We didn’t book or charge you. Still watching.</div>');
      L.feed.push({d:fDM(simDate(L.tick)),p:nv,t:'Changed at checkout · not booked',c:'jump'});
      L.now=nv;L.series.push(nv);L.state='watching';updWatch();
      const p=$('#wpill');if(p){p.className='tag live';p.innerHTML='<span class="dot"></span>Watching'}
      L.path=[L.target+20,L.target+60,L.target+10,L.target-60];await sleep(2200);return runSim(560);
    }
    lis[i].className='ok';lis[i].querySelector('.s').textContent='✓';
  }
  await sleep(500);bookNow(v,'FareLock booked your trip',true);
}
function approveCurrent(){
  const L=S.lock,v=L.now,over=v-L.target;
  openModal('<h2 id="mTitle">Book at today’s fare?</h2><p class="muted" style="margin-top:10px">The lowest fare now is <b style="font-weight:500;color:var(--ink)">'+hkd(v)+'</b>'+(over>0?', '+hkd(over)+' above your price.':'.')+' Booking now ends your FareLock.</p><div class="row" style="margin-top:18px;gap:10px"><button class="btn ghost" id="mKeep" style="flex:1">Keep watching</button><button class="btn" id="mBook" style="flex:1.4">Book for '+hkd(v)+'</button></div>',
   ()=>{$('#mKeep').onclick=closeModal;$('#mBook').onclick=()=>{closeModal();stopSim();bookNow(v,'Booked at today’s fare',false)}});
}
function bookNow(v,msg,auto){
  stopSim();const start=S.lock?S.lock.start:currentPrice();
  const when=S.lock?new Date(simDate(S.lock.tick).getTime()+7.7*3600000):new Date();
  const r=rng(Math.round(v)+dest().charCodeAt(0));const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let ref='';for(let i=0;i<6;i++)ref+=a[Math.floor(r()*a.length)];
  const f=fareObj();const miles=Math.round(v*f.miles/10)*10;
  const LL=legs();const lo=LL.out(S.outIdx);lo.no=flightNo(rev()?1:0,S.outIdx);let lb=null;if(S.trip==='return'){lb=LL.back(S.retIdx);lb.no=flightNo(rev()?0:1,S.retIdx)}
  S.booked={legOut:lo,legBack:lb,price:v,saved:Math.max(0,start-v),ref,when,auto:!!auto,miles,from:S.from,to:S.to,trip:S.trip,dep:S.dep,ret:S.ret,cabin:S.cabin,fare:f.name,inc:f.inc.filter(x=>x[0]).map(x=>x[1]),pax:paxText(),card:CARDS[S.card],status:'Confirmed',added:{},outIdx:S.outIdx,retIdx:S.retIdx};
  S.trips=[S.booked].concat(S.trips.filter(t=>t.ref!==ref));
  if(S.lock)S.lock.state='booked';
  go('booked');
  showToast('<b style="font-weight:500">'+msg+'</b><br>'+PLACES[S.from]+' '+(S.trip==='return'?'⇄':'→')+' '+PLACES[S.to]+' · '+hkd(v)+(start-v>0?' · '+hkd(start-v)+' below the fare when you started':''),5200);
}

/* 5 · booked + trips */
const EXTRAS=[{k:'seat',ic:'◫',t:'Extra legroom seat',s:'More room on your flight',cta:'Add',done:'Added ✓'},{k:'bag',ic:'▣',t:'Extra baggage',s:'Cheaper now than at the airport',cta:'Add',done:'Added ✓'},{k:'bid',ic:'↑',t:'Upgrade Bid',s:'Bid for Premium Economy on this trip',cta:'Bid',done:'Bid placed ✓'}];
function tm(d){return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')}
function renderBooked(){
  const B=S.booked;if(!B){go('trips');return}
  const o=B.legOut;
  let backHTML='';if(B.trip==='return'&&B.legBack){const b=B.legBack;backHTML='<div class="fl bleg"><div><div class="small" style="color:var(--teal)">Return</div><div class="tiny muted">'+fD(pd(B.ret))+'</div></div>'+legHTML(b,B.to,B.from)+'</div>'}
  main.innerHTML='<div class="screen"><div class="crumb"></div>'+(B.auto?stepper(5):'')+
  '<div class="lockgrid">'+
  '<section class="box pad" style="display:flex;flex-direction:column;gap:16px" aria-label="Booking confirmation">'+
    '<div class="okhead"><div class="tick" aria-hidden="true">✓</div><div><h2>'+(B.status==='Cancelled'?'Booking cancelled':'Your trip is booked')+'</h2><p class="small muted">'+(B.status==='Cancelled'?'Refunded '+hkd(B.refund)+' to '+B.card+' after a '+hkd(B.fee)+' cancellation fee':B.auto?'Booked by FareLock on '+fD(B.when)+' at '+tm(B.when):'Booked just now')+'</p></div></div>'+
    '<div class="row between" style="padding:12px 14px;background:var(--panel-2);border:1px solid var(--line-2)"><span class="small muted">Booking reference</span><span class="ref">'+B.ref+'</span></div>'+
    '<div style="border:1px solid var(--line)"><div class="fl bleg" style="border-top:0"><div><div class="small" style="color:var(--teal)">Depart</div><div class="tiny muted">'+fD(pd(B.dep))+'</div></div>'+legHTML(o,B.from,B.to)+'</div>'+backHTML+'</div>'+
    '<dl class="kv"><dt>Passengers</dt><dd>Kiki Chan'+(B.pax!=='1 Adult'?' + guests ('+B.pax+')':' · 1 Adult')+'</dd><dt>Fare</dt><dd>'+CABINS[B.cabin].name+' '+B.fare+'</dd><dt>Included</dt><dd>'+B.inc.join(', ')+'</dd><dt>Paid</dt><dd class="num">'+hkd(B.price)+' <span class="tiny muted">incl. taxes &amp; surcharges</span></dd><dt>Paid with</dt><dd>'+B.card+'</dd><dt>Asia Miles</dt><dd>You’ll earn about '+n0(B.miles)+'</dd></dl>'+
    (B.saved>0&&B.status!=='Cancelled'?'<div class="saved">'+LK+'<span>You saved '+hkd(B.saved)+' compared with the fare when you started.</span></div>':'')+
    (B.status==='Cancelled'?'':'<div class="row wrap" style="gap:10px"><button class="btn" id="mng">Manage booking</button><button class="btn ghost" id="cancelFree">Change or cancel</button></div>')+
  '</section>'+
  '<aside class="side"><section class="box pad"><h3>'+(B.saved>0&&B.status!=='Cancelled'?'Spend your saving':'Complete your trip')+'</h3><p class="small muted" style="margin:4px 0 12px">'+(B.saved>0&&B.status!=='Cancelled'?'You saved '+hkd(B.saved)+'. Add extras now, while they’re available.':'Add extras now, while they’re available.')+'</p><div class="addons">'+
    EXTRAS.map(x=>{const inc=x.k==='seat'&&B.fare==='Flex';return '<button class="addon" data-add="'+x.k+'" aria-pressed="'+(!!B.added[x.k])+'"'+(inc?' disabled':'')+'><span class="ai" aria-hidden="true">'+x.ic+'</span><span><b>'+x.t+'</b><span>'+(inc?'Included in your Flex fare':x.s)+'</span></span><span class="go">'+(inc?'Included':B.added[x.k]?x.done:x.cta)+'</span></button>'}).join('')+
  '</div><p class="basket">'+(Object.keys(B.added).filter(k=>B.added[k]).length?'Added to your booking: '+EXTRAS.filter(x=>B.added[x.k]).map(x=>x.t).join(', ')+'. Pay in Manage booking.':'')+'</p></section></aside></div></div>';
  const c=$('#cancelFree');if(c)c.onclick=()=>openModal('<h2 id="mTitle">Cancel this booking?</h2><p class="muted" style="margin-top:10px">This is a normal Cathay Pacific ticket on '+CABINS[B.cabin].name+' '+B.fare+' fare rules. Cancelling costs '+hkd(cancelFee(B.fare,B.cabin))+' per passenger, the same at any time, including the first 24 hours after booking.</p><p class="muted" style="margin-top:8px">You’d get '+hkd(B.price-cancelFee(B.fare,B.cabin)*paxOf(B.pax))+' back to '+B.card+'. To change dates instead, use Manage booking; the fare’s change fee applies.</p><div class="row" style="margin-top:18px;gap:10px"><button class="btn ghost" id="mNo" style="flex:1">Keep booking</button><button class="btn" id="mYes" style="flex:1.2">Cancel booking</button></div>',()=>{$('#mNo').onclick=closeModal;$('#mYes').onclick=()=>{closeModal();B.fee=cancelFee(B.fare,B.cabin)*paxOf(B.pax);B.refund=B.price-B.fee;B.status='Cancelled';if(S.lock)S.lock=null;showToast('Booking '+B.ref+' cancelled. '+hkd(B.refund)+' refunded after the '+hkd(B.fee)+' cancellation fee.');renderBooked()}});
  const m=$('#mng');if(m)m.onclick=()=>go('trips');
  $$('.addon').forEach(x=>x.onclick=()=>{const k=x.dataset.add;B.added[k]=!B.added[k];renderBooked()});
}
function renderTrips(){
  if(!S.trips.length){main.innerHTML='<div class="screen"><div class="empty"><h2>No trips yet</h2><p class="muted">Trips you book, or FareLock books for you, appear here.</p><button class="btn" id="gs">Book a trip</button></div></div>';$('#gs').onclick=()=>go('search');return}
  main.innerHTML='<div class="screen"><div class="crumb"></div><h1 style="margin-bottom:16px">My trips</h1><div style="display:flex;flex-direction:column;gap:12px">'+S.trips.map((t,i)=>'<div class="box pad row between wrap"><div><p class="small muted">'+t.ref+' · '+t.status+(t.auto?' · booked by FareLock':'')+'</p><h3>'+PLACES[t.from]+' '+(t.trip==='return'?'⇄':'→')+' '+PLACES[t.to]+'</h3><p class="small muted">'+fS(pd(t.dep))+(t.trip==='return'?' – '+fS(pd(t.ret)):'')+' · '+t.pax+' · '+CABINS[t.cabin].name+' '+t.fare+' · '+hkd(t.price)+'</p></div><button class="btn ghost sm" data-t="'+i+'">View booking</button></div>').join('')+'</div></div>';
  $$('[data-t]').forEach(b=>b.onclick=()=>{S.booked=S.trips[+b.dataset.t];go('booked')});
}

/* ---------- modal / toast ---------- */
let lastFocus=null;
function openModal(html,bind){lastFocus=document.activeElement;$('#modal').innerHTML=html;$('#scrim').classList.add('open');bind&&bind();const f=$('#modal button:last-of-type');f&&f.focus()}
function closeModal(){$('#scrim').classList.remove('open');if(lastFocus&&lastFocus.focus)try{lastFocus.focus()}catch(e){}}
$('#scrim').addEventListener('click',e=>{if(e.target.id==='scrim'&&!playing)closeModal()});
let toastT=null;
function showToast(html,ms){$('#toastText').innerHTML=html;$('#toast').classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>$('#toast').classList.remove('show'),ms||3400)}

/* ---------- nav ---------- */
$$('.nav button').forEach(b=>b.onclick=()=>{if(playing)return;const n=b.dataset.nav;if(n==='watch')go(S.lock&&S.lock.state==='booked'?'booked':'watch');else go(n)});
$('#home').onclick=e=>{e.preventDefault();if(!playing)go('search')};
document.addEventListener('click',e=>{if(S.paxOpen&&S.screen==='search'&&!e.target.closest('#paxPanel')&&!e.target.closest('#paxBtn')){S.paxOpen=false;renderSearch()}});

/* ---------- demo ---------- */
let playing=false;const cur=$('#cursor');
async function point(el){if(!el)return;el.scrollIntoView({block:'center',behavior:'smooth'});await sleep(450);const r=el.getBoundingClientRect();cur.style.left=(r.left+r.width/2)+'px';cur.style.top=(r.top+r.height/2)+'px';await sleep(700)}
async function tap(sel){const el=typeof sel==='string'?$(sel):sel;if(!el||!playing)return;await point(el);cur.classList.remove('click');void cur.offsetWidth;cur.classList.add('click');await sleep(180);el.click();await sleep(350)}
function endPlay(){playing=false;document.body.classList.remove('playing');$('#dPlay').textContent='▶ Play the full demo'}
async function play(){
  if(playing){endPlay();stopSim();return}
  playing=true;document.body.classList.add('playing');$('#demoPanel').hidden=true;
  cur.style.left=(innerWidth*0.6)+'px';cur.style.top=(innerHeight*0.7)+'px';
  closeModal();resetState();render();window.scrollTo(0,0);await sleep(1400);
  await point($('#fTo'));await sleep(300);await point($('#paxBtn'));await sleep(300);
  await tap('#find');await sleep(1200);if(!playing)return;
  await point($('.fl[data-dir="0"][aria-pressed="true"]'));await sleep(300);
  await point($('.fare[data-f="essential"]'));await sleep(500);
  await tap('#setPrice');await sleep(1100);if(!playing)return;
  await tap('#rangeSeg [data-r="365"]');await sleep(1300);
  await tap('#rangeSeg [data-r="90"]');await sleep(700);
  const rg=$('#tRange');await point(rg);
  const from=S.target,to=Math.round(currentPrice()*0.87/50)*50;
  for(let i=1;i<=24&&playing;i++){setTarget(from+(to-from)*i/24);const r=rg.getBoundingClientRect();const p=(S.target-rg.min)/(rg.max-rg.min);cur.style.transition='none';cur.style.left=(r.left+p*r.width)+'px';await sleep(55)}
  cur.style.transition='';await sleep(1200);if(!playing)return;
  await tap('#watchSeg [data-w="30"]');await sleep(400);
  await tap('.opt[data-m="auto"]');await sleep(400);
  await tap('#start');await sleep(500);
  await tap('#mOk');await sleep(2200);if(!playing)return;
  S.jumpNext=true;await sleep(600);await runSim(330);
  while(playing&&S.screen!=='booked')await sleep(200);
  await sleep(3800);if(!playing)return;
  await tap('.addon[data-add="seat"]');await sleep(1600)
  endPlay();
}
function demoDrop(jump){
  if(playing)return;$('#demoPanel').hidden=true;
  if(!S.lock||S.lock.state!=='watching'){resetState();S.target=Math.round(currentPrice()*0.87/50)*50;startLock()}
  if(S.screen!=='watch')go('watch');
  S.jumpNext=!!jump;runSim(380);
}
$('#demoBtn').onclick=()=>{const p=$('#demoPanel');p.hidden=!p.hidden;$('#demoBtn').setAttribute('aria-expanded',String(!p.hidden))};
$('#dPlay').onclick=play;
$('#dDrop').onclick=()=>demoDrop(false);
$('#dJump').onclick=()=>demoDrop(true);
$('#dReset').onclick=()=>{endPlay();resetState();closeModal();go('search');$('#demoPanel').hidden=true};
document.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea'))return;const k=e.key.toLowerCase();
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  if(k==='p')play();else if(k==='d')demoDrop(false);else if(k==='j')demoDrop(true);else if(k==='r')$('#dReset').click();else if(k==='h')document.body.classList.toggle('rec');else if(k==='escape'){closeModal();if(S.paxOpen){S.paxOpen=false;renderSearch()}}});

resetState();render();
if(location.hash==='#play')setTimeout(play,600);
if(location.hash==='#rec')document.body.classList.add('rec');
window.__farelock={S,play,go,currentPrice,priceFor,oddsFor,hist};
})();
