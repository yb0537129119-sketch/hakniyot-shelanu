const families=["משפחת עמר","משפחת בן גיגי","משפחת זכאי","משפחת עוזר","ינון"];
const quick=["🥛 חלב","🍞 לחם","🥚 ביצים","🧀 גבינה","🍅 עגבניות","🥒 מלפפונים","🍌 בננות","🍎 תפוחים","🧻 נייר טואלט","🧼 נוזל כלים","🍗 עוף","🍚 אורז"];
let family=localStorage.getItem("family"), current=null, listsCache=[];
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function api(path,method="GET",body=null){
  const url=method==="GET"?path+"?family="+encodeURIComponent(family):path;
  const res=await fetch(url,{method,headers:{"Content-Type":"application/json"},...(body?{body:JSON.stringify({...body,family})}:{})});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data.error||"שגיאה בחיבור");
  return data;
}
function showLogin(){$("login").classList.remove("hidden");$("app").classList.add("hidden");$("logout").classList.add("hidden");}
function renderFamilies(){
  $("familyChoices").innerHTML=families.map(f=>'<button class="family" data-family="'+esc(f)+'">👤<br>'+esc(f)+'</button>').join("");
  document.querySelectorAll("[data-family]").forEach(b=>b.onclick=()=>enter(b.dataset.family));
}
async function enter(name){
  family=name;localStorage.setItem("family",name);
  $("login").classList.add("hidden");$("app").classList.remove("hidden");$("logout").classList.remove("hidden");$("familyName").textContent=name;
  try{await loadLists();}catch(e){alert(e.message);showLogin();}
}
async function loadLists(){const data=await api("/api/lists");listsCache=data.lists||[];renderLists();}
function renderLists(){
  const mine=listsCache.filter(l=>!l.shared), shared=listsCache.filter(l=>l.shared);
  $("lists").innerHTML=mine.length?mine.map(listCard).join(""):'<div class="empty">עדיין אין רשימות. יוצרים רשימה ראשונה למעלה 🙂</div>';
  $("sharedLists").innerHTML=shared.length?shared.map(listCard).join(""):'<div class="empty">עדיין לא שיתפו איתכם רשימות.</div>';
  document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>openList(b.dataset.open));
}
function listCard(l){const done=l.items.filter(i=>i.done).length;return '<div class="list-card"><div><b>'+esc(l.name)+'</b><div class="small muted">'+(l.shared?'שותף על ידי '+esc(l.ownerFamily):'הרשימה שלך')+' · '+done+'/'+l.items.length+' מוצרים נקנו</div></div><button data-open="'+esc(l.id)+'">פתיחה ←</button></div>';}
function activeList(){return listsCache.find(l=>l.id===current);}
function openList(id){current=id;$("mine").classList.add("hidden");$("shared").classList.add("hidden");$("listView").classList.remove("hidden");renderCurrent();}
function renderCurrent(){
  const l=activeList();if(!l)return;
  $("currentListName").textContent=l.name;
  const done=l.items.filter(i=>i.done).length;
  $("progressBar").style.width=(l.items.length?done/l.items.length*100:0)+"%";
  $("progressText").textContent=done+" מתוך "+l.items.length+" מוצרים נקנו";
  $("itemsOpen").innerHTML=l.items.filter(i=>!i.done).map(itemHTML).join("")||'<div class="empty">כל הכבוד! אין מוצרים ברשימה 🎉</div>';
  $("itemsDone").innerHTML=l.items.filter(i=>i.done).map(itemHTML).join("")||'<p class="small muted">עוד לא סומנו מוצרים שנקנו</p>';
  document.querySelectorAll("[data-item]").forEach(c=>c.onchange=async()=>{try{await api("/api/items","PATCH",{id:c.dataset.item,done:c.checked});await loadLists();renderCurrent();}catch(e){alert(e.message);}});
  document.querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{try{await api("/api/items","DELETE",{id:b.dataset.del});await loadLists();renderCurrent();}catch(e){alert(e.message);}});
  $("shareToggle").classList.toggle("hidden",l.shared);
}
function itemHTML(i){return '<label class="item"><input type="checkbox" data-item="'+esc(i.id)+'" '+(i.done?'checked':'')+'><span class="'+(i.done?'done':'')+'">'+esc(i.name)+'</span><button type="button" class="del" data-del="'+esc(i.id)+'" aria-label="מחיקה">×</button></label>';}
async function addItem(name){
  name=name.trim();if(!name)return;
  try{await api("/api/items","POST",{listId:current,name});$("productInput").value="";await loadLists();renderCurrent();}
  catch(e){alert(e.message);}
}
$("createList").onclick=async()=>{
  const name=$("newListName").value.trim();if(!name)return;
  try{const l=await api("/api/lists","POST",{name});$("newListName").value="";await loadLists();openList(l.id);}
  catch(e){alert(e.message);}
};
$("addProduct").onclick=()=>addItem($("productInput").value);
$("productInput").addEventListener("keydown",e=>{if(e.key==="Enter")addItem(e.target.value);});
$("quickAdd").innerHTML=quick.map(q=>'<button class="quick" data-quick="'+esc(q.slice(3))+'">'+q+'</button>').join("");
document.querySelectorAll("[data-quick]").forEach(b=>b.onclick=()=>addItem(b.dataset.quick));
$("backLists").onclick=()=>{$("listView").classList.add("hidden");$("mine").classList.remove("hidden");renderLists();};
$("logout").onclick=()=>{localStorage.removeItem("family");family=null;current=null;showLogin();};
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x===b));$("mine").classList.toggle("hidden",b.dataset.tab!=="mine");$("shared").classList.toggle("hidden",b.dataset.tab!=="shared");$("listView").classList.add("hidden");});
$("shareToggle").onclick=async()=>{
  const l=activeList();if(!l||l.shared)return;
  const target=prompt("לאיזו משפחה לשתף?\n"+families.filter(f=>f!==family).join("\n"));
  if(!target)return;
  if(!families.includes(target)||target===family){alert("בחרו משפחה מהרשימה.");return;}
  try{await api("/api/share","POST",{listId:current,targetFamily:target});alert("הרשימה שותפה עם "+target);await loadLists();renderCurrent();}
  catch(e){alert(e.message);}
};
$("voiceAdd").onclick=()=>{
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){alert("הכתבה בדפדפן אינה זמינה. אפשר ללחוץ על המיקרופון במקלדת של האייפון.");return;}
  const r=new SR();r.lang="he-IL";r.onresult=e=>addItem(e.results[0][0].transcript);r.onerror=()=>alert("לא הצלחנו לזהות את הדיבור. בדקו הרשאת מיקרופון או השתמשו במיקרופון של המקלדת.");r.start();
};
// סנכרון אוטומטי בין מכשירים כל 12 שניות.
setInterval(async()=>{if(!family||document.hidden)return;try{await loadLists();if(current&&!$("listView").classList.contains("hidden"))renderCurrent();}catch(_){}},12000);
renderFamilies();if(family&&families.includes(family))enter(family);else showLogin();
