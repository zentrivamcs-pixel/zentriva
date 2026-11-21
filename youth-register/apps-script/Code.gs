/**
 * CHARITY TABERNACLE CHRISTIAN ASSEMBLY — Youth & Children Program
 * Theme: Seek Ye First The Kingdom Of God — self-registration, grouping wheel, ID badges
 * Single-file Google Apps Script web app.
 *
 * SETUP (5 minutes)
 * 1. Create a new Google Sheet (name it e.g. "Seek Ye First Registrations").
 * 2. Extensions > Apps Script. Delete what's there, paste this whole file, Save.
 * 3. Project Settings (gear icon) > Script properties > add ADMIN_PIN (6+ digits)
 *    and COORD_CODE. Give COORD_CODE only to coordinators.
 * 4. Deploy > New deployment > type "Web app".
 *      Execute as: Me      Who has access: Anyone
 *    Click Deploy, authorise, and copy the Web app URL. Share that link.
 * 5. Registrations appear in the "Registrants" tab of the Sheet.
 *    File > Download > Microsoft Excel (.xlsx) for an Excel copy any time.
 *
 * 6. To show it at https://ctca.zentrivacoop.com/register, paste the Web app URL
 *    into youth-register/register.html and deploy that folder as its own
 *    Vercel project (see youth-register/DEPLOY.md).
 *
 * After editing this file later: Deploy > Manage deployments > Edit (pencil)
 * > Version: New version > Deploy. The link stays the same.
 */

// Secrets live in Project Settings > Script properties (never in this file — the repo is public):
//   ADMIN_PIN   organiser PIN for the Groups view (6+ digits)
//   COORD_CODE  code coordinators enter to get a Coordinator badge
function secret_(k) {
  const v = PropertiesService.getScriptProperties().getProperty(k);
  if (!v) throw new Error('Not set up yet: add ' + k + ' under Project Settings > Script properties.');
  return v;
}
const SHEET_NAME = 'Registrants';
const GROUPS = { KF: 'Kingdom Finders', KS: 'Kingdom Seekers' };
const COORD = 'Coordinator';
const HEADERS = ['Tag', 'Full Name', 'Age', 'Gender', 'Age Grade', 'Group', 'Registered At'];
const GRADES = [['Children (under 13)', 0, 12], ['Teens (13–17)', 13, 17], ['Youth (18–30)', 18, 30], ['Adults (31+)', 31, 200]];

function doGet() {
  return HtmlService.createHtmlOutput(PAGE)
    .setTitle('CTCA Youth & Children Program')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ---------- server functions called from the page ---------- */

// Returns the existing record for this person, or null.
function lookup(name, age) {
  const p = clean_(name, age, 'Male');
  const hit = rows_(sheet_()).find(r => key_(r.name) === key_(p.name) && r.age === p.age);
  return hit ? out_(hit, true) : null;
}

// Registers the person and assigns a balanced group + tag (atomic).
function spin(name, age, gender) {
  const p = clean_(name, age, gender);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = sheet_();
    const rows = rows_(sh);
    const dup = rows.find(r => key_(r.name) === key_(p.name) && r.age === p.age);
    if (dup) return out_(dup, true);

    const code = choose_(rows, p);
    const used = rows.filter(r => String(r.tag).indexOf(code + '-') === 0)
                     .map(r => parseInt(String(r.tag).split('-')[1], 10) || 0);
    const num = (used.length ? Math.max.apply(null, used) : 0) + 1;
    const tag = code + '-' + ('00' + num).slice(-Math.max(3, String(num).length));
    const rec = { tag: tag, name: p.name, age: p.age, gender: p.gender, grade: grade_(p.age), group: GROUPS[code] };
    sh.appendRow([rec.tag, rec.name, rec.age, rec.gender, rec.grade, rec.group, new Date()]);
    SpreadsheetApp.flush();
    return out_(rec, false);
  } finally {
    lock.releaseLock();
  }
}

// Coordinators: no spin, CO-### tag, needs COORD_CODE.
function registerCoordinator(name, age, gender, code) {
  const p = clean_(name, age, gender);
  guard_('coord', String(code || '').trim().toUpperCase() === secret_('COORD_CODE').toUpperCase(), 'That coordinator code is not correct.');
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sh = sheet_();
    const rows = rows_(sh);
    const dup = rows.find(r => key_(r.name) === key_(p.name) && r.age === p.age);
    if (dup) return out_(dup, true);
    const used = rows.filter(r => String(r.tag).indexOf('CO-') === 0).map(r => parseInt(String(r.tag).split('-')[1], 10) || 0);
    const num = (used.length ? Math.max.apply(null, used) : 0) + 1;
    const rec = { tag: 'CO-' + ('00' + num).slice(-Math.max(3, String(num).length)), name: p.name, age: p.age, gender: p.gender, grade: grade_(p.age), group: COORD };
    sh.appendRow([rec.tag, rec.name, rec.age, rec.gender, rec.grade, rec.group, new Date()]);
    SpreadsheetApp.flush();
    return out_(rec, false);
  } finally {
    lock.releaseLock();
  }
}

// Organiser view: every registrant, PIN protected.
function groups(pin) {
  guard_('pin', String(pin).trim() === secret_('ADMIN_PIN'), 'That PIN is not correct.');
  return rows_(sheet_()).map(r => out_(r, false));
}

/* ---------- helpers ---------- */

function sheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#4a6b45').setFontColor('#ffffff');
    sh.setColumnWidth(2, 220);
  }
  return sh;
}

function rows_(sh) {
  const n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, HEADERS.length).getValues()
    .filter(r => r[1])
    .map(r => ({ tag: String(r[0]), name: String(r[1]), age: Number(r[2]), gender: String(r[3]), grade: String(r[4]) || grade_(Number(r[2])), group: String(r[5]) }));
}

function grade_(a) {
  const g = GRADES.find(g => a >= g[1] && a <= g[2]);
  return g ? g[0] : GRADES[3][0];
}

function key_(s) { return String(s).toLowerCase().replace(/\s+/g, ' ').trim(); }

// Blocks guessing the PIN / coordinator code: 10 wrong tries locks that check for 10 minutes.
function guard_(kind, ok, message) {
  const cache = CacheService.getScriptCache(), k = 'fails_' + kind;
  const fails = Number(cache.get(k) || 0);
  if (fails >= 10) throw new Error('Too many wrong attempts. Please wait 10 minutes and try again.');
  if (!ok) { cache.put(k, String(fails + 1), 600); throw new Error(message); }
}

function clean_(name, age, gender) {
  // Leading = + - @ would make Sheets/Excel treat the name as a formula.
  name = String(name || '').replace(/\s+/g, ' ').trim().replace(/^[=+\-@]+\s*/, '').slice(0, 80);
  age = parseInt(age, 10);
  if (name.split(' ').length < 2) throw new Error('Please enter your full name (first and last).');
  if (!(age >= 1 && age <= 120)) throw new Error('Please enter a valid age.');
  if (gender !== 'Male' && gender !== 'Female') throw new Error('Please choose a gender.');
  return { name: name, age: age, gender: gender };
}

// Fewer people of the same age grade + gender wins; then the smaller group; then random.
function choose_(rows, p) {
  const g = grade_(p.age), same = { KF: 0, KS: 0 }, total = { KF: 0, KS: 0 };
  rows.forEach(r => {
    const code = r.group === GROUPS.KF ? 'KF' : r.group === GROUPS.KS ? 'KS' : null;
    if (!code) return;
    total[code]++;
    if (grade_(r.age) === g && r.gender === p.gender) same[code]++;
  });
  if (same.KF !== same.KS) return same.KF < same.KS ? 'KF' : 'KS';
  if (total.KF !== total.KS) return total.KF < total.KS ? 'KF' : 'KS';
  return Math.random() < 0.5 ? 'KF' : 'KS';
}

function out_(r, existing) {
  return { tag: r.tag, name: r.name, age: r.age, gender: r.gender, grade: r.grade, group: r.group,
           code: String(r.tag).slice(0, 2), existing: !!existing };
}

/* ---------- the page ---------- */

const PAGE = String.raw`<!DOCTYPE html>
<html lang="en"><head><base target="_top"><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#f6f1e6;--card:rgba(255,253,247,.9);--ink:#2a241c;--muted:#6f6556;--line:#e3d9c6;--find:#4a6b45;--seek:#b0623d;--gold:#d9a441;--forest:#2f4a2c}
@media(prefers-color-scheme:dark){:root{--bg:#161a14;--card:rgba(32,36,28,.92);--ink:#f1ece0;--muted:#b9b09f;--line:#3b4033}}
*{box-sizing:border-box;min-width:0}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 "Source Sans 3",system-ui,sans-serif;overflow-x:clip}
h1,h2{font-family:Cinzel,Georgia,serif;line-height:1.1;text-wrap:balance;margin:0}
h1{font-size:clamp(26px,6vw,44px)}h2{font-size:24px;margin-bottom:14px}
header{position:relative;overflow:hidden;background:linear-gradient(180deg,#243b23 0%,#2f4a2c 55%,#4d6a42 100%);color:#fff;padding:30px max(5vw,16px) 34px;border-bottom:5px solid var(--gold)}
header .wrap{position:relative}
.scene{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.land{position:fixed;left:0;right:0;bottom:0;width:100%;height:46vh;z-index:-1;pointer-events:none}
.card{backdrop-filter:blur(2px)}
header .prog{font-weight:700;font-size:18px;margin-top:10px}
header .theme{font:700 clamp(20px,4.6vw,28px)/1.2 Cinzel,Georgia,serif;margin-top:14px;color:#f4d18a}
header .theme span{display:block;font:600 14px "Source Sans 3",sans-serif;color:#fff;opacity:.85;margin-bottom:2px}
header blockquote{margin:12px 0 0;padding-left:14px;border-left:3px solid var(--gold);font-style:italic;opacity:.95;max-width:560px}
header cite{display:block;font-style:normal;font-weight:700;font-size:14px;margin-top:4px;opacity:.9}
.badgewrap{max-width:400px;margin:0 auto}.badgewrap svg,.badgewrap img{width:100%;height:auto;display:block;filter:drop-shadow(0 10px 24px rgba(0,0,0,.22))}
.wrap{max-width:560px;margin:0 auto}
main{padding:24px max(5vw,16px) 48px}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:22px}
[hidden]{display:none!important}
form{display:grid;gap:18px}
label.f{display:grid;gap:6px;font-weight:600}
input[type=text],input[type=number],input[type=password]{font:16px "Source Sans 3",sans-serif;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--ink);min-height:48px;width:100%}
fieldset{border:0;padding:0;margin:0}legend{font-weight:600;margin-bottom:8px}
.opts{display:flex;gap:10px;flex-wrap:wrap}
label.opt{display:flex;align-items:center;gap:8px;border:1px solid var(--line);border-radius:10px;padding:10px 18px;min-height:48px;cursor:pointer;background:var(--bg)}
label.opt input{width:18px;height:18px;accent-color:var(--find)}
.btn{font:700 17px "Source Sans 3",sans-serif;border:0;border-radius:12px;padding:13px 24px;min-height:50px;cursor:pointer;background:var(--ink);color:var(--bg)}
.btn.gold{background:var(--gold);color:#241a00}.btn.ghost{background:transparent;color:var(--ink);border:1px solid var(--line)}
.btn:disabled{opacity:.5;cursor:wait}
button:focus-visible,input:focus-visible,label.opt:focus-within{outline:3px solid var(--gold);outline-offset:2px}
.err{color:var(--seek);font-weight:600;min-height:1.5em}.note{color:var(--muted);font-size:14px}
.hello{text-align:center}.hello .who{font:700 24px/1.2 Cinzel,serif;margin:2px 0 14px;overflow-wrap:anywhere}
.wheel{position:relative;width:min(84vw,380px);aspect-ratio:1;margin:0 auto 18px}
.wheel svg{width:100%;height:100%;display:block}
.center{text-align:center}
.tagcard{border-radius:18px;color:#fff;padding:26px 22px;text-align:center;position:relative;overflow:hidden}
.tagcard.KF{background:var(--find)}.tagcard.KS{background:var(--seek)}
.tagcard:after{content:"";position:absolute;inset:auto 0 0 0;height:8px;background:var(--gold)}
.tagcard .lbl{font-size:14px;opacity:.85}
.tagcard .grp{font:700 26px/1.15 Cinzel,serif;margin:2px 0 14px}
.tagcard .tag{font:700 clamp(54px,16vw,84px)/1 Cinzel,serif;letter-spacing:.04em;background:#fff;color:var(--ink);border-radius:14px;padding:14px 10px;margin:6px auto 14px;max-width:320px}
.tagcard .nm{font-size:20px;font-weight:700;overflow-wrap:anywhere}
.tagcard .meta{opacity:.9;font-size:15px}
.row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-top:16px}
footer{text-align:center;padding:0 16px 32px}
footer button{background:none;border:0;color:var(--muted);text-decoration:underline;font:14px "Source Sans 3",sans-serif;cursor:pointer;min-height:44px}
.groups{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:16px}
.g{border-top:6px solid var(--find)}.g.KS{border-top-color:var(--seek)}.g.CO{border-top-color:#8a6a2c}.g.CO h2{color:#8a6a2c}
.g h2{font-size:20px;color:var(--find)}.g.KS h2{color:var(--seek)}
ol{margin:0;padding-left:0;list-style:none}ol li{padding:7px 0;border-bottom:1px solid var(--line)}
ol b{display:inline-block;min-width:4.2em;font-variant-numeric:tabular-nums}
ol span{color:var(--muted);font-size:14px;white-space:nowrap}
table{border-collapse:collapse;width:100%;font-size:15px}th,td{padding:7px 8px;border-bottom:1px solid var(--line);text-align:left}td.n,th.n{text-align:right}
.admin{max-width:1000px}
@media(max-width:640px){.groups{grid-template-columns:minmax(0,1fr)}}
</style></head><body>
<header>
<svg class="scene" viewBox="0 0 1200 420" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
 <defs><radialGradient id="sunG" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#f4d18a" stop-opacity=".55"/><stop offset="1" stop-color="#f4d18a" stop-opacity="0"/></radialGradient></defs>
 <circle cx="930" cy="250" r="230" fill="url(#sunG)"/><circle cx="930" cy="250" r="62" fill="#f4d18a" fill-opacity=".35"/>
 <g stroke="#f4d18a" stroke-opacity=".14" stroke-width="3">
  <line x1="930" y1="250" x2="930" y2="20"/><line x1="930" y1="250" x2="1100" y2="60"/><line x1="930" y1="250" x2="760" y2="60"/><line x1="930" y1="250" x2="1190" y2="170"/><line x1="930" y1="250" x2="670" y2="170"/></g>
 <path d="M0 300 L140 190 L230 250 L360 140 L470 240 L560 200 L700 290 L820 210 L960 300 L1080 220 L1200 280 V420 H0Z" fill="#fff" fill-opacity=".06"/>
 <path d="M0 330 Q150 270 300 315 T600 305 T900 320 T1200 300 V420 H0Z" fill="#fff" fill-opacity=".08"/>
 <path d="M0 370 Q200 325 420 362 T820 352 T1200 360 V420 H0Z" fill="#000" fill-opacity=".14"/>
 <g fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2.5" stroke-linecap="round">
  <path d="M640 120 q10 -9 20 0 q10 -9 20 0"/><path d="M700 95 q7 -6 14 0 q7 -6 14 0"/><path d="M590 150 q6 -5 12 0 q6 -5 12 0"/></g>
</svg>
<div class="wrap" id="hwrap">
 <h1>Charity Tabernacle Christian Assembly</h1>
 <div class="prog">Youth and Children Program</div>
 <div class="theme"><span>Theme</span>Seek Ye First The Kingdom Of God</div>
 <blockquote>“But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.”<cite>Matthew 6:33 (KJV)</cite></blockquote>
</div></header>
<svg class="land" viewBox="0 0 1200 500" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
 <path d="M0 330 Q200 260 420 310 T840 290 T1200 300 V500 H0Z" fill="#8aa37c" fill-opacity=".16"/>
 <path d="M0 400 Q260 340 520 390 T1200 370 V500 H0Z" fill="#6f8f62" fill-opacity=".16"/>
 <path d="M0 450 Q300 410 640 445 T1200 430 V500 H0Z" fill="#4a6b45" fill-opacity=".14"/>
 <g stroke="#a78a4f" stroke-opacity=".28" stroke-width="2.5" fill="#c9a86a" fill-opacity=".22">
  <path d="M60 500 Q70 400 52 330" fill="none"/><ellipse cx="50" cy="322" rx="6" ry="16"/><ellipse cx="62" cy="350" rx="5" ry="13" transform="rotate(25 62 350)"/><ellipse cx="44" cy="356" rx="5" ry="13" transform="rotate(-25 44 356)"/><ellipse cx="64" cy="382" rx="5" ry="13" transform="rotate(25 64 382)"/><ellipse cx="47" cy="388" rx="5" ry="13" transform="rotate(-25 47 388)"/>
  <path d="M100 500 Q108 420 96 360" fill="none"/><ellipse cx="95" cy="352" rx="6" ry="15"/><ellipse cx="106" cy="380" rx="5" ry="12" transform="rotate(25 106 380)"/><ellipse cx="89" cy="386" rx="5" ry="12" transform="rotate(-25 89 386)"/>
  <path d="M1130 500 Q1120 410 1140 340" fill="none"/><ellipse cx="1141" cy="332" rx="6" ry="16"/><ellipse cx="1130" cy="362" rx="5" ry="13" transform="rotate(-25 1130 362)"/><ellipse cx="1148" cy="368" rx="5" ry="13" transform="rotate(25 1148 368)"/><ellipse cx="1128" cy="396" rx="5" ry="13" transform="rotate(-25 1128 396)"/>
 </g>
</svg>
<main><div class="wrap" id="mwrap">

<section id="s-form" class="card">
 <h2>Registration</h2>
 <form id="f" novalidate>
  <label class="f">Full name<input type="text" id="name" autocomplete="name" maxlength="80"></label>
  <label class="f">Age<input type="number" id="age" inputmode="numeric" min="1" max="120"></label>
  <fieldset><legend>Gender</legend><div class="opts">
   <label class="opt"><input type="radio" name="g" value="Male"> Male</label>
   <label class="opt"><input type="radio" name="g" value="Female"> Female</label></div></fieldset>
  <details id="coordBox"><summary class="note" style="cursor:pointer;min-height:44px;display:flex;align-items:center">I'm a coordinator</summary>
   <label class="f" style="margin-top:6px">Coordinator code<input type="text" id="ccode" autocomplete="off" autocapitalize="characters"></label>
   <p class="note" style="margin:6px 0 0">Coordinators get their badge straight away, with no spin.</p></details>
  <div><button class="btn" id="go" type="submit">Continue to spin</button></div>
  <div class="err" id="ferr" role="alert"></div>
 </form>
</section>

<section id="s-spin" class="card" hidden>
 <div class="hello"><div class="note">Ready,</div><div class="who" id="who"></div></div>
 <div class="wheel"><svg viewBox="0 0 400 400" aria-label="Grouping wheel"><g id="rot"></g>
  <circle cx="200" cy="200" r="34" fill="#fbf7ee" stroke="var(--gold)" stroke-width="6"/>
  <path d="M200 44 L184 6 L216 6 Z" fill="var(--gold)" stroke="#6b4a12" stroke-width="2"/></svg></div>
 <div class="center"><button class="btn gold" id="spin">Spin the wheel</button>
  <div class="err" id="serr" role="alert" style="margin-top:10px"></div>
  <button class="btn ghost" id="back" type="button">Edit my details</button></div>
</section>

<section id="s-done" hidden>
 <h2 class="center" id="tcHead">Welcome! Here is your badge</h2>
 <div class="badgewrap" id="badge"></div>
 <p class="center note" id="saveNote">Save your badge and show it at the desk.</p>
 <div class="row"><button class="btn gold" id="saveBadge">Save badge</button><button class="btn ghost" id="another">Register someone else</button></div>
</section>

<section id="s-admin" hidden>
 <div class="card" id="pinBox"><h2>Organiser</h2>
  <form id="pf" style="gap:12px"><label class="f">PIN<input type="password" id="pin" inputmode="numeric" autocomplete="off"></label>
  <div class="row" style="justify-content:flex-start;margin:0"><button class="btn" id="pgo">View groups</button><button class="btn ghost" type="button" id="pclose">Close</button></div>
  <div class="err" id="perr"></div></form></div>
 <div id="adminView" hidden>
  <div class="row" style="justify-content:flex-start;margin:0"><button class="btn" id="refresh">Refresh</button><button class="btn ghost" id="copy">Copy lists</button><button class="btn ghost" id="aclose">Close</button><span class="note" id="copied" style="align-self:center"></span></div>
  <div class="groups"><div class="card g KF"><h2 id="hKF">Kingdom Finders</h2><ol id="lKF"></ol></div><div class="card g KS"><h2 id="hKS">Kingdom Seekers</h2><ol id="lKS"></ol></div></div>
  <div class="card g CO" style="margin-top:16px"><h2 id="hCO">Coordinators</h2><ol id="lCO"></ol></div>
  <div class="card" style="margin-top:16px"><h2>Balance check</h2><table><thead><tr><th>Age grade</th><th>Gender</th><th class="n">Finders</th><th class="n">Seekers</th></tr></thead><tbody id="bal"></tbody></table>
  <p class="note">For Excel: open the Google Sheet, then File &gt; Download &gt; Microsoft Excel.</p></div>
 </div>
</section>
</div></main>
<footer><button id="org" type="button">Organiser</button></footer>

<script>
(function(){
var NAMES={KF:"Kingdom Finders",KS:"Kingdom Seekers",CO:"Coordinators"};
var GRADES=[["Children (under 13)",0,12],["Teens (13–17)",13,17],["Youth (18–30)",18,30],["Adults (31+)",31,200]];
function grade(a){for(var i=0;i<GRADES.length;i++)if(a>=GRADES[i][1]&&a<=GRADES[i][2])return GRADES[i][0];return GRADES[3][0]}
function $(id){return document.getElementById(id)}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
var KEY="seekYeFirst.mine",person=null,adminRows=[],pinVal="";
function screen(id){["s-form","s-spin","s-done","s-admin"].forEach(function(s){$(s).hidden=s!==id});
 var wide=id==="s-admin";$("mwrap").classList.toggle("admin",wide);$("hwrap").classList.toggle("admin",wide);$("org").parentNode.hidden=wide;window.scrollTo(0,0)}
function call(fn,args){return new Promise(function(res,rej){var r=google.script.run.withSuccessHandler(res).withFailureHandler(function(e){rej(e&&e.message?e:new Error(String(e)))});r[fn].apply(r,args)})}
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
 var main=CO?"#8a6a2c":KF?"#4a6b45":"#b0623d",deep=CO?"#3d3020":KF?"#2f4a2c":"#7e3f22",sky=CO?"#3d3020":KF?"#33502f":"#8c4a2a",gold="#d9a441";
 var parts=r.name.split(" "),first=parts[0],rest=parts.slice(1).join(" ");
 var o='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" role="img" aria-label="Badge for '+esc(r.name)+'">';
 o+='<defs><clipPath id="cb"><rect width="600" height="900" rx="30"/></clipPath><clipPath id="top"><rect x="0" y="0" width="600" height="300"/></clipPath></defs>';
 o+='<g clip-path="url(#cb)"><rect width="600" height="900" fill="#fbf7ee"/>';
 /* header band: unique faded landscape (sun, mountains, hills, birds) */
 o+='<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+sky+'"/><stop offset="1" stop-color="'+main+'"/></linearGradient><radialGradient id="sg"><stop offset="0" stop-color="#f4d18a" stop-opacity=".6"/><stop offset="1" stop-color="#f4d18a" stop-opacity="0"/></radialGradient></defs>';
 o+='<rect width="600" height="300" fill="url(#sk)"/><g clip-path="url(#top)">';
 var sx=rnd()<.5?60+rnd()*90:450+rnd()*90,sy=200+rnd()*40;
 o+='<circle cx="'+sx+'" cy="'+sy+'" r="150" fill="url(#sg)"/><circle cx="'+sx+'" cy="'+sy+'" r="'+(34+rnd()*14)+'" fill="#f4d18a" fill-opacity=".3"/>';
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

/* form */
$("f").addEventListener("submit",function(e){e.preventDefault();
 var name=$("name").value.replace(/\s+/g," ").trim(),age=parseInt($("age").value,10),g=document.querySelector("input[name=g]:checked");
 $("ferr").textContent="";
 if(name.split(" ").length<2)return $("ferr").textContent="Please enter your full name (first and last).";
 if(!(age>=1&&age<=120))return $("ferr").textContent="Please enter a valid age.";
 if(!g)return $("ferr").textContent="Please choose a gender.";
 person={name:name,age:age,gender:g.value};$("go").disabled=true;$("go").textContent="Checking…";
 call("lookup",[name,age]).then(function(hit){
  $("go").disabled=false;$("go").textContent=$("coordBox").open?"Get my badge":"Continue to spin";
  if(hit)return showResult(hit);
  var cc=$("coordBox").open?$("ccode").value.trim():"";
  if($("coordBox").open&&!cc){$("ferr").textContent="Enter your coordinator code, or close \"I'm a coordinator\".";return}
  if(cc){$("go").disabled=true;$("go").textContent="Creating badge…";
   return call("registerCoordinator",[name,age,g.value,cc]).then(function(r){$("go").disabled=false;$("go").textContent=$("coordBox").open?"Get my badge":"Continue to spin";showResult(r)})}
  $("who").textContent=name;$("serr").textContent="";$("spin").disabled=false;$("back").hidden=false;screen("s-spin")
 }).catch(function(err){$("go").disabled=false;$("go").textContent=$("coordBox").open?"Get my badge":"Continue to spin";$("ferr").textContent=msg(err)})});
$("back").addEventListener("click",function(){screen("s-form")});
$("spin").addEventListener("click",function(){
 $("spin").disabled=true;$("back").hidden=true;$("serr").textContent="";startFree();
 var minWait=new Promise(function(r){setTimeout(r,1200)});
 Promise.all([call("spin",[person.name,person.age,person.gender]),minWait]).then(function(v){
  var res=v[0];return landOn(res.code).then(function(){setTimeout(function(){showResult(res)},500)})
 }).catch(function(err){free=false;$("serr").textContent=msg(err)+" Please try again.";$("spin").disabled=false;$("back").hidden=false})});
$("coordBox").addEventListener("toggle",function(){$("go").textContent=$("coordBox").open?"Get my badge":"Continue to spin"});
$("another").addEventListener("click",function(){$("coordBox").open=false;try{localStorage.removeItem(KEY)}catch(e){}$("f").reset();screen("s-form");$("name").focus()});

/* organiser */
$("org").addEventListener("click",function(){$("adminView").hidden=true;$("pinBox").hidden=false;$("perr").textContent="";screen("s-admin");$("pin").focus()});
function closeAdmin(){var m=null;try{m=JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){}if(m)showResult(m);else screen("s-form")}
$("pclose").addEventListener("click",closeAdmin);$("aclose").addEventListener("click",closeAdmin);
function loadAdmin(){$("pgo").disabled=$("refresh").disabled=true;
 return call("groups",[pinVal]).then(function(rows){adminRows=rows;renderAdmin();$("pinBox").hidden=true;$("adminView").hidden=false})
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
</script></body></html>`;
