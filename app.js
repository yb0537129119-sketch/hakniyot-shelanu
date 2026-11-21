const families=["משפחת עמר","משפחת בן גיגי","משפחת זכאי","משפחת עוזר","ינון"];
const categories=[["סופר","🛒"],["סופר מיוחד","🥩"],["פארם","💊"],["טמבוריה","🔨"],["סטוק / כלי בית","🏠"],["חיות","🐶"],["אחר","📦"],["עליאקספרס","🛍️"]];
let family=sessionStorage.getItem("shoppingFamily")||"", password=sessionStorage.getItem("shoppingPassword")||"", selected="", currentCategory="", lists=[], busy=false;
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
async function login(){if(!selected){$("loginError").textContent="בחרו משפחה";return}const p=$("password").value;family=selected;password=p;try{await loadLists();sessionStorage.setItem("shoppingFamily",family);sessionStorage.setItem("shoppingPassword",password);$("loginError").textContent="";$("login").classList.add("hidden");$("home").classList.remove("hidden");$("subtitle").textContent=family;drawCategories()}catch(e){$("loginError").textContent=e.message}}
async function loadLists(){const d=await api("/api/lists","POST",{action:"load"});lists=d.lists||[];for(const [name] of categories){if(!lists.some(x=>x.name===name)){const l=await api("/api/lists","POST",{name});lists.push(l)}}}
function drawCategories(){$("categories").innerHTML=categories.map(([name,icon])=>{const l=lists.find(x=>x.name===name);const count=l?(l.items||[]).filter(x=>!x.done).length:0;return `<button class="category-card" data-cat="${name}"><span class="chevron">›</span><span class="cat-info"><span class="cat-text"><h2>${name}</h2><p>${count} מוצרים לקנייה</p></span><span class="cat-icon">${icon}</span></span></button>`}).join("");document.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>openCategory(b.dataset.cat));}
function currentList(){return lists.find(x=>x.name===currentCategory)}
function openCategory(name){currentCategory=name;$("home").classList.add("hidden");$("categoryPage").classList.remove("hidden");$("categoryName").textContent=name;$("categoryIcon").textContent=(categories.find(x=>x[0]===name)||[])[1];renderProducts()}
function renderProducts(){const l=currentList(),items=l?.items||[];$("count").textContent=`${items.filter(x=>!x.done).length} מוצרים לקנייה`;$ ("products").innerHTML=items.map(x=>`<label class="product"><input type="checkbox" data-check="${x.id}" ${x.done?"checked":""}><span>${escapeHtml(x.name)}</span><button class="remove" data-remove="${x.id}" type="button">×</button></label>`).join("")||'<div class="product">אין מוצרים ברשימה עדיין</div>';document.querySelectorAll("[data-check]").forEach(c=>c.onchange=async()=>{try{await api("/api/items","PATCH",{id:c.dataset.check,done:c.checked});await refresh()}catch(e){alert(e.message)}});document.querySelectorAll("[data-remove]").forEach(b=>b.onclick=async()=>{try{await api("/api/items","DELETE",{id:b.dataset.remove});await refresh()}catch(e){alert(e.message)}})}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function refresh(){await loadLists();drawCategories();if(currentCategory)renderProducts()}
$("loginBtn").onclick=login;$("familyBtn").onclick=()=>{sessionStorage.removeItem("shoppingFamily");sessionStorage.removeItem("shoppingPassword");family="";password="";selected="";$("password").value="";renderFamilies();showLogin()};function applyTheme(theme){document.documentElement.dataset.theme=theme;localStorage.setItem("shoppingTheme",theme);$("lightThemeBtn")?.classList.toggle("active",theme==="light");$("darkThemeBtn")?.classList.toggle("active",theme==="dark");}
function openSettings(){$("settingsPanel").classList.remove("hidden");}
function closeSettings(){$("settingsPanel").classList.add("hidden");}
$("settingsBtn").onclick=openSettings;
$("closeSettings").onclick=closeSettings;
$("lightThemeBtn").onclick=()=>applyTheme("light");
$("darkThemeBtn").onclick=()=>applyTheme("dark");
applyTheme(localStorage.getItem("shoppingTheme")||"light");
function applyLargeText(enabled){document.documentElement.classList.toggle("large-text",enabled);localStorage.setItem("shoppingLargeText",enabled?"1":"0");const b=$("largeTextBtn");if(b){b.setAttribute("aria-pressed",enabled?"true":"false");b.textContent=enabled?"🔎 כתב וכפתורים גדולים — פעיל":"🔎 הגדלת כתב וכפתורים";}}
$("largeTextBtn").onclick=()=>applyLargeText(!document.documentElement.classList.contains("large-text"));
applyLargeText(localStorage.getItem("shoppingLargeText")==="1");
function startVoiceInput(){const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Speech){alert("הדיבור הישיר לא נתמך בדפדפן הזה. אפשר ללחוץ על המיקרופון במקלדת של האייפון ולהכתיב בשדה המוצר.");$("newProduct").focus();return}const recognition=new Speech();recognition.lang="he-IL";recognition.interimResults=false;recognition.maxAlternatives=1;const button=$("voiceBtn");button.disabled=true;button.textContent="🎙️ מקשיב…";recognition.onresult=e=>{const spoken=e.results?.[0]?.[0]?.transcript?.trim();if(spoken){const input=$("newProduct");input.value=(input.value?input.value+" ":"")+spoken;input.focus()}};recognition.onerror=e=>{if(e.error!=="no-speech"&&e.error!=="aborted")alert("לא הצלחנו לזהות דיבור. אפשר להשתמש במיקרופון של המקלדת.")};recognition.onend=()=>{button.disabled=false;button.textContent="🎤"};try{recognition.start()}catch{button.disabled=false;button.textContent="🎤"}}
$("voiceBtn").onclick=startVoiceInput;
$("addBtn").onclick=async()=>{const name=$("newProduct").value.trim(),l=currentList();if(!name||!l)return;try{await api("/api/items","POST",{listId:l.id,name});$("newProduct").value="";await refresh()}catch(e){alert(e.message)}};$("newProduct").addEventListener("keydown",e=>{if(e.key==="Enter")$("addBtn").click()});$("backBtn").onclick=()=>{$("categoryPage").classList.add("hidden");$("home").classList.remove("hidden");currentCategory=""};
renderFamilies();if(family&&password){loadLists().then(()=>{$("login").classList.add("hidden");$("home").classList.remove("hidden");$("subtitle").textContent=family;drawCategories()}).catch(()=>{family="";password="";sessionStorage.clear();showLogin()})}else showLogin();setInterval(()=>{if(family&&password&&!document.hidden)refresh().catch(()=>{})},12000);
