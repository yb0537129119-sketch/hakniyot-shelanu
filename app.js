const families=["משפחת עמר","משפחת בן גיגי","משפחת זכאי","משפחת עוזר","ינון"];
const categories=[["סופר","🛒"],["סופר מיוחד","🥩"],["פארם","💊"],["טמבוריה","🔨"],["סטוק / כלי בית","🏠"],["חיות","🐶"],["אחר","📦"],["עליאקספרס","🛍️"]];
const LOGIN_STORAGE_KEY="shoppingLogin7Days";
const LOGIN_TTL=7*24*60*60*1000;
function readSavedLogin(){
 try{
  const saved=JSON.parse(localStorage.getItem(LOGIN_STORAGE_KEY)||"null");
  if(saved&&saved.expiresAt>Date.now()&&saved.family&&saved.password)return saved;
  localStorage.removeItem(LOGIN_STORAGE_KEY);
 }catch{localStorage.removeItem(LOGIN_STORAGE_KEY)}
 const oldFamily=sessionStorage.getItem("shoppingFamily")||"";
 const oldPassword=sessionStorage.getItem("shoppingPassword")||"";
 return oldFamily&&oldPassword?{family:oldFamily,password:oldPassword}:null;
}
const savedLogin=readSavedLogin();
let family=savedLogin?.family||"", password=savedLogin?.password||"", selected="", currentCategory="", lists=[], busy=false;
function saveLoginForSevenDays(){
 localStorage.setItem(LOGIN_STORAGE_KEY,JSON.stringify({family,password,expiresAt:Date.now()+LOGIN_TTL}));
 sessionStorage.removeItem("shoppingFamily");sessionStorage.removeItem("shoppingPassword");
}
function clearSavedLogin(){
 localStorage.removeItem(LOGIN_STORAGE_KEY);
 sessionStorage.removeItem("shoppingFamily");sessionStorage.removeItem("shoppingPassword");
}
const $=id=>document.getElementById(id);
async function api(path,method="GET",body=null){
  const opts={method,cache:"no-store",credentials:"same-origin"};
  if(method!=="GET"){
    opts.headers={"Accept":"application/json","Content-Type":"application/json"};
    opts.body=JSON.stringify({...body,family,password});
  }
  let response;
  try{response=await fetch(path,opts)}catch(e){
    console.error("API connection failed",path,e);
    throw new Error("החיבור לשרת נכשל. בדקו רשת ונסו שוב.");
  }
  const raw=await response.text();
  let data={};
  if(raw){try{data=JSON.parse(raw)}catch{throw new Error("השרת החזיר תשובה לא תקינה ("+response.status+").")}}
  if(!response.ok)throw new Error(data&&data.error?String(data.error):"שגיאת שרת "+response.status);
  if(!data||typeof data!=="object")throw new Error("השרת החזיר נתונים לא תקינים.");
  return data;
}
function showLogin(){$("login").classList.remove("hidden");$("home").classList.add("hidden");$("categoryPage").classList.add("hidden");}
function renderFamilies(){$("familyChoices").innerHTML=families.map(f=>`<button data-family="${f}">${f}</button>`).join("");document.querySelectorAll("[data-family]").forEach(b=>b.onclick=()=>{selected=b.dataset.family;document.querySelectorAll("[data-family]").forEach(x=>x.style.borderColor=x===b?"#2f6eea":"#d6e3f5")});}
async function login(){if(!selected){$("loginError").textContent="בחרו משפחה";return}const p=$("password").value;family=selected;password=p;try{await loadLists();saveLoginForSevenDays();$("loginError").textContent="";$("login").classList.add("hidden");$("home").classList.remove("hidden");$("subtitle").textContent=family;drawCategories()}catch(e){$("loginError").textContent=e.message}}
async function loadLists(){const d=await api("/api/lists","POST",{action:"load"});lists=d.lists||[];for(const [name] of categories){if(!lists.some(x=>x.name===name)){const l=await api("/api/lists","POST",{name});lists.push(l)}}}
function drawCategories(){$("categories").innerHTML=categories.map(([name,icon])=>{const l=lists.find(x=>x.name===name);const count=l?(l.items||[]).filter(x=>!x.done).length:0;return `<button class="category-card" data-cat="${name}"><span class="chevron">›</span><span class="cat-info"><span class="cat-text"><h2>${name}</h2><p>${count} מוצרים לקנייה</p></span><span class="cat-icon">${icon}</span></span></button>`}).join("");document.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>openCategory(b.dataset.cat));}
function currentList(){return lists.find(x=>x.name===currentCategory)}
function openCategory(name){currentCategory=name;$("home").classList.add("hidden");$("categoryPage").classList.remove("hidden");$("categoryName").textContent=name;$("categoryIcon").textContent=(categories.find(x=>x[0]===name)||[])[1];renderProducts()}
function renderProducts(){const l=currentList(),items=l?.items||[];$("count").textContent=`${items.filter(x=>!x.done).length} מוצרים לקנייה`;$ ("products").innerHTML=items.map(x=>`<label class="product"><input type="checkbox" data-check="${x.id}" ${x.done?"checked":""}><span>${escapeHtml(x.name)}</span><button class="remove" data-remove="${x.id}" type="button">×</button></label>`).join("")||'<div class="product">אין מוצרים ברשימה עדיין</div>';document.querySelectorAll("[data-check]").forEach(c=>c.onchange=async()=>{try{await api("/api/items","PATCH",{id:c.dataset.check,done:c.checked});await refresh()}catch(e){alert(e.message)}});document.querySelectorAll("[data-remove]").forEach(b=>b.onclick=async()=>{try{await api("/api/items","DELETE",{id:b.dataset.remove});await refresh()}catch(e){alert(e.message)}})}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function refresh(){await loadLists();drawCategories();if(currentCategory)renderProducts()}
$("loginBtn").onclick=login;$("familyBtn").onclick=()=>{clearSavedLogin();family="";password="";selected="";$("password").value="";renderFamilies();showLogin()};function applyTheme(theme){document.documentElement.dataset.theme=theme;localStorage.setItem("shoppingTheme",theme);$("lightThemeBtn")?.classList.toggle("active",theme==="light");$("darkThemeBtn")?.classList.toggle("active",theme==="dark");}
function openSettings(){$("settingsPanel").classList.remove("hidden");}
function closeSettings(){$("settingsPanel").classList.add("hidden");}
$("settingsBtn").onclick=openSettings;
$("closeSettings").onclick=closeSettings;
$("lightThemeBtn").onclick=()=>applyTheme("light");
$("darkThemeBtn").onclick=()=>applyTheme("dark");
applyTheme(localStorage.getItem("shoppingTheme")||"light");
let sizeLevel=Math.max(0,Math.min(3,Number(localStorage.getItem("shoppingSizeLevel")||1)));
function applySizeLevel(level){
 sizeLevel=Math.max(0,Math.min(3,level));
 document.documentElement.classList.remove("size-level-0","size-level-1","size-level-2","size-level-3");
 document.documentElement.classList.add("size-level-"+sizeLevel);
 localStorage.setItem("shoppingSizeLevel",String(sizeLevel));
 $("sizeLevelLabel").textContent=["קטן","רגיל","גדול","גדול מאוד"][sizeLevel];
 $("sizeDownBtn").disabled=sizeLevel===0;$("sizeUpBtn").disabled=sizeLevel===3;
}
$("sizeDownBtn").onclick=()=>applySizeLevel(sizeLevel-1);
$("sizeUpBtn").onclick=()=>applySizeLevel(sizeLevel+1);
$("largeTextBtn").onclick=()=>applySizeLevel(1);
applySizeLevel(sizeLevel);
function splitSpokenProducts(text){
 const clean=String(text||"").replace(/[.!?؟؛]/g,",").trim();
 if(!clean)return [];
 const multiWordProducts=[
  "משחת שיניים","סבון תינוקות","סבון כלים","נוזל כלים","נייר טואלט","נייר מגבת",
  "שקיות אשפה","אבקת כביסה","מרכך כביסה","נוזל כביסה","מרכך שיער","שמפו תינוקות",
  "מגבונים לחים","נייר אפייה","נייר כסף","שמן זית","חלב סויה","חלב שקדים",
  "גבינה צהובה","גבינת שמנת","קוטג תנובה","קפה שחור","תה ירוק","לחם אחיד",
  "חזה עוף","בשר טחון","דג סלמון","אורז בסמטי","רסק עגבניות","רוטב סויה",
  "סבון ידיים","קרם גוף","קרם פנים","משחת החתלה","חיתולים לתינוק","מטרנה שלב"
 ].sort((a,b)=>b.split(/\s+/).length-a.split(/\s+/).length);
 const phrases=clean.split(/[,،\n]+/).map(x=>x.trim()).filter(Boolean);
 const output=[];
 for(const phrase of phrases){
  const words=phrase.split(/\s+/).filter(Boolean);
  let i=0;
  while(i<words.length){
   let match="";
   for(const candidate of multiWordProducts){
    const parts=candidate.split(/\s+/);
    const actual=words.slice(i,i+parts.length).join(" ");
    if(actual.localeCompare(candidate,"he",{sensitivity:"base"})===0){match=candidate;break;}
   }
   if(match){output.push(match);i+=match.split(/\s+/).length;}
   else{output.push(words[i]);i++;}
  }
 }
 return output;
}
async function addSpokenProducts(spoken){
 const names=splitSpokenProducts(spoken),l=currentList();
 if(!names.length||!l)return;
 const button=$("voiceBtn");button.disabled=true;button.textContent="⏳";
 let added=0;
 try{
  for(const name of names){await api("/api/items","POST",{listId:l.id,name});added++;}
  await refresh();
  alert(added===1?"המוצר נוסף לרשימה":added+" מוצרים נוספו לרשימה");
 }catch(e){
  await refresh().catch(()=>{});
  alert("נוספו "+added+" מתוך "+names.length+" מוצרים. "+e.message);
 }finally{button.disabled=false;button.textContent="🎤";}
}
function startVoiceInput(){
 const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Speech){alert("הדיבור הישיר לא נתמך בדפדפן הזה. אפשר ללחוץ על המיקרופון במקלדת של האייפון ולהכתיב בשדה המוצר.");$("newProduct").focus();return}
 const recognition=new Speech();recognition.lang="he-IL";recognition.interimResults=false;recognition.maxAlternatives=1;
 const button=$("voiceBtn");button.disabled=true;button.textContent="🎙️ מקשיב…";
 recognition.onresult=e=>{const spoken=e.results?.[0]?.[0]?.transcript?.trim();if(spoken)addSpokenProducts(spoken)};
 recognition.onerror=e=>{if(e.error!=="no-speech"&&e.error!=="aborted")alert("לא הצלחנו לזהות דיבור. אפשר להשתמש במיקרופון של המקלדת.")};
 recognition.onend=()=>{if(button.disabled&&button.textContent==="🎙️ מקשיב…"){button.disabled=false;button.textContent="🎤"}};
 try{recognition.start()}catch{button.disabled=false;button.textContent="🎤"}
}

async function showHistory(){
 const panel=$("historyPanel"),box=$("historyProducts"),l=currentList();
 if(!l)return;
 panel.classList.remove("hidden");box.innerHTML='<div class="product">טוען היסטוריה…</div>';
 try{
  const data=await api("/api/history","POST",{listId:l.id});
  const rows=data.items||[];
  box.innerHTML=rows.length?rows.map(x=>'<div class="history-row"><span>'+escapeHtml(x.itemName)+' <small>נוסף '+Number(x.addCount||1)+' פעמים</small></span><button type="button" data-history-add="'+escapeHtml(x.itemName)+'">הוסף לרשימה</button></div>').join(""):'<div class="product">עדיין אין היסטוריה בקטגוריה הזאת</div>';
  box.querySelectorAll("[data-history-add]").forEach(b=>b.onclick=async()=>{b.disabled=true;try{await api("/api/items","POST",{listId:l.id,name:b.dataset.historyAdd});await refresh();b.textContent="נוסף ✓"}catch(e){b.disabled=false;alert(e.message)}});
 }catch(e){box.innerHTML='<div class="product">'+escapeHtml(e.message)+'</div>'}
}
$("historyBtn").onclick=showHistory;
$("pdfBtn").onclick=()=>window.print();
$("voiceBtn").onclick=startVoiceInput;
$("addBtn").onclick=async()=>{const name=$("newProduct").value.trim(),l=currentList();if(!name||!l)return;try{await api("/api/items","POST",{listId:l.id,name});$("newProduct").value="";await refresh()}catch(e){alert(e.message)}};$("newProduct").addEventListener("keydown",e=>{if(e.key==="Enter")$("addBtn").click()});$("backBtn").onclick=()=>{$("categoryPage").classList.add("hidden");$("home").classList.remove("hidden");currentCategory=""};
renderFamilies();if(family&&password){saveLoginForSevenDays();loadLists().then(()=>{$("login").classList.add("hidden");$("home").classList.remove("hidden");$("subtitle").textContent=family;drawCategories()}).catch(()=>{family="";password="";sessionStorage.clear();showLogin()})}else showLogin();setInterval(()=>{if(family&&password&&!document.hidden)refresh().catch(()=>{})},12000);
