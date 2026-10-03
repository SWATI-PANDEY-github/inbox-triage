const CAT = {deal:{label:'Deal First',emoji:'',color:'var(--deal)'}, now:{label:'Do Now',emoji:'',color:'var(--now)'}, plan:{label:'Plan',emoji:'',color:'var(--plan)'}, later:{label:'Can wait',emoji:'',color:'var(--later)'}};

const RAW_EMAILS = [
 {id:1, sender:'Priya Sharma — Recruiter, Nexora', subject:'Interview confirmation needed by 6 PM today', body:'Hi, we would love to move forward with your application. Please confirm your availability for a technical interview today by 6 PM, or we may need to offer the slot to another candidate.', received:'2h ago'},
 {id:2, sender:'JECRC University — Examinations', subject:'Exam form submission opens tomorrow', body:'This is to inform all students that the online examination form submission window opens tomorrow at 9 AM and closes September 21 at 5 PM. Late submissions will not be accepted.', received:'5h ago'},
 {id:3, sender:'Dr. Meera Kapoor', subject:'Re: project discussion — are you free at 11?', body:'Hi, following up — are you available for a quick call tomorrow at 11 AM to discuss the project direction?', received:'1h ago'},
 {id:4, sender:'HDFC Bank Alerts', subject:'Credit card payment due in 2 days', body:'Your credit card statement balance of ₹18,240 is due on Sept 22. Please pay before the due date to avoid late fees.', received:'8h ago'},
 {id:5, sender:'Ananya Verma', subject:'Documents received?', body:'Hi, just checking — did you receive the documents I sent over the weekend? Let me know if anything is missing.', received:'1d ago'},
 {id:6, sender:'GitHub', subject:'Your weekly digest for 3 repositories', body:'Here is a summary of activity across your repositories this week, including 4 new issues and 2 pull requests.', received:'1d ago'},
 {id:7, sender:'College Administration', subject:'Guest lecture on career planning — optional', body:'You are invited to attend an optional guest lecture on career planning next Thursday. Attendance is not mandatory.', received:'2d ago'},
 {id:8, sender:'Zenith Coworking', subject:'Your November invoice is ready', body:'Your invoice for November is attached. Payment is auto-debited on the 1st, no action needed.', received:'3d ago'},
 {id:9, sender:'Amazon', subject:'Your package is out for delivery', body:'Your order of 2 items is out for delivery and should arrive today.', received:'6h ago'},
 {id:10, sender:'Rahul — Project Lead', subject:'Can you send the report by Friday?', body:'Hey, could you send over the client report by Friday? Let me know if that timeline works.', received:'4h ago'},
 {id:11, sender:'DesignWeekly Newsletter', subject:'12 layout ideas for dashboards', body:'This week: dashboard layout patterns, a new type scale trend, and reader-submitted portfolio links.', received:'2d ago'},
 {id:12, sender:'Event Team — Startup Meetup', subject:'Please confirm your event registration', body:'You registered for the Saturday meetup. Please confirm your attendance so we can finalize seating.', received:'3h ago'},
];

function heuristic(e){
  const t=(e.subject+' '+e.body).toLowerCase();
  const hasDeadlineWord = /(today|by \d|due|deadline|closes|6 pm|5 pm)/.test(t);
  const isQuick = /(confirm|are you free|available|please confirm)/.test(t) && e.body.split(' ').length<40;
  const isPromo = /(newsletter|digest|invoice|delivery|out for delivery|auto-debited)/.test(t);
  const needsThought = /(report|discuss|proposal|review)/.test(t) && !isQuick;
  if(isPromo) return {cat:'later', action:'None', time:'—'};
  if(hasDeadlineWord && !isQuick) return {cat:'deal', action:'Reply / Submit', time:'5–10 min'};
  if(isQuick) return {cat:'now', action:'Confirm', time:'30 sec'};
  if(needsThought) return {cat:'plan', action:'Review / Reply', time:'10–15 min'};
  return {cat:'later', action:'None', time:'—'};
}

const PREF_OPTIONS = ['Deadlines','Emails from professors','HR / recruiters','Work emails','Financial / payment emails','Government / official documents','Emails requiring replies','Meeting invitations'];

const FOLLOWUPS = [
 {id:1, sender:'Priya Sharma — Recruiter, Nexora', subject:'Following up on my application status', days:6},
 {id:2, sender:'Ananya Verma', subject:'Documents I sent over last week', days:4},
 {id:3, sender:'College Administration', subject:'Scholarship form status', days:2},
];

const STATIC_DETAILS = {
 1:{says:"Nexora needs you to confirm you're available for a technical interview today, by 6 PM.", why:['Explicit same-day deadline','Slot may go to someone else','Direct response requested'], deadline:'Today, 6 PM'},
 2:{says:'Exam form submission opens tomorrow and closes September 21 at 5 PM — late forms are not accepted.', why:['Hard deadline stated','Late submissions rejected','Affects your academic record'], deadline:'Sept 21, 5 PM'},
 3:{says:'Dr. Kapoor is asking if you can talk tomorrow at 11 AM about the project.', why:['Simple yes/no confirmation','Takes under a minute to answer'], deadline:null},
 4:{says:'Your credit card payment of ₹18,240 is due in 2 days.', why:['Real deadline with late fees','Financial consequence if ignored'], deadline:'Sept 22'},
 5:{says:'Ananya is checking whether you received the documents she sent.', why:['Quick factual confirmation','No real deadline, but easy to clear'], deadline:null},
 6:{says:"GitHub's weekly summary of activity across your repos.", why:['Automated digest','No action needed from you'], deadline:null},
 7:{says:'An optional guest lecture invitation — attendance is not required.', why:['Explicitly optional','No deadline or consequence'], deadline:null},
 8:{says:'Your November invoice is ready; payment is auto-debited, no action needed.', why:['Payment is automatic','Purely informational'], deadline:null},
 9:{says:'Your Amazon package is arriving today.', why:['Informational delivery update','Nothing to decide'], deadline:null},
 10:{says:'Rahul is asking if you can send the client report by Friday.', why:['Requires thought to prepare','Has a soft deadline, not urgent yet'], deadline:'Friday'},
 11:{says:'The design newsletter for this week — layout ideas and a portfolio roundup.', why:['Newsletter, read-optional'], deadline:null},
 12:{says:'The meetup team needs you to confirm your seat for Saturday.', why:['Simple confirmation','Affects their seating count'], deadline:null},
};

let state = {
  emails: RAW_EMAILS.map(e=>({...e, ...heuristic(e), ...(STATIC_DETAILS[e.id]||{}), enriched:false})),
  view:'onboarding', cat:'all', modalId:null, tone:'Professional', replyOpts:null, replyLoading:false,
  prefs:['Deadlines','HR / recruiters','Emails requiring replies'],
  quickQueue:[], quickIdx:0, quickCleared:0, focus:null
};
let sampleFn = null;

async function boot(){
  try{ sampleFn = await claude.use('sample'); }catch(e){ sampleFn = null; }
  render();
  if(state.view!=='onboarding' && sampleFn) enrichAll();
}
boot();

function togglePref(p){
  const i = state.prefs.indexOf(p);
  if(i>-1) state.prefs.splice(i,1); else state.prefs.push(p);
  render();
}
function finishOnboarding(){ state.view='home'; state.cat='all'; render(); if(sampleFn) enrichAll(); }

async function enrichAll(){
  try{
    const input = state.emails.map(e=>({id:e.id, sender:e.sender, subject:e.subject, body:e.body, category:e.cat}));
    const prefLine = state.prefs.length ? `This user has said the following personally feel important/stressful to them, so weigh these toward "deal" or "plan" rather than "later" when relevant: ${state.prefs.join(', ')}.` : '';
    const result = await sampleFn.json(
      `You are the classification engine inside "Triage", a calm email-attention app. For each email in this JSON array, the app has already assigned a rough category (deal=urgent&consequential, now=quick to resolve, plan=matters but no rush, later=no action needed). Refine only if clearly wrong, and add: a one-sentence plain-English summary ("says"), a short required action label ("action"), a realistic time estimate ("time"), and 2-4 short bullet reasons for the category ("why", array of short strings, no more than 6 words each). Deadline text if one is explicitly stated, else null ("deadline"). ${prefLine} Respond ONLY with a JSON array of objects: [{id, cat, says, action, time, why, deadline}]. Input:\n${JSON.stringify(input)}`
    );
    if(Array.isArray(result)){
      result.forEach(r=>{
        const e = state.emails.find(x=>x.id===r.id);
        if(e){ Object.assign(e, {cat:r.cat||e.cat, says:r.says, action:r.action||e.action, time:r.time||e.time, why:r.why, deadline:r.deadline, enriched:true}); }
      });
      render();
    }
  }catch(err){ /* silent — heuristic stays as fallback */ }
}

function counts(){
  const c={deal:0,now:0,plan:0,later:0};
  state.emails.forEach(e=>c[e.cat]++);
  return c;
}

// ---------- SHELL ----------
function topbarHtml(){
  return `
    <div class="gmail-top">
      <div class="gmail-logo"><div class="mark">T</div> Triage</div>
      <div class="gmail-search">🔍 Search mail (demo — not functional)</div>
      <div class="gmail-top-right" onclick="goPrefs()">⚙️</div>
    </div>`;
}
function sidebarHtml(){
  const c = counts();
  const item = (view,cat,label,color,count,icon) => `
    <div class="nav-item ${state.view===view && state.cat===cat ? 'active':''}" onclick="${view==='home'?`openCategory('${cat}')`:`openView('${view}')`}">
      ${color?`<span class="nav-dot" style="background:${color}"></span>`:`<span style="width:18px;text-align:center;">${icon}</span>`}
      <span>${label}</span>
      ${count!==undefined?`<span class="nav-count">${count}</span>`:''}
    </div>`;
  return `
    <div class="gmail-sidebar">
      <button class="compose-btn" onclick="openCompose()">✏️ Compose</button>
      ${item('home','all','Inbox',null,state.emails.length,'📥')}
      <div class="nav-sep"></div>
      ${item('home','deal','Deal First','var(--deal)',c.deal)}
      ${item('home','now','Do Now','var(--now)',c.now)}
      ${item('home','plan','Plan','var(--plan)',c.plan)}
      ${item('home','later','Can wait','var(--later)',c.later)}
      <div class="nav-sep"></div>
      ${item('tracker','_','Waiting for replies',null,FOLLOWUPS.length,'⏳')}
      ${item('focus-pick','_','Focus Mode',null,undefined,'🎯')}
    </div>`;
}
function render(){
  if(state.view==='onboarding'){ renderOnboarding(); return; }
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="gmail-shell">
      ${topbarHtml()}
      <div class="gmail-body">
        ${sidebarHtml()}
        <div class="gmail-main">${mainContentHtml()}</div>
      </div>
    </div>`;
  if(state.modalId) renderModal();
}
function openCategory(cat){ state.view='home'; state.cat=cat; render(); }
function openView(v){ state.view=v; render(); }
function goPrefs(){ state.view='onboarding'; render(); }

function mainContentHtml(){
  if(state.view==='home') return listViewHtml();
  if(state.view==='tracker') return trackerHtml();
  if(state.view==='quick') return quickModeHtml();
  if(state.view==='focus-pick') return focusPickHtml();
  if(state.view==='focus') return focusResultHtml();
  return '';
}

// ---------- INBOX LIST ----------
function listViewHtml(){
  const list = state.cat==='all' ? state.emails : state.emails.filter(e=>e.cat===state.cat);
  const title = state.cat==='all' ? 'Inbox' : CAT[state.cat].label;
  return `
    <div class="list-header"><h1>${title}</h1><span class="count">${list.length} email${list.length!==1?'s':''}</span></div>
    ${!sampleFn ? `<p class="spin" style="padding-top:10px;">Rule-based triage active — live AI classification unavailable outside claude.ai.</p>` : ''}
    ${list.length ? list.map(e=>emailRow(e)).join('') : `<div class="empty-state">Nothing here.</div>`}
  `;
}
function emailRow(e){
  return `<div class="glist-row" onclick="openEmail(${e.id})">
    <span class="glist-dot" style="background:${CAT[e.cat].color}"></span>
    <span class="glist-sender">${e.sender}</span>
    <span class="glist-subject">${e.subject} — <span class="snippet">${(e.says||e.body).slice(0,70)}</span></span>
    <span class="glist-time">${e.received}</span>
  </div>`;
}

// ---------- FOLLOW-UP TRACKER ----------
function trackerHtml(){
  return `
    <div class="list-header"><h1>Waiting for replies</h1><span class="count">${FOLLOWUPS.length} conversations</span></div>
    ${FOLLOWUPS.map(f=>`
      <div class="glist-row" style="cursor:default;height:auto;padding:12px 20px;">
        <span class="glist-dot" style="background:var(--plan)"></span>
        <span class="glist-sender">${f.sender}</span>
        <span class="glist-subject">${f.subject}</span>
        <span class="glist-time">${f.days}d</span>
      </div>
      <div style="padding:0 20px 14px 43px;" id="fu-${f.id}">
        <span class="reply-opt" onclick="suggestFollowup(${f.id})">Suggest follow-up</span>
      </div>
    `).join('')}
  `;
}
async function suggestFollowup(id){
  const f = FOLLOWUPS.find(x=>x.id===id);
  const target = document.getElementById('fu-'+id);
  if(!target) return;
  target.innerHTML = sampleFn ? `<p class="spin" style="padding:0;">Drafting…</p>` : draftBox(fallbackFollowup(f));
  if(!sampleFn) return;
  try{
    const text = await sampleFn(`Write one short, polite follow-up email message (2-3 sentences) chasing a reply on this, without sounding impatient. It's been ${f.days} days since the original message. Context: "${f.subject}" to ${f.sender}. Respond with only the message text, no subject line.`);
    target.innerHTML = draftBox(text.text || text);
  }catch(err){ target.innerHTML = draftBox(fallbackFollowup(f)); }
}
function draftBox(text){
  return `<div class="field" style="max-width:500px;"><div class="v">${text}</div></div><button class="btn small" onclick="this.outerHTML='<span class=\\'nav-count\\'>✓ Sent</span>'">Send</button>`;
}
function fallbackFollowup(f){
  return `Hi, I wanted to follow up regarding "${f.subject}" — just checking if there's any update on your end. Thank you!`;
}

// ---------- FOCUS MODE ----------
function focusPickHtml(){
  return `
    <div class="list-header"><h1>Focus Mode</h1></div>
    <div style="padding:24px 20px;">
      <p style="color:var(--sub);margin:0 0 16px;">How much time do you have? We'll pick what's worth doing with it.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        ${[5,15,30,60].map(m=>`<button class="btn ghost" onclick="startFocus(${m})">${m} min</button>`).join('')}
      </div>
    </div>`;
}
function parseMinutes(t){
  if(!t || t==='—') return null;
  if(/sec/.test(t)) return 0.5;
  const nums = t.match(/\d+/g);
  if(!nums) return null;
  return nums.length>1 ? (parseInt(nums[0])+parseInt(nums[1]))/2 : parseInt(nums[0]);
}
function startFocus(minutes){
  const priority = {deal:0, now:1, plan:2};
  const candidates = state.emails
    .filter(e=>e.cat!=='later')
    .map(e=>({...e, mins: parseMinutes(e.time)}))
    .filter(e=>e.mins!==null)
    .sort((a,b)=> priority[a.cat]-priority[b.cat] || a.mins-b.mins);
  let total=0, picked=[];
  candidates.forEach(e=>{ if(total+e.mins<=minutes){ picked.push(e); total+=e.mins; } });
  state.focus = {minutes, picked, total};
  state.view='focus';
  render();
}
function focusResultHtml(){
  const f = state.focus;
  return `
    <div class="list-header"><h1>You have ${f.minutes} minutes</h1></div>
    <p style="padding:14px 20px 0;color:var(--sub);">${f.picked.length ? `Here's what fits — about ${f.total.toFixed(1)} min total.` : 'Nothing urgent fits right now — genuinely caught up.'}</p>
    ${f.picked.map((e,i)=>`
      <div class="glist-row" onclick="openEmail(${e.id})">
        <span class="glist-dot" style="background:${CAT[e.cat].color}"></span>
        <span class="glist-sender">${i+1}. ${e.sender}</span>
        <span class="glist-subject">${e.subject}</span>
        <span class="glist-time">${e.time}</span>
      </div>`).join('') || ''}
  `;
}

// ---------- EMAIL DETAIL MODAL ----------
function openEmail(id){ state.modalId=id; state.replyOpts=null; state.tone='Professional'; render(); }
function closeModal(){
  state.modalId=null;
  const o = document.getElementById('overlay');
  if(o) o.remove();
  render();
}

// ---------- TOAST ----------
function showToast(msg){
  let t = document.getElementById('toast');
  if(!t){ t=document.createElement('div'); t.id='toast'; t.className='toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=>t.classList.remove('show'), 3200);
}

// ---------- COMPOSE ----------
function openCompose(){
  let panel = document.getElementById('compose-panel');
  if(!panel){
    panel = document.createElement('div');
    panel.id = 'compose-panel';
    panel.className = 'compose-panel';
    panel.innerHTML = `
      <div class="compose-head">
        <span>New Message</span>
        <button class="icon-btn" onclick="closeCompose()">✕</button>
      </div>
      <div class="compose-body">
        <input type="text" id="compose-to" class="compose-input" placeholder="To">
        <input type="text" id="compose-subject" class="compose-input" placeholder="Subject">
        <textarea id="compose-message" class="compose-textarea" placeholder="Write your message…"></textarea>
      </div>
      <div class="compose-foot">
        <button class="btn" onclick="sendCompose()">Send</button>
        <button class="icon-btn" onclick="closeCompose()" title="Discard">🗑</button>
      </div>`;
    document.body.appendChild(panel);
  }
  panel.classList.add('open');
  setTimeout(()=>document.getElementById('compose-to')?.focus(), 50);
}
function closeCompose(){
  const panel = document.getElementById('compose-panel');
  if(panel) panel.classList.remove('open');
}
function sendCompose(){
  const to = document.getElementById('compose-to').value.trim();
  const subject = document.getElementById('compose-subject').value.trim();
  if(!to){ document.getElementById('compose-to').focus(); return; }
  showToast(`✓ Sent to ${to}${subject ? ' — "'+subject+'"' : ''} (demo — not actually delivered anywhere)`);
  document.getElementById('compose-to').value='';
  document.getElementById('compose-subject').value='';
  document.getElementById('compose-message').value='';
  closeCompose();
}
function renderModal(){
  const e = state.emails.find(x=>x.id===state.modalId);
  if(!e) return;
  const needsReply = e.cat==='deal' || e.cat==='now';
  let overlay = document.getElementById('overlay');
  if(!overlay){ overlay = document.createElement('div'); overlay.id='overlay'; overlay.className='overlay'; document.body.appendChild(overlay); }
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-top">
        <button class="icon-btn" onclick="closeModal()">←</button>
        <span class="glist-dot" style="background:${CAT[e.cat].color}"></span>
        <span style="font-size:13px;color:var(--sub);">${CAT[e.cat].label}</span>
      </div>
      <div class="modal-body-pad">
        <h2>${e.subject}</h2>
        <div class="field"><div class="k">From</div><div class="v">${e.sender}</div></div>
        <div class="field"><div class="k">What it says</div><div class="v">${e.says || e.body}</div></div>
        <div class="field"><div class="k">Your action</div><div class="v">${e.action}</div></div>
        ${e.deadline ? `<div class="field"><div class="k">Deadline</div><div class="v">${e.deadline}</div></div>` : ''}
        <div class="field"><div class="k">Estimated time</div><div class="v">${e.time||'—'}</div></div>
        <div class="why-box">
          <strong>Why ${CAT[e.cat].label.toLowerCase()}</strong>
          <ul>${(e.why||['Reviewed by rule-based triage']).map(w=>`<li>${w}</li>`).join('')}</ul>
        </div>
        ${needsReply ? renderReplySection(e) : ''}
      </div>
    </div>`;
  overlay.onclick = (ev)=>{ if(ev.target===overlay) closeModal(); };
}
function renderReplySection(e){
  return `
    <div class="field"><div class="k">Quick reply</div></div>
    <div class="tone-row">
      ${['Professional','Friendly','Casual','Very short'].map(t=>`<button class="tone-btn ${state.tone===t?'active':''}" onclick="setTone('${t}',${e.id})">${t}</button>`).join('')}
    </div>
    <div id="reply-area">${replyAreaHtml(e)}</div>
  `;
}
function replyAreaHtml(e){
  if(state.replyLoading) return `<p class="spin" style="padding:0;">Drafting replies…</p>`;
  const opts = state.replyOpts || fallbackReplies(e);
  return opts.map(o=>`<span class="reply-opt" onclick="pickReply(this)">${o}</span>`).join('') +
    `<span class="reply-opt" onclick="alert('You can type your own reply here in the full version.')">✎ Write my own</span>`;
}
function pickReply(el){
  el.textContent = '✓ Sent: "' + el.textContent + '"';
  el.style.pointerEvents='none';
  el.style.opacity='.6';
}
function fallbackReplies(e){
  const map = {
    'Professional':["Thank you for letting me know — confirming I'll be available.","Received, thank you. I'll follow up shortly."],
    'Friendly':["Sounds good, I'll be there — thanks!","Got it, thank you!"],
    'Casual':["Yep, works for me!","All good, thanks!"],
    'Very short':["Confirmed.","Got it, thanks."]
  };
  return map[state.tone]||map['Professional'];
}
async function setTone(tone, id){
  state.tone = tone;
  const e = state.emails.find(x=>x.id===id);
  if(!sampleFn){ render(); return; }
  state.replyLoading = true; render();
  try{
    const opts = await sampleFn.json(`Write exactly 3 short quick-reply options an email user could send in response to this email, in a "${tone}" tone. Base the replies on the actual content/intent of the email — don't be generic. Email:\nFrom: ${e.sender}\nSubject: ${e.subject}\nBody: ${e.body}\n\nRespond ONLY with a JSON array of 3 plain strings, no other text.`);
    state.replyOpts = Array.isArray(opts) ? opts.slice(0,3) : fallbackReplies(e);
  }catch(err){ state.replyOpts = fallbackReplies(e); }
  state.replyLoading = false; render();
}

// ---------- 30-SECOND MODE ----------
function startQuickMode(){
  state.quickQueue = state.emails.filter(e=>e.cat==='now');
  state.quickIdx = 0; state.quickCleared = 0;
  state.view='quick'; render();
}
function quickModeHtml(){
  const q = state.quickQueue, i = state.quickIdx;
  if(i >= q.length){
    return `
      <div class="list-header"><h1>Quick Clear</h1></div>
      <div class="empty-state">
        <div style="font-size:22px;margin-bottom:6px;">✅ ${state.quickCleared} email${state.quickCleared!==1?'s':''} cleared</div>
        <p>Nice — that's ${state.quickCleared} fewer decisions weighing on you.</p>
        <button class="btn" onclick="openCategory('all')">Back to inbox</button>
      </div>`;
  }
  const e = q[i];
  return `
    <div class="list-header"><h1>Quick Clear</h1><span class="count">${i+1} of ${q.length}</span></div>
    <div style="padding:20px;">
      <div style="color:var(--now);font-weight:600;font-size:13px;margin-bottom:6px;">${e.sender}</div>
      <h2 style="margin:0 0 12px;font-weight:400;">${e.subject}</h2>
      <p style="color:var(--sub);margin-bottom:18px;">${e.says||e.body}</p>
      <div class="field"><div class="k">Suggested reply</div><div class="v">${fallbackReplies(e)[0]}</div></div>
      <div style="display:flex;gap:10px;margin-top:16px;">
        <button class="btn" onclick="quickAdvance(true)">Send</button>
        <button class="btn ghost" onclick="quickAdvance(false)">Skip</button>
      </div>
    </div>`;
}
function quickAdvance(sent){
  if(sent) state.quickCleared++;
  state.quickIdx++;
  render();
}

// ---------- ONBOARDING ----------
function renderOnboarding(){
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="onb-wrap">
      <div class="onb-title">What usually needs your attention?</div>
      <p class="onb-sub">Pick anything that applies — this personalizes how Triage classifies your inbox. You can change this anytime from the ⚙️ icon.</p>
      ${PREF_OPTIONS.map(p=>`
        <div class="check-row" onclick="togglePref('${p}')">
          <div class="checkbox ${state.prefs.includes(p)?'on':''}">${state.prefs.includes(p)?'✓':''}</div>
          <div>${p}</div>
        </div>`).join('')}
      <div style="margin-top:22px;"><button class="btn" onclick="finishOnboarding()">Continue</button></div>
    </div>`;
}