(function(){
var NAMES={KF:"Kingdom Finders",KS:"Kingdom Seekers",CO:"Coordinators"};
var GRADES=[["Children (under 13)",0,12],["Teens (13–17)",13,17],["Youth (18–30)",18,30],["Adults (31+)",31,200]];
function grade(a){for(var i=0;i<GRADES.length;i++)if(a>=GRADES[i][1]&&a<=GRADES[i][2])return GRADES[i][0];return GRADES[3][0]}
function $(id){return document.getElementById(id)}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
var KEY="seekYeFirst.mine",person=null,adminRows=[],pinVal="";
function screen(id){["s-form","s-spin","s-done","s-admin"].forEach(function(s){$(s).hidden=s!==id});
 var wide=id==="s-admin";$("mwrap").classList.toggle("admin",wide);$("hwrap").classList.toggle("admin",wide);$("org").parentNode.hidden=wide;window.scrollTo(0,0)}
/* every server call is one POST to /api/youth (proxied to zentrivacoop.com) */
function api(body){return fetch("/api/youth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
 .catch(function(){throw new Error("No connection. Check your internet and try again.")})
 .then(function(r){return r.json().catch(function(){return{}}).then(function(d){if(!r.ok)throw new Error(d.error||"Something went wrong.");return d})})}
function msg(e){return String(e&&e.message||e).replace(/^Exception:\s*/,"").replace(/^Error:\s*/,"")}

/* wheel */
var SEG=8,rot=$("rot"),angle=0,html="";
for(var i=0;i<SEG;i++){var a0=(i*45-90)*Math.PI/180,a1=((i+1)*45-90)*Math.PI/180,r=190,k=i%2?"KS":"KF";
 html+='<path d="M200 200 L'+(200+r*Math.cos(a0))+' '+(200+r*Math.sin(a0))+' A190 190 0 0 1 '+(200+r*Math.cos(a1))+' '+(200+r*Math.sin(a1))+' Z" fill="'+(k==="KF"?"var(--find)":"var(--seek)")+'" stroke="#fff" stroke-width="3"/>'
 +'<text transform="rotate('+(i*45+22.5)+' 200 200)" x="200" y="62" fill="#fff" text-anchor="middle" font-family="Cinzel,serif" font-weight="700" font-size="15">'+(k==="KF"?"FINDERS":"SEEKERS")+'</text>'}
rot.innerHTML=html+'<circle cx="200" cy="200" r="190" fill="none" stroke="#d9a441" stroke-width="8"/>';
function setA(){rot.setAttribute("transform","rotate("+angle+" 200 200)")}
var free=false,last=0;
function loop(t){if(!free)return;if(last)angle+=(t-last)*0.72;last=t;setA();requestAnimationFrame(loop)}
function startFree(){free=true;last=0;requestAnimationFrame(loop)}
function landOn(code){return new Promise(function(done){
 free=false;var opts=[];for(var i=0;i<SEG;i++)if((i%2?"KS":"KF")===code)opts.push(i);
 var seg=opts[Math.floor(Math.random()*opts.length)],target=seg*45+22.5+(Math.random()-.5)*28;
 var cur=((angle%360)+360)%360,d=(360-target)-cur;while(d<0)d+=360;
 var from=angle,dist=d+720,T=matchMedia("(prefers-reduced-motion: reduce)").matches?200:2800,t0=0;
 function step(t){if(!t0)t0=t;var p=Math.min(1,(t-t0)/T),e=1-Math.pow(1-p,3);angle=from+dist*e;setA();if(p<1)requestAnimationFrame(step);else done()}
 requestAnimationFrame(step)})}

/* result */
var current=null;
function showResult(r){
 r.name=String(r.name).toUpperCase(); /* badges saved on this device before names were capitalised */
 current=r;$("badge").innerHTML=badgeSVG(r);
 $("tcHead").textContent=r.existing?"You're already registered. Here is your badge":"Welcome! Here is your badge";
 $("saveNote").textContent="Save your badge and show it at the desk.";
 try{localStorage.setItem(KEY,JSON.stringify(r))}catch(e){}
 screen("s-done")}


/* ---- unique conference badge (seeded by tag + name) ---- */
function hash(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function prng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function fit(text,max,width,ratio){return Math.min(max,Math.floor(width/(Math.max(1,text.length)*ratio)))}
function badgeSVG(r){
 var rnd=prng(hash(r.tag+"|"+r.name.toLowerCase())),KF=r.code==="KF",CO=r.code==="CO";
 var main=CO?"#8a6a2c":KF?"#1d4e9e":"#b8202b",deep=CO?"#3d3020":KF?"#12336e":"#7c121a",sky=CO?"#3d3020":KF?"#163f86":"#9a1a24",gold="#d9a441";
 var u=String(r.tag).replace(/[^A-Za-z0-9]/g,""),parts=r.name.split(" "),first=parts[0],rest=parts.slice(1).join(" ");
 var o='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" role="img" aria-label="Badge for '+esc(r.name)+'">';
 o+='<defs><clipPath id="cb'+u+'"><rect width="600" height="900" rx="30"/></clipPath><clipPath id="top'+u+'"><rect x="0" y="0" width="600" height="300"/></clipPath></defs>';
 o+='<g clip-path="url(#cb'+u+')"><rect width="600" height="900" fill="#fbf7ee"/>';
 /* header band: unique faded landscape (sun, mountains, hills, birds) */
 o+='<defs><linearGradient id="sk'+u+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+sky+'"/><stop offset="1" stop-color="'+main+'"/></linearGradient><radialGradient id="sg'+u+'"><stop offset="0" stop-color="#f4d18a" stop-opacity=".6"/><stop offset="1" stop-color="#f4d18a" stop-opacity="0"/></radialGradient></defs>';
 o+='<rect width="600" height="300" fill="url(#sk'+u+')"/><g clip-path="url(#top'+u+')">';
 var sx=rnd()<.5?60+rnd()*90:450+rnd()*90,sy=200+rnd()*40;
 o+='<circle cx="'+sx+'" cy="'+sy+'" r="150" fill="url(#sg'+u+')"/><circle cx="'+sx+'" cy="'+sy+'" r="'+(34+rnd()*14)+'" fill="#f4d18a" fill-opacity=".3"/>';
 var m="M0 300 L0 "+(230+rnd()*30),mx=0;while(mx<600){mx+=60+rnd()*70;m+=" L"+Math.min(600,mx-30-rnd()*10)+" "+(150+rnd()*70)+" L"+Math.min(600,mx)+" "+(215+rnd()*40)}
 o+='<path d="'+m+' L600 300Z" fill="#fff" fill-opacity=".07"/>';
 [[250,26,".09","#fff"],[272,18,".16","#000"]].forEach(function(L){var y0=L[0],amp=L[1],ph=rnd()*6.28,f=.008+rnd()*.008,d="M0 300";
  for(var x=0;x<=600;x+=20)d+=" L"+x+" "+(y0-amp*Math.sin(x*f+ph)).toFixed(1);o+='<path d="'+d+' L600 300Z" fill="'+L[3]+'" fill-opacity="'+L[2]+'"/>'});
 var nb=2+Math.floor(rnd()*3);o+='<g fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="2.2" stroke-linecap="round">';
 for(var k=0;k<nb;k++){var bx0=(rnd()<.5?24+rnd()*70:486+rnd()*70),by0=110+rnd()*80,w2=5+rnd()*5;o+='<path d="M'+bx0+' '+by0+' q'+w2+' -'+(w2*.8)+' '+(2*w2)+' 0 q'+w2+' -'+(w2*.8)+' '+(2*w2)+' 0"/>'}
 o+='</g>';
o+='</g><rect y="292" width="600" height="8" fill="'+gold+'"/>';
 /* faded wheat sprig, seeded */
 var lx=500+rnd()*50;o+='<g opacity=".14" fill="'+main+'" stroke="'+main+'" stroke-width="3"><path d="M'+lx+' 828 Q'+(lx+8)+' 760 '+(lx-4)+' 700" fill="none"/>';
 for(var q=0;q<5;q++){var yy=712+q*24,sd=q%2?1:-1;o+='<ellipse cx="'+(lx+sd*9)+'" cy="'+yy+'" rx="6" ry="15" transform="rotate('+(sd*28)+' '+(lx+sd*9)+' '+yy+')"/>'}
 o+='</g>';
 /* lanyard slot */
 o+='<rect x="250" y="26" width="100" height="18" rx="9" fill="#fbf7ee"/>';
 o+='<text x="300" y="96" text-anchor="middle" fill="#fff" font-family="Source Sans 3,Arial,sans-serif" font-weight="700" font-size="19" letter-spacing="2">CHARITY TABERNACLE CHRISTIAN ASSEMBLY</text>';
 o+='<text x="300" y="130" text-anchor="middle" fill="#fff" fill-opacity=".9" font-family="Source Sans 3,Arial,sans-serif" font-size="20">Youth and Children Program</text>';
 o+='<text x="300" y="186" text-anchor="middle" fill="#f4d18a" font-family="Cinzel,Georgia,serif" font-weight="700" font-size="30">Seek Ye First</text>';
 o+='<text x="300" y="222" text-anchor="middle" fill="#f4d18a" font-family="Cinzel,Georgia,serif" font-weight="700" font-size="30">The Kingdom Of God</text>';
 o+='<text x="300" y="262" text-anchor="middle" fill="#fff" fill-opacity=".8" font-family="Source Sans 3,Arial,sans-serif" font-size="16" font-style="italic">Matthew 6:33</text>';
 /* name */
 o+='<text x="300" y="384" text-anchor="middle" fill="#1d1a16" font-family="Cinzel,Georgia,serif" font-weight="700" font-size="'+fit(first,76,520,.72)+'">'+esc(first)+'</text>';
 o+='<text x="300" y="436" text-anchor="middle" fill="#4a433a" font-family="Source Sans 3,Arial,sans-serif" font-weight="600" font-size="'+fit(rest,38,520,.55)+'">'+esc(rest)+'</text>';
 var gl=(r.grade||grade(r.age)).replace(/ \(.*\)/,"");
 var pl=CO?"Program Coordinator":gl+" · Participant",pw=pl.length*11.5+48;
 o+='<rect x="'+(300-pw/2)+'" y="458" width="'+pw+'" height="38" rx="19" fill="'+main+'" fill-opacity=".12"/>';
 o+='<text x="300" y="484" text-anchor="middle" fill="'+deep+'" font-family="Source Sans 3,Arial,sans-serif" font-weight="700" font-size="19">'+esc(pl)+'</text>';
 /* group + tag block */
 o+='<rect x="40" y="524" width="520" height="168" rx="20" fill="'+main+'"/>';
 o+='<text x="300" y="568" text-anchor="middle" fill="#fff" font-family="Source Sans 3,Arial,sans-serif" font-weight="700" font-size="22" letter-spacing="1">'+esc(CO?"COORDINATOR":r.group.toUpperCase())+'</text>';
 o+='<rect x="120" y="584" width="360" height="90" rx="14" fill="#fff"/>';
 o+='<text x="300" y="652" text-anchor="middle" fill="#1d1a16" font-family="Cinzel,Georgia,serif" font-weight="700" font-size="64" letter-spacing="3">'+esc(r.tag)+'</text>';
 /* unique barcode */
 var bx=110,bars="";while(bx<490){var w=1+Math.floor(rnd()*5);if(rnd()<.62)bars+='<rect x="'+bx+'" y="720" width="'+w+'" height="56" fill="#1d1a16"/>';bx+=w+1+Math.floor(rnd()*3)}
 o+=bars+'<text x="300" y="800" text-anchor="middle" fill="#6b645a" font-family="Source Sans 3,Arial,sans-serif" font-size="16" letter-spacing="4">'+esc(r.tag)+' · '+String(hash(r.tag+r.name)).slice(-6)+'</text>';
 /* footer */
 o+='<rect y="828" width="600" height="72" fill="'+deep+'"/><rect y="828" width="600" height="5" fill="'+gold+'"/>';
 o+='<text x="300" y="872" text-anchor="middle" fill="#fff" font-family="Source Sans 3,Arial,sans-serif" font-size="17" font-style="italic">“…and all these things shall be added unto you.”</text>';
 return o+'</g></svg>'}
$("saveBadge").addEventListener("click",function(){
 if(!current)return;var svg=badgeSVG(current),img=new Image();
 img.onload=function(){var c=document.createElement("canvas");c.width=1200;c.height=1800;var x=c.getContext("2d");x.drawImage(img,0,0,1200,1800);
  var url=c.toDataURL("image/png"),a=document.createElement("a");a.href=url;a.download="CTCA-Badge-"+current.tag+".png";document.body.appendChild(a);
  try{a.click()}catch(e){}a.remove();
  $("badge").innerHTML='<img alt="Badge for '+esc(current.name)+'" src="'+url+'">';
  $("saveNote").textContent="If it didn't download, press and hold the badge and choose Save image (or take a screenshot)."};
 img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg)});

/* form — same name rules as the server (shared/youthRepo.js cleanPerson), which stays the enforcement */
var PART_RE=null,LETTER_RE=null;try{PART_RE=new RegExp("^\\p{L}[\\p{L}\\p{M}'’.-]*$","u");LETTER_RE=new RegExp("\\p{L}","gu")}catch(e){}
function nameError(name){
 var full="Please enter your full name (first and last).",parts=name?name.split(" "):[];
 if(name.length>80)return "Please shorten your name to 80 characters or fewer.";
 if(!PART_RE)return parts.length<2?full:"";
 for(var i=0,words=0;i<parts.length;i++){if(!PART_RE.test(parts[i]))return "Please use letters only in your name (no numbers or symbols).";
  if((parts[i].match(LETTER_RE)||[]).length>=2)words++}
 return words<2?full:""}
$("f").addEventListener("submit",function(e){e.preventDefault();
 var name=$("name").value.replace(/\s+/g," ").trim().toUpperCase(),rawAge=$("age").value.trim(),age=/^\d{1,3}$/.test(rawAge)?parseInt(rawAge,10):NaN,g=document.querySelector("input[name=g]:checked");
 $("ferr").textContent="";
 var nerr=nameError(name);if(nerr)return $("ferr").textContent=nerr;
 if(!(age>=1&&age<=120))return $("ferr").textContent="Please enter a valid age (a whole number).";
 if(!g)return $("ferr").textContent="Please choose a gender.";
 person={name:name,age:age,gender:g.value};$("go").disabled=true;$("go").textContent="Checking…";
 api({action:"lookup",name:name,age:age}).then(function(d){var hit=d.registrant;
  $("go").disabled=false;$("go").textContent=$("coordBox").open?"Get my badge":"Continue to spin";
  if(hit)return showResult(hit);
  var cc=$("coordBox").open?$("ccode").value.trim():"";
  if($("coordBox").open&&!cc){$("ferr").textContent="Enter your coordinator code, or close \"I'm a coordinator\".";return}
  if(cc){$("go").disabled=true;$("go").textContent="Creating badge…";
   return api({action:"coordinator",name:name,age:age,gender:g.value,code:cc}).then(function(d){var r=d.registrant;$("go").disabled=false;$("go").textContent=$("coordBox").open?"Get my badge":"Continue to spin";showResult(r)})}
  $("who").textContent=name;$("serr").textContent="";$("spin").disabled=false;$("back").hidden=false;screen("s-spin")
 }).catch(function(err){$("go").disabled=false;$("go").textContent=$("coordBox").open?"Get my badge":"Continue to spin";$("ferr").textContent=msg(err)})});
$("back").addEventListener("click",function(){screen("s-form")});
$("spin").addEventListener("click",function(){
 $("spin").disabled=true;$("back").hidden=true;$("serr").textContent="";startFree();
 var minWait=new Promise(function(r){setTimeout(r,1200)});
 Promise.all([api({action:"spin",name:person.name,age:person.age,gender:person.gender}),minWait]).then(function(v){
  var res=v[0].registrant;return landOn(res.code).then(function(){setTimeout(function(){showResult(res)},500)})
 }).catch(function(err){free=false;$("serr").textContent=msg(err)+" Please try again.";$("spin").disabled=false;$("back").hidden=false})});
$("coordBox").addEventListener("toggle",function(){$("go").textContent=$("coordBox").open?"Get my badge":"Continue to spin"});
$("another").addEventListener("click",function(){$("coordBox").open=false;try{localStorage.removeItem(KEY)}catch(e){}$("f").reset();screen("s-form");$("name").focus()});

/* organiser */
$("org").addEventListener("click",function(){$("adminView").hidden=true;$("pinBox").hidden=false;$("perr").textContent="";screen("s-admin");$("pin").focus()});
function closeAdmin(){var m=null;try{m=JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){}if(m)showResult(m);else screen("s-form")}
$("pclose").addEventListener("click",closeAdmin);$("aclose").addEventListener("click",closeAdmin);
function loadAdmin(){$("pgo").disabled=$("refresh").disabled=true;
 return api({action:"groups",pin:pinVal}).then(function(d){adminRows=d.registrants;renderAdmin();$("pinBox").hidden=true;$("adminView").hidden=false})
 .catch(function(err){$("perr").textContent=msg(err)}).then(function(){$("pgo").disabled=$("refresh").disabled=false})}
$("pf").addEventListener("submit",function(e){e.preventDefault();pinVal=$("pin").value;loadAdmin()});
$("refresh").addEventListener("click",loadAdmin);
function renderAdmin(){
 ["KF","KS","CO"].forEach(function(c){var l=adminRows.filter(function(r){return r.code===c}).sort(function(a,b){return a.tag<b.tag?-1:1});
  $("h"+c).textContent=NAMES[c]+" ("+l.length+")";
  $("l"+c).innerHTML=l.map(function(r){return "<li><b>"+esc(r.tag)+"</b> "+esc(r.name)+" <span>· "+r.age+" · "+esc(r.gender)+"</span></li>"}).join("")||'<li class="note">No one yet</li>'});
 var out="";GRADES.forEach(function(g){["Male","Female"].forEach(function(s){
  var f=0,k=0;adminRows.forEach(function(r){if(grade(r.age)===g[0]&&r.gender===s){if(r.code==="KF")f++;else if(r.code==="KS")k++}});
  if(f||k)out+="<tr><td>"+g[0]+"</td><td>"+s+'</td><td class="n">'+f+'</td><td class="n">'+k+"</td></tr>"})});
 $("bal").innerHTML=out||'<tr><td colspan="4" class="note">No registrations yet.</td></tr>'}
$("copy").addEventListener("click",function(){
 var txt=["KF","KS","CO"].map(function(c){var l=adminRows.filter(function(r){return r.code===c}).sort(function(a,b){return a.tag<b.tag?-1:1});
  return NAMES[c]+" ("+l.length+")\n"+l.map(function(r){return r.tag+"  "+r.name}).join("\n")}).join("\n\n");
 var ta=document.createElement("textarea");ta.value=txt;document.body.appendChild(ta);ta.select();
 var ok=false;try{ok=document.execCommand("copy")}catch(e){}ta.remove();$("copied").textContent=ok?"Copied.":"Copy blocked — select the lists instead."});

/* returning visitor sees their card */
try{var mine=JSON.parse(localStorage.getItem(KEY)||"null");if(mine&&mine.tag)showResult(mine)}catch(e){}
})();
