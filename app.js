/* Every Pound — offline personal money tracker.
   All data lives in this browser's localStorage. Nothing is transmitted. */
(() => {
  "use strict";
  const LS_KEY = "everyPound.v1";
  const PALETTE = ["#2F6F5B","#B08D3F","#3A6EA5","#8F6F27","#6A8D73","#C58A5A","#4F5D75","#9B6A6C","#5E8B7E","#A9744F","#7C8A99","#436B5D"];

  // ---------- default blank template ----------
  const DEFAULT_CATEGORIES = [
    "Giving / Tithe","Family support","Rent / Housing","Savings transfer","Investment",
    "Debt repayment","Groceries","Transport","Phone / Internet","Subscriptions",
    "Personal spending","Other"
  ];

  const todayMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; };

  const blankState = () => ({
    profileName:"", currency:"£", income:0,
    goal:{ target:0, start:0, date:"" },
    categories: DEFAULT_CATEGORIES.map((n,i)=>({ id:"c"+i+"_"+Math.random().toString(36).slice(2,7), name:n, color:PALETTE[i%PALETTE.length] })),
    budgets:{},           // { categoryId: number }  (shared across months)
    months:{},            // { "YYYY-MM": { actuals:{catId:number}, savedOverride:null } }
    currentMonth: todayMonth()
  });

  let state = load();

  function load(){
    try { const raw = localStorage.getItem(LS_KEY); if(raw){ const s = JSON.parse(raw); if(!s.currentMonth) s.currentMonth = todayMonth(); return s; } }
    catch(e){ console.warn("load failed", e); }
    return blankState();
  }
  function save(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(state)); }catch(e){ toast("Couldn't save — storage may be full"); } }

  function monthData(m){ if(!state.months[m]) state.months[m] = { actuals:{} }; return state.months[m]; }
  const cur = () => state.currency || "£";
  const fmt = (n) => cur() + (isFinite(n)?n:0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  const fmt0 = (n) => cur() + Math.round(isFinite(n)?n:0).toLocaleString();

  function monthLabel(m){ const [y,mo]=m.split("-").map(Number); return new Date(y,mo-1,1).toLocaleDateString(undefined,{month:"long",year:"numeric"}); }
  function shiftMonth(m,delta){ const [y,mo]=m.split("-").map(Number); const d=new Date(y,mo-1+delta,1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }

  // ---------- calculations ----------
  function totals(){
    const md = monthData(state.currentMonth);
    let out = 0;
    state.categories.forEach(c=>{ const a = num(md.actuals[c.id]); out += a; });
    const income = num(state.income);
    const left = income - out;
    const rate = income>0 ? Math.max(0,left)/income : 0;
    return { income, out, left, rate };
  }
  const num = (v)=>{ const n = parseFloat(v); return isFinite(n)?n:0; };

  // ---------- render ----------
  function render(){
    $("#monthLabel").textContent = monthLabel(state.currentMonth);
    const t = totals();
    $("#moneyLeft").textContent = fmt(t.left);
    $("#moneyLeft").style.color = t.left < 0 ? "var(--brick)" : "var(--ink)";
    $("#tileIncome").textContent = fmt0(t.income);
    $("#tileOut").textContent = fmt0(t.out);
    $("#tileSaved").textContent = fmt0(Math.max(0,t.left));
    $("#tileRate").textContent = Math.round(t.rate*100)+"%";
    renderAllocBar(t);
    renderLedger();
    renderGoal(t);
    // settings mirror
    $("#incomeInput").value = state.income || "";
    $("#profileName").value = state.profileName || "";
    document.querySelectorAll("#currencySeg button").forEach(b=>b.classList.toggle("on", b.dataset.cur===cur()));
  }

  function renderAllocBar(t){
    const bar = $("#allocBar"), legend = $("#allocLegend");
    bar.innerHTML=""; legend.innerHTML="";
    const md = monthData(state.currentMonth);
    const income = t.income>0 ? t.income : 1;
    const entries = state.categories
      .map(c=>({ c, val:num(md.actuals[c.id]) }))
      .filter(e=>e.val>0)
      .sort((a,b)=>b.val-a.val);
    entries.forEach(e=>{
      const slice=document.createElement("div");
      slice.className="seg-slice";
      slice.style.width=(e.val/income*100)+"%";
      slice.style.background=e.c.color;
      slice.title=`${e.c.name}: ${fmt(e.val)}`;
      bar.appendChild(slice);
    });
    if(t.left>0){ const s=document.createElement("div"); s.className="seg-slice"; s.style.width=(t.left/income*100)+"%"; s.style.background="var(--line)"; bar.appendChild(s); }
    // legend: top 5
    entries.slice(0,5).forEach(e=>{
      const item=document.createElement("span"); item.className="leg-item";
      item.innerHTML=`<span class="leg-dot" style="background:${e.c.color}"></span>${e.c.name} · ${Math.round(e.val/income*100)}%`;
      legend.appendChild(item);
    });
    if(t.left>0){ const item=document.createElement("span"); item.className="leg-item"; item.innerHTML=`<span class="leg-dot" style="background:var(--line)"></span>Unallocated · ${Math.round(t.left/income*100)}%`; legend.appendChild(item); }
  }

  function renderLedger(){
    const body = $("#ledgerBody"); body.innerHTML="";
    const md = monthData(state.currentMonth);
    state.categories.forEach(c=>{
      const row=document.createElement("div"); row.className="ledger-row"; row.dataset.id=c.id;
      const budget = num(state.budgets[c.id]);
      const actual = num(md.actuals[c.id]);
      const left = budget - actual;
      const leftCls = budget===0 ? "" : (actual>budget ? "over" : "under");
      const leftTxt = budget===0 ? "—" : fmt0(left);
      row.innerHTML = `
        <input class="cat-name" value="${escapeHtml(c.name)}" aria-label="Category name" />
        <input class="cell-input budget" inputmode="decimal" value="${budget||""}" placeholder="0" aria-label="Budget" />
        <input class="cell-input actual" inputmode="decimal" value="${actual||""}" placeholder="0" aria-label="Actual" />
        <span class="cell-left ${leftCls}">${leftTxt}</span>
        <button class="row-del">Remove category</button>`;
      // name
      row.querySelector(".cat-name").addEventListener("input", e=>{ c.name=e.target.value; save(); scheduleLight(); });
      row.querySelector(".cat-name").addEventListener("focus", ()=>row.classList.add("editing"));
      row.querySelector(".cat-name").addEventListener("blur", ()=>setTimeout(()=>row.classList.remove("editing"),150));
      // budget
      row.querySelector(".budget").addEventListener("input", e=>{ state.budgets[c.id]=num(e.target.value); save(); });
      row.querySelector(".budget").addEventListener("blur", render);
      // actual
      row.querySelector(".actual").addEventListener("input", e=>{ md.actuals[c.id]=num(e.target.value); save(); });
      row.querySelector(".actual").addEventListener("blur", render);
      // delete
      row.querySelector(".row-del").addEventListener("click", ()=>{
        if(confirm(`Remove "${c.name}"? Its amounts in every month will be cleared.`)){
          state.categories = state.categories.filter(x=>x.id!==c.id);
          delete state.budgets[c.id];
          Object.values(state.months).forEach(mm=>{ if(mm.actuals) delete mm.actuals[c.id]; });
          save(); render();
        }
      });
      body.appendChild(row);
    });
  }

  function renderGoal(t){
    const g = state.goal||{target:0,start:0,date:""};
    // saved-so-far = start + sum of positive monthly "left" across all recorded months up to & incl current
    let saved = num(g.start);
    Object.keys(state.months).sort().forEach(m=>{
      const md=state.months[m]; let out=0;
      state.categories.forEach(c=>out+=num(md.actuals?.[c.id]));
      const left = num(state.income)-out;
      if(left>0 && hasAnyActual(md)) saved += left;
    });
    const target = num(g.target);
    const pct = target>0 ? Math.min(100, saved/target*100) : 0;
    $("#goalFill").style.width = pct+"%";
    $("#goalCurrent").textContent = fmt0(saved)+" saved";
    $("#goalTarget").textContent = "of "+fmt0(target);
    let note="";
    if(target>0){
      const remaining = Math.max(0, target-saved);
      if(g.date){
        const [gy,gm]=g.date.split("-").map(Number);
        const now=new Date(); const goalD=new Date(gy,gm-1,1);
        const months = (goalD.getFullYear()-now.getFullYear())*12 + (goalD.getMonth()-now.getMonth());
        if(remaining<=0){ note="Goal reached. Set a new target when you're ready."; }
        else if(months>0){ note=`To hit this by ${monthLabel(g.date)}, save about ${fmt0(remaining/months)} more each month for ${months} month${months>1?"s":""}.`; }
        else { note=`Target date has passed. ${fmt0(remaining)} still to go.`; }
      } else if(remaining>0){ note=`${fmt0(remaining)} to go. Add a target date to see the monthly pace you need.`; }
    } else { note="No goal set yet. Tap Edit to add one."; }
    $("#goalNote").textContent = note;
    // mirror editor
    $("#goalTargetInput").value = g.target||"";
    $("#goalStartInput").value = g.start||"";
    $("#goalDateInput").value = g.date||"";
  }
  function hasAnyActual(md){ return md.actuals && Object.values(md.actuals).some(v=>num(v)>0); }

  // ---------- events ----------
  function bind(){
    $("#prevMonth").onclick=()=>{ state.currentMonth=shiftMonth(state.currentMonth,-1); save(); render(); };
    $("#nextMonth").onclick=()=>{ state.currentMonth=shiftMonth(state.currentMonth,1); save(); render(); };
    $("#addCategory").onclick=()=>{
      const id="c_"+Math.random().toString(36).slice(2,9);
      state.categories.push({ id, name:"New category", color:PALETTE[state.categories.length%PALETTE.length] });
      save(); render();
      const rows=document.querySelectorAll(".ledger-row"); const last=rows[rows.length-1];
      if(last){ const nm=last.querySelector(".cat-name"); nm.focus(); nm.select(); }
    };
    // settings
    openClose("#openSettings","#settingsSheet","#settingsBackdrop","#closeSettings");
    $("#incomeInput").addEventListener("input", e=>{ state.income=num(e.target.value); save(); render(); });
    $("#profileName").addEventListener("input", e=>{ state.profileName=e.target.value; save(); });
    document.querySelectorAll("#currencySeg button").forEach(b=>b.onclick=()=>{ state.currency=b.dataset.cur; save(); render(); });
    $("#resetMonth").onclick=()=>{ if(confirm("Clear this month's Actual figures? Budgets stay.")){ monthData(state.currentMonth).actuals={}; save(); render(); toast("This month cleared"); } };
    $("#resetAll").onclick=()=>{ if(confirm("Erase ALL data on this device? This cannot be undone.")){ state=blankState(); save(); render(); closeSheets(); toast("Everything erased"); } };
    // goal
    openClose("#editGoal","#goalSheet","#goalBackdrop","#closeGoal");
    $("#saveGoal").onclick=()=>{ state.goal={ target:num($("#goalTargetInput").value), start:num($("#goalStartInput").value), date:$("#goalDateInput").value }; save(); render(); closeSheets(); toast("Goal saved"); };
    // data
    $("#exportData").onclick=exportData;
    $("#importData").onclick=()=>$("#importFile").click();
    $("#importFile").addEventListener("change", importData);
    // privacy strip
    if(localStorage.getItem("everyPound.privacyDismissed")) $("#privacyStrip").style.display="none";
    $("#dismissPrivacy").onclick=()=>{ $("#privacyStrip").style.display="none"; localStorage.setItem("everyPound.privacyDismissed","1"); };
    // backdrops
    $("#settingsBackdrop").onclick=closeSheets; $("#goalBackdrop").onclick=closeSheets;
  }

  function openClose(openSel, sheetSel, backSel, closeSel){
    $(openSel).onclick=()=>{ $(sheetSel).hidden=false; $(backSel).hidden=false; };
    $(closeSel).onclick=closeSheets;
  }
  function closeSheets(){ ["#settingsSheet","#settingsBackdrop","#goalSheet","#goalBackdrop"].forEach(s=>$(s).hidden=true); }

  function exportData(){
    const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob); const a=document.createElement("a");
    const stamp=new Date().toISOString().slice(0,10);
    a.href=url; a.download=`every-pound-backup-${stamp}.json`; a.click();
    URL.revokeObjectURL(url); toast("Backup downloaded");
  }
  function importData(e){
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=()=>{ try{ const s=JSON.parse(reader.result); if(!s.categories||!s.months) throw 0;
      if(confirm("Replace all current data with this backup?")){ state=s; if(!state.currentMonth) state.currentMonth=todayMonth(); save(); render(); toast("Backup restored"); } }
      catch(err){ toast("That file couldn't be read"); } };
    reader.readAsText(file); e.target.value="";
  }

  // ---------- utils ----------
  let lightTimer; function scheduleLight(){ clearTimeout(lightTimer); lightTimer=setTimeout(renderAllocBar.bind(null,totals()),300); }
  let toastTimer;
  function toast(msg){ const el=$("#toast"); el.textContent=msg; el.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.hidden=true,2200); }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m])); }
  function $(sel){ return document.querySelector(sel); }

  // ---------- boot ----------
  bind(); render();

  if("serviceWorker" in navigator){
    window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
  }
})();
