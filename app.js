const family="המשפחה שלנו";
const $=id=>document.getElementById(id);
let feeds=[],feedType="בקבוק",nextDue="",diapers=[],diaperType="פיפי",reminderTimer=null;
function localValue(d=new Date()){const x=new Date(d.getTime()-d.getTimezoneOffset()*60000);return x.toISOString().slice(0,16)}
function dateLabel(v){if(!v)return "לא הוגדרה";const d=new Date(v);return d.toLocaleString("he-IL",{weekday:"short",day:"numeric",month:"numeric",hour:"2-digit",minute:"2-digit"})}
function timeLabel(v){if(!v)return "";return new Date(v).toLocaleTimeString("he-IL",{hour:"2-digit",minute:"2-digit"})}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function api(action,extra={}){const r=await fetch("/api/feeds",{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},cache:"no-store",body:JSON.stringify({action,...extra})});const raw=await r.text();let data={};try{data=JSON.parse(raw)}catch{}if(!r.ok)throw new Error(data.error||"שגיאה בשמירת הנתונים");return data}
async function load(){const [d,p]=await Promise.all([api("load"),diaperApi("load")]);feeds=d.feeds||[];nextDue=d.nextDueAt||"";diapers=p.diapers||[]}
function render(){renderLast();renderHistory();renderNext();renderDiapers();scheduleReminder()}
function renderLast(){const f=feeds[0];$("lastFeed").classList.toggle("empty",!f);if(!f){$("lastFeed").textContent="עדיין לא נרשמו האכלות";return}const details=[f.feedType,f.amountMl?f.amountMl+" מ״ל":"",f.durationMinutes?f.durationMinutes+" דקות":"",f.side||"",f.notes||""].filter(Boolean).join(" · ");$("lastFeed").innerHTML='<div class="last-time">'+timeLabel(f.fedAt)+'</div><div class="last-date">'+dateLabel(f.fedAt)+'</div><div class="last-details">'+esc(details)+'</div>'}
function renderNext(){const fromFeed=feeds.find(f=>f.nextDueAt)?.nextDueAt;const due=nextDue||fromFeed;$("nextTime").textContent=due?dateLabel(due):"לא הוגדרה שעה";const input=$("nextDueInput");if(document.activeElement!==input)input.value=due||"";if(due){const diff=new Date(due)-Date.now();$("nextStatus").textContent=diff<0?"עבר הזמן":"מתוכנן";$("nextStatus").className="status-pill "+(diff<0?"late":"");$("countdown").textContent=diff<0?"עברו "+durationText(-diff)+" מהמועד שהוגדר":"נותרו "+durationText(diff)}else{$("nextStatus").textContent="ממתין לעדכון";$("countdown").textContent="רשמו האכלה והגדירו מתי הבאה"}}

async function diaperApi(action,extra={}){const r=await fetch("/api/diapers",{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",body:JSON.stringify({action,...extra})});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"שגיאה בשמירת החיתול");return data}
function renderDiapers(){
 $("diaperHistory").innerHTML=diapers.length?diapers.map(x=>'<article class="feed-row"><div class="timeline-dot"></div><div class="feed-main"><div class="feed-row-top"><strong>'+esc(x.diaperType)+'</strong><span>'+dateLabel(x.changedAt)+'</span></div>'+(x.notes?'<div class="feed-notes">'+esc(x.notes)+'</div>':'')+'</div><div class="feed-actions"><button type="button" class="delete-btn" data-diapdel="'+x.id+'">מחיקה</button></div></article>').join(""):'<div class="empty-history">עדיין אין רישומים</div>';
 document.querySelectorAll("[data-diapdel]").forEach(b=>b.onclick=async()=>{if(!confirm("למחוק את רישום החיתול?"))return;try{await diaperApi("delete",{id:b.dataset.diapdel});const r=await diaperApi("load");diapers=r.diapers||[];renderDiapers()}catch(e){alert(e.message)}});
}
function scheduleReminder(){
 if(reminderTimer)clearTimeout(reminderTimer);
 if(!nextDue||!("Notification" in window)||Notification.permission!=="granted")return;
 const target=new Date(nextDue).getTime(),delay=target-Date.now();
 if(delay<=0){const key="babyReminderSent:"+nextDue;if(!localStorage.getItem(key)){new Notification("הגיע זמן ההאכלה שהוגדר",{body:"בדקו אם הגיע הזמן להאכיל את הקטנה"});localStorage.setItem(key,"1")}return}
 reminderTimer=setTimeout(scheduleReminder,Math.min(delay,2147480000));
}
$("enableReminderBtn").onclick=async()=>{
 if(!("Notification" in window)){alert("הדפדפן הזה לא תומך בהתראות. נסו להוסיף את האתר למסך הבית ולפתוח משם.");return}
 try{const p=await Notification.requestPermission();$("reminderStatus").textContent=p==="granted"?"התראות הופעלו. יש להשאיר את האתר פתוח כדי שהתזכורת תפעל.":"לא אושרה הרשאה להתראות";scheduleReminder()}catch(e){$("reminderStatus").textContent="לא ניתן להפעיל התראות במכשיר הזה"}
};
document.querySelectorAll("[data-diaper]").forEach(b=>b.onclick=()=>{diaperType=b.dataset.diaper;document.querySelectorAll("[data-diaper]").forEach(x=>x.classList.toggle("active",x===b))});
$("diaperAt").value=localValue();
$("diaperForm").onsubmit=async e=>{e.preventDefault();try{await diaperApi("add",{changedAt:$("diaperAt").value,diaperType,notes:$("diaperNotes").value});const r=await diaperApi("load");diapers=r.diapers||[];$("diaperAt").value=localValue();$("diaperNotes").value="";renderDiapers()}catch(err){alert(err.message)}};

function durationText(ms){const n=Math.max(0,Math.floor(ms/60000)),h=Math.floor(n/60),m=n%60;return h?h+" שעות ו־"+m+" דקות":m+" דקות"}
function renderHistory(){$("feedCount").textContent=feeds.length;$("feedHistory").innerHTML=feeds.length?feeds.map(f=>{const d=new Date(f.fedAt),day=d.toLocaleDateString("he-IL",{weekday:"long",day:"numeric",month:"long"});const meta=[f.feedType,f.amountMl?f.amountMl+" מ״ל":"",f.durationMinutes?f.durationMinutes+" דקות":"",f.side||""].filter(Boolean).join(" · ");return '<article class="feed-row"><div class="timeline-dot"></div><div class="feed-main"><div class="feed-row-top"><strong>'+timeLabel(f.fedAt)+'</strong><span>'+day+'</span></div><div class="feed-meta">'+esc(meta)+'</div>'+(f.nextDueAt?'<div class="feed-next">הבאה: '+dateLabel(f.nextDueAt)+'</div>':'')+(f.notes?'<div class="feed-notes">'+esc(f.notes)+'</div>':'')+'</div><div class="feed-actions"><button type="button" data-edit="'+f.id+'">עריכה</button><button type="button" class="delete-btn" data-delete="'+f.id+'">מחיקה</button></div></article>'}).join(""):'<div class="empty-history">כאן יופיעו ההאכלות שתשמרו</div>';document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openEdit(feeds.find(f=>f.id===b.dataset.edit)));document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{if(!confirm("למחוק את רישום ההאכלה?"))return;try{await api("delete",{id:b.dataset.delete});await load();render()}catch(e){alert(e.message)}})}
function setType(t){feedType=t;document.querySelectorAll("[data-type]").forEach(b=>b.classList.toggle("active",b.dataset.type===t));$("bottleFields").classList.toggle("hidden",t!=="בקבוק");$("nursingFields").classList.toggle("hidden",t!=="הנקה")}
function openEdit(f){if(!f)return;$("editId").value=f.id;$("editFedAt").value=f.fedAt||"";$("editType").value=f.feedType;$("editAmount").value=f.amountMl||"";$("editDuration").value=f.durationMinutes||"";$("editSide").value=f.side||"";$("editNext").value=f.nextDueAt||"";$("editNotes").value=f.notes||"";$("editModal").classList.remove("hidden")}
function closeEdit(){$("editModal").classList.add("hidden")}
$("quickFeedBtn").onclick=async()=>{const btn=$("quickFeedBtn");btn.disabled=true;btn.textContent="שומר…";try{await api("add",{fedAt:localValue(),feedType:"רישום מהיר",notes:""});await load();render()}catch(e){alert(e.message)}finally{btn.disabled=false;btn.textContent="🍼 רישום האכלה עכשיו"}};
$("themeBtn").onclick=()=>{const dark=document.documentElement.dataset.theme!=="dark";document.documentElement.dataset.theme=dark?"dark":"light";localStorage.setItem("babyTheme",dark?"dark":"light");$("themeBtn").textContent=dark?"☀":"☾"};
document.documentElement.dataset.theme=localStorage.getItem("babyTheme")||"light";$("themeBtn").textContent=document.documentElement.dataset.theme==="dark"?"☀":"☾";
document.querySelectorAll("[data-type]").forEach(b=>b.onclick=()=>setType(b.dataset.type));setType("בקבוק");$("fedAt").value=localValue();
$("feedForm").onsubmit=async e=>{e.preventDefault();const payload={fedAt:$("fedAt").value,feedType,amountMl:feedType==="בקבוק"?$("amountMl").value:"",durationMinutes:feedType==="הנקה"?$("durationMinutes").value:"",side:feedType==="הנקה"?$("side").value:"",nextDueAt:$("feedNextDue").value,notes:$("notes").value};try{await api("add",payload);if(payload.nextDueAt)nextDue=payload.nextDueAt;await load();render();$("feedForm").reset();$("fedAt").value=localValue();$("feedNextDue").value="";$("notes").value="";$("amountMl").value="";$("durationMinutes").value="";$("side").value="";setType("בקבוק")}catch(err){alert(err.message)}};
$("saveNextBtn").onclick=async()=>{try{const d=await api("setNext",{nextDueAt:$("nextDueInput").value});nextDue=d.nextDueAt||"";renderNext()}catch(e){alert(e.message)}};
$("editForm").onsubmit=async e=>{e.preventDefault();const payload={id:$("editId").value,fedAt:$("editFedAt").value,feedType:$("editType").value,amountMl:$("editAmount").value,durationMinutes:$("editDuration").value,side:$("editSide").value,nextDueAt:$("editNext").value,notes:$("editNotes").value};try{await api("update",payload);if(payload.nextDueAt)nextDue=payload.nextDueAt;await load();render();closeEdit()}catch(err){alert(err.message)}};
$("closeEdit").onclick=closeEdit;$("editModal").addEventListener("click",e=>{if(e.target===$("editModal"))closeEdit()});

$("refreshBtn").onclick=async()=>{
 const btn=$("refreshBtn");
 if(btn.disabled)return;
 btn.disabled=true;btn.textContent="↻ מסנכרן…";
 try{await load();render();btn.textContent="✓ עודכן"}
 catch(e){alert("לא הצלחנו לסנכרן: "+e.message);btn.textContent="↻ רענון"}
 finally{setTimeout(()=>{btn.disabled=false;btn.textContent="↻ רענון"},1200)}
};
\n$("tracker").classList.remove("hidden");
load().then(render).catch(e=>{alert("לא הצלחנו לטעון את המעקב: "+e.message)});
setInterval(()=>{renderNext();scheduleReminder()},15000);
