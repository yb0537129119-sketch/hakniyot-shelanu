const families=["משפחת עמר","משפחת בן גיגי","משפחת זכאי","משפחת עוזר","ינון"];
const categories=[
 ["סופר","🛒"],["סופר מיוחד","🥩"],["פארם","💊"],["טמבוריה","🔨"],
 ["סטוק / כלי בית","🏠"],["חיות","🐶"],["אחר","📦"],["עליאקספרס","🛍️"]
];
let family=localStorage.getItem("blueFamily")||"", selected="", currentCategory="";
const $=id=>document.getElementById(id);
const key=()=>`blue-shopping:${family}:${currentCategory}`;
const read=()=>JSON.parse(localStorage.getItem(key())||"[]");
const write=x=>localStorage.setItem(key(),JSON.stringify(x));
function drawCategories(){
 $("categories").innerHTML=categories.map(([name,icon])=>`<button class="category-card" data-cat="${name}">
 <span class="chevron">›</span><span class="cat-info"><span class="cat-text"><h2>${name}</h2><p data-count="${name}">0 מוצרים לקנייה</p></span><span class="cat-icon">${icon}</span></span></button>`).join("");
 document.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>openCategory(b.dataset.cat));
}
function openCategory(name){currentCategory=name;$("home").classList.add("hidden");$("categoryPage").classList.remove("hidden");$("categoryName").textContent=name;$("categoryIcon").textContent=(categories.find(x=>x[0]===name)||[])[1]||"🛍️";renderProducts();}
function renderProducts(){const a=read();$("count").textContent=`${a.filter(x=>!x.done).length} מוצרים לקנייה`;$("products").innerHTML=a.map((x,i)=>`<label class="product"><input type="checkbox" data-check="${i}" ${x.done?"checked":""}><span>${escapeHtml(x.name)}</span><button class="remove" data-remove="${i}" type="button">×</button></label>`).join("")||'<div class="product">אין מוצרים ברשימה עדיין</div>';
 document.querySelectorAll("[data-check]").forEach(c=>c.onchange=()=>{let a=read();a[+c.dataset.check].done=c.checked;write(a);renderProducts();});
 document.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{let a=read();a.splice(+b.dataset.remove,1);write(a);renderProducts();});
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function showLogin(){ $("login").classList.remove("hidden");$("home").classList.add("hidden");}
function renderFamilies(){$("familyChoices").innerHTML=families.map(f=>`<button data-family="${f}">${f}</button>`).join("");document.querySelectorAll("[data-family]").forEach(b=>b.onclick=()=>{selected=b.dataset.family;document.querySelectorAll("[data-family]").forEach(x=>x.style.borderColor=x===b?"#2f6eea":"#d6e3f5");});}
$("loginBtn").onclick=()=>{if(!selected){$("loginError").textContent="בחרו משפחה";return;}const expected={"משפחת עמר":"עמר","משפחת בן גיגי":"בן גיגי","משפחת זכאי":"זכאי","משפחת עוזר":"עוזר","ינון":"ינון"}[selected];if($("password").value!==expected){$("loginError").textContent="סיסמה שגויה";return;}family=selected;localStorage.setItem("blueFamily",family);$("login").classList.add("hidden");$("home").classList.remove("hidden");$("subtitle").textContent=family;drawCategories();};
$("familyBtn").onclick=()=>{selected="";$("password").value="";$("loginError").textContent="";renderFamilies();showLogin();};
$("settingsBtn").onclick=()=>alert("הגדרות — בהמשך");
$("addBtn").onclick=()=>{const n=$("newProduct").value.trim();if(!n)return;let a=read();a.push({name:n,done:false});write(a);$("newProduct").value="";renderProducts();};
$("newProduct").addEventListener("keydown",e=>{if(e.key==="Enter")$("addBtn").click();});
$("backBtn").onclick=()=>{$("categoryPage").classList.add("hidden");$("home").classList.remove("hidden");};
if(family){$("subtitle").textContent=family;drawCategories();}else{renderFamilies();showLogin();}
