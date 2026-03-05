
function watchersFromViews(views){
  const v = Math.max(0, Number(views||0));
  return Math.max(1, Math.ceil(v/5));
}


/*
XEKIE V2 (Static, no backend)
- Category-first request form (modal)
- Stores requests in localStorage
- Public request detail page with views counter
- Demand Radar page (simple trending)
*/

const STORAGE_KEY = "xekie_requests_v2";
const VIEW_KEY_PREFIX = "xekie_viewed_req_"; // per-request unique view per browser

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(2, 8);
}

function nowISO() { return new Date().toISOString(); }

function loadRequests(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }catch(e){ return []; }
}
function saveRequests(reqs){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reqs));
}

// ---------------- Delight (no external assets) ----------------
function _getAudioCtx(){
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if(!Ctx) return null;
  if(!window.__xekieAudioCtx) window.__xekieAudioCtx = new Ctx();
  return window.__xekieAudioCtx;
}

function playWelcomeSound(){
  const ctx = _getAudioCtx();
  if(!ctx) return;
  if(ctx.state === 'suspended') ctx.resume().catch(()=>{});
  const t0 = ctx.currentTime + 0.02;
  const notes = [523.25, 659.25, 783.99]; // C5 E5 G5
  notes.forEach((f,i)=>{
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f, t0 + i*0.06);
    g.gain.setValueAtTime(0.0001, t0 + i*0.06);
    g.gain.exponentialRampToValueAtTime(0.18, t0 + i*0.06 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + i*0.06 + 0.22);
    o.connect(g).connect(ctx.destination);
    o.start(t0 + i*0.06);
    o.stop(t0 + i*0.06 + 0.26);
  });
}

function playApplause(){
  const ctx = _getAudioCtx();
  if(!ctx) return;
  if(ctx.state === 'suspended') ctx.resume().catch(()=>{});
  const t0 = ctx.currentTime + 0.02;
  const duration = 1.6;
  const clapCount = 30;
  for(let i=0;i<clapCount;i++){
    const t = t0 + Math.random()*duration;
    const src = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate*0.06), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for(let j=0;j<data.length;j++) data[j] = (Math.random()*2-1) * Math.exp(-j/(data.length/6));
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22 + Math.random()*0.18, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    if(ctx.createStereoPanner){
      const p = ctx.createStereoPanner();
      p.pan.setValueAtTime((Math.random()*2-1)*0.6, t);
      src.connect(g).connect(p).connect(ctx.destination);
    } else {
      src.connect(g).connect(ctx.destination);
    }
    src.start(t);
    src.stop(t + 0.07);
  }
}

function burstConfetti(pieces=100){
  const overlay = document.createElement('div');
  overlay.className = 'confettiOverlay';
  document.body.appendChild(overlay);
  const colors = ['#22c55e','#3b82f6','#f59e0b','#ef4444','#a855f7','#06b6d4'];
  const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  for(let i=0;i<pieces;i++){
    const el = document.createElement('div');
    el.className = 'confettiPiece';
    el.style.left = Math.round(Math.random()*vw) + 'px';
    el.style.background = colors[i % colors.length];
    el.style.setProperty('--x', (Math.random()*vw) + 'px');
    el.style.setProperty('--drift', ((Math.random()*2-1)*180) + 'px');
    el.style.setProperty('--dur', (1100 + Math.random()*900) + 'ms');
    el.style.width = (6 + Math.random()*8) + 'px';
    el.style.height = (10 + Math.random()*14) + 'px';
    overlay.appendChild(el);
  }
  setTimeout(()=>overlay.remove(), 2200);
}

function ensureMarketPulse(){
  const nav = document.querySelector('.navlinks');
  if(!nav) return;
  if(document.querySelector('.marketPulseWrap')) return;
  const wrap = document.createElement('div');
  wrap.className = 'marketPulseWrap';
  wrap.title = 'Live market pulse (simulated in prototype)';
  wrap.innerHTML = `<span class="marketPulseDot"></span><span class="marketPulseLabel">LIVE MARKET</span>`;
  nav.parentElement?.insertBefore(wrap, nav);
}

function celebrateDeal(){
  burstConfetti(120);
  playApplause();
  toast('Deal completed 🎉');
}

function getMarketStats(){
  const reqs = loadRequests().map(r=>({...r, _left: timeLeft(r)})).filter(r=>!r._left.done);
  const totalSignals = reqs.length;
  const totalDemand = reqs.reduce((s,r)=> s + Number(r.maxPrice||0), 0);
  const byCat = {};
  reqs.forEach(r=>{
    const c = (r.category||"Other");
    byCat[c] = byCat[c] || {count:0, demand:0};
    byCat[c].count += 1;
    byCat[c].demand += Number(r.maxPrice||0);
  });
  return {reqs, totalSignals, totalDemand, byCat};
}

function seedIfEmpty(){
  const reqs = loadRequests();
  if(reqs.length) return;

  const seeded = [
    {
      id: uid(),
      category: "Electronics",
      title: "iPhone 15 Pro Max 256GB (Unlocked)",
      minPrice: 900,
      maxPrice: 1100,
      location: "Akron, OH",
      details: "Looking for excellent condition. Prefer original box/cable. No screen scratches.",
      expiresHours: 48,
      createdAt: nowISO(),
      views: 23,
      offers: 3
    },
    {
      id: uid(),
      category: "Local Services",
      title: "House cleaning (2 bed / 2 bath)",
      minPrice: 100,
      maxPrice: 140,
      location: "Cuyahoga Falls, OH",
      details: "One-time deep clean. Prefer insured cleaner. Flexible schedule this week.",
      expiresHours: 48,
      createdAt: nowISO(),
      views: 18,
      offers: 2
    },
    {
      id: uid(),
      category: "Tools & Equipment",
      title: "Milwaukee M18 drill/driver kit",
      minPrice: 150,
      maxPrice: 220,
      location: "Cleveland, OH",
      details: "Looking for kit with batteries + charger. Used is fine if in good working order.",
      expiresHours: 48,
      createdAt: nowISO(),
      views: 14,
      offers: 1
    },
    {
      id: uid(),
      category: "Trading Cards & Collectibles",
      title: "Pokémon card lot (modern hits)",
      minPrice: 80,
      maxPrice: 140,
      location: "Nationwide (shipping OK)",
      details: "Interested in clean, near-mint modern hits. Bonus for graded slabs (PSA/CGC).",
      expiresHours: 72,
      createdAt: nowISO(),
      views: 31,
      offers: 4
    }
  ];
  saveRequests(seeded);
}

function money(n){ return "$" + Number(n).toLocaleString(undefined,{maximumFractionDigits:0}); }


function buildTickerItems(requests){
  const top = (requests || []).slice(0, 8);
  if(!top.length){
    return [
      { title:"MacBook Pro M3", maxPrice:1600, location:"Ohio", views:44, offers:3 },
      { title:"iPhone 15 Pro Max", maxPrice:950, location:"Nationwide", views:72, offers:5 },
      { title:"Charizard PSA 10", maxPrice:3200, location:"Nationwide", views:38, offers:2 },
      { title:"House cleaning", maxPrice:120, location:"Akron", views:29, offers:1 }
    ];
  }
  return top;
}

function renderTicker(){
  const track = document.getElementById("tickerTrack");
  if(!track) return;

  const reqs = loadRequests();
  const items = buildTickerItems(reqs);

  const html = items.map(r => {
    const x = (Number(r.offers||0) >= 2 || Number(r.views||0) >= 30);
    const hot = (Number(r.offers||0) >= 4 || Number(r.views||0) >= 60);
    const badge = hot ? "🔥 HOT" : (x ? "⚡ X SIGNAL" : "👀 WATCHING");
    const price = money(Number(r.maxPrice||0));
    const loc = (r.location || "Nationwide").toString();
    return `
      <div class="tickerItem">
        <span class="tickerBadge">${badge}</span>
        <span>${escapeHTML(r.title || "Request")}</span>
        <span style="opacity:.7">—</span>
        <span>${price}</span>
        <span style="opacity:.6">• ${escapeHTML(loc)}</span>
      </div>
    `;
  }).join("");

  track.innerHTML = html + html; // duplicate for smooth loop
}

function timeLeft(req){
  const created = new Date(req.createdAt).getTime();
  const ms = (req.expiresHours || 48) * 3600 * 1000;
  const end = created + ms;
  const left = end - Date.now();
  if(left <= 0) return { done:true, text:"Expired" };
  const hrs = Math.floor(left / 3600000);
  const mins = Math.floor((left % 3600000) / 60000);
  return { done:false, text:`${hrs}h ${mins}m` };
}

function renderRequestList(){
  const el = document.getElementById("request_list");
  if(!el) return;

  const reqs = loadRequests()
    .map(r=>({...r, _left: timeLeft(r)}))
    .filter(r=>!r._left.done)
    .sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));

  el.innerHTML = "";

  if(!reqs.length){
    el.innerHTML = `<div class="notice">No active requests yet. Click <b>Post What You Want</b> to create the first one.</div>`;
    return;
  }

  reqs.forEach(r=>{
    const ico = (r.category || "Other").slice(0,1).toUpperCase();
    const a = document.createElement("a");
    a.className = "req";
    a.href = `request.html?id=${encodeURIComponent(r.id)}`;
    a.innerHTML = `
      <div class="ico">${ico}</div>
      <div class="main">
        <div class="title">${escapeHTML(r.title)}</div>
        <div class="meta">
          ${isHot(r) ? `<span class="badge">🔥 HOT REQUEST</span>` : ``}
          ${isXSignal(r) ? `<span class="badge">⚡ X SIGNAL</span>` : ``}
          <span class="badge">${escapeHTML(r.category)}</span>
          <span>Range: <b>${money(r.minPrice)}–${money(r.maxPrice)}</b></span>
          <span>📍 ${escapeHTML(r.location)}</span>
          <span>⏳ ${r._left.text}</span>
          <span>👀 <b>${watchersFromViews(r.views||0)}</b> sellers watching</span>
          <span>⚡ <b>${Number(r.offers||0)}</b> offers</span>
        </div>
      </div>
      <div class="right">
        <div class="smallCaps">Watchers</div>
        <div class="kpi">${watchersFromViews(r.views||0)}</div>
        <div class="smallCaps" style="margin-top:8px">Offers</div>
        <div class="kpi">${Number(r.offers||0)}</div>
      </div>
    `;
    el.appendChild(a);
  });
}

function escapeHTML(s){
  return String(s||"").replace(/[&<>"']/g, (c)=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

function openModal(){
  const bd = document.getElementById("modal_backdrop");
  if(bd) bd.style.display = "flex";
}
function closeModal(){
  const bd = document.getElementById("modal_backdrop");
  if(bd) bd.style.display = "none";
}

function addRequestFromForm(){
  const category = document.getElementById("f_category").value.trim();
  const title = document.getElementById("f_title").value.trim();
  const minPrice = Number(document.getElementById("f_min").value);
  const maxPrice = Number(document.getElementById("f_max").value);
  const location = document.getElementById("f_location").value.trim();
  const details = document.getElementById("f_details").value.trim();
  const expiresHours = Number(document.getElementById("f_expires").value || 48);

  if(!category || !title || !minPrice || !maxPrice || !location || minPrice > maxPrice){
    alert("Please complete the form. Make sure min price is <= max price.");
    return;
  }

  const reqs = loadRequests();
  reqs.unshift({
    id: uid(),
    category, title, minPrice, maxPrice, location, details,
    expiresHours,
    createdAt: nowISO(),
    views: 0,
    offers: 0
  });
  saveRequests(reqs);
  closeModal();
  // reset fields
  document.getElementById("f_title").value = "";
  document.getElementById("f_min").value = "";
  document.getElementById("f_max").value = "";
  document.getElementById("f_location").value = "";
  document.getElementById("f_details").value = "";
  document.getElementById("f_expires").value = "48";
  renderRequestList();
}

function initHome(){
  const btn = document.getElementById("btn_post");
  if(btn) btn.addEventListener("click", openModal);
const qbtn = document.getElementById("btn_quick_post");
  if(qbtn) qbtn.addEventListener("click", ()=>{
    const title = (document.getElementById("q_title")?.value || "").trim();
    const maxP = Number(document.getElementById("q_max")?.value || 0);
    if(!title || !maxP){ alert("Enter what you want and what you will pay (max)."); return; }
    const reqs = loadRequests();
    reqs.unshift({
      id: uid(),
      category: "Electronics",
      title,
      minPrice: Math.max(1, Math.round(maxP*0.85)),
      maxPrice: maxP,
      location: "Nationwide (shipping OK)",
      details: "",
      expiresHours: 48,
      createdAt: nowISO(),
      views: 0,
      offers: 0
    });
    saveRequests(reqs);
    document.getElementById("q_title").value="";
    document.getElementById("q_max").value="";
    renderRequestList();
    window.location.href = `request.html?id=${encodeURIComponent(reqs[0].id)}`;
  });

  const x = document.getElementById("modal_close");
  if(x) x.addEventListener("click", closeModal);

  const bd = document.getElementById("modal_backdrop");
  if(bd) bd.addEventListener("click", (e)=>{ if(e.target === bd) closeModal(); });

  const submit = document.getElementById("btn_submit_request");
  if(submit) submit.addEventListener("click", addRequestFromForm);

  seedIfEmpty();
  renderRequestList();
  renderTicker();
  wirePreview();
  renderMarketActivity();
  renderHeatMap();
  // investor snapshot removed for now
}

function getParam(name){
  const u = new URL(window.location.href);
  return u.searchParams.get(name);
}

function incrementView(req){
  const k = VIEW_KEY_PREFIX + req.id;
  if(localStorage.getItem(k)) return req; // already counted in this browser
  localStorage.setItem(k, "1");
  req.views = Number(req.views||0) + 1;
  return req;
}

function renderRequestDetail(){
  const detail = document.getElementById("request_detail");
  if(!detail) return;

  seedIfEmpty();
  const id = getParam("id");
  const reqs = loadRequests();
  const req = reqs.find(r=>r.id === id) || reqs[0];

  if(!req){
    detail.innerHTML = `<div class="notice">Request not found.</div>`;
    return;
  }

  // increment view and persist
  const updated = incrementView({...req});
  const idx = reqs.findIndex(r=>r.id === req.id);
  if(idx >= 0){
    reqs[idx] = updated;
    saveRequests(reqs);
  }

  const left = timeLeft(updated);
  const isCompleted = !!updated.completedAt;

  detail.innerHTML = `
    <div class="card cardPad">
      <div class="badges">
        <span class="badge">${escapeHTML(updated.category)}</span>
        <span class="badge">⏳ ${left.text}</span>
        ${isHot(updated) ? `<span class="badge">🔥 HOT REQUEST</span>` : ``}
        ${isXSignal(updated) ? `<span class="badge">⚡ X SIGNAL ACTIVE</span>` : ``}
        <span class="badge">👀 ${Number(updated.views||0)} views</span>
        <span class="badge">💬 ${Number(updated.offers||0)} offers</span>
      </div>
      <h2 style="margin:12px 0 6px">${escapeHTML(updated.title)}</h2>
      <div class="sub" style="margin-top:6px">
        Buyer range: <b>${money(updated.minPrice)}–${money(updated.maxPrice)}</b><br/>${Number(updated.offers||0) > 0 ? `Best offer (demo): <b>${money(Math.max(updated.minPrice, Math.round(updated.maxPrice - (updated.maxPrice-updated.minPrice)*0.65)))}</b><br/>` : ``}
        Location: <b>${escapeHTML(updated.location)}</b>
      </div>
      <hr class="sep"/>
      <div class="mini"><b>Details</b></div>
      <div class="sub" style="margin-top:6px">${escapeHTML(updated.details || "—")}</div>

      <hr class="sep"/>

      <div class="ctaRow">
        <button class="btn primary" id="btn_copy">Copy link</button>
        <button class="btn" id="btn_share">Share</button>
        <button class="btn" id="btn_offer">Submit offer (demo)</button>
        ${(!isCompleted && Number(updated.offers||0) > 0) ? `<button class="btn" id="btn_complete">Complete deal 🎉</button>` : ``}
      </div>

      ${isCompleted ? `<div class="notice" style="margin-top:10px">✅ Deal completed. Nice work — trade different.</div>` : ``}

      <div class="notice" style="margin-top:10px">
        Public request page (good for demand broadcasting). In this prototype, offers are simulated.
      </div>
    </div>
  `;

  const copyBtn = document.getElementById("btn_copy");
  if(copyBtn){
    copyBtn.addEventListener("click", async ()=>{
      try{
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied!");
      }catch(e){
        alert("Copy failed. You can manually copy the URL from your browser.");
      }
    });
  }

  const shareBtn = document.getElementById("btn_share");
  if(shareBtn){
    shareBtn.addEventListener("click", async ()=>{
      const text = `I’m trading different.\n\nLooking for: ${updated.title}\nRange: ${money(updated.minPrice)}–${money(updated.maxPrice)}\nLocation: ${updated.location}\n\nSellers can compete:\n${window.location.href}`;
      try{
        if(navigator.share){
          await navigator.share({ title:"XEKIE • Trade Different", text, url: window.location.href });
        }else{
          await navigator.clipboard.writeText(text);
          alert("Share text copied to clipboard!");
        }
      }catch(e){
        // ignore
      }
    });
  }

  const offerBtn = document.getElementById("btn_offer");
  if(offerBtn){
    offerBtn.addEventListener("click", ()=>{
      // simulate an offer to make it feel alive
      const reqs2 = loadRequests();
      const i2 = reqs2.findIndex(r=>r.id === updated.id);
      if(i2 >= 0){
        reqs2[i2].offers = Number(reqs2[i2].offers||0) + 1;
        saveRequests(reqs2);
      }
      alert("Demo: Offer submitted. (In a real build, this would require a seller account.)");
      renderRequestDetail(); // refresh counters
    });
  }

  const completeBtn = document.getElementById("btn_complete");
  if(completeBtn){
    completeBtn.addEventListener("click", ()=>{
      const reqs2 = loadRequests();
      const i2 = reqs2.findIndex(r=>r.id === updated.id);
      if(i2 >= 0){
        reqs2[i2].completedAt = Date.now();
        saveRequests(reqs2);
      }
      celebrateDeal();
      renderRequestDetail();
    });
  }
}


function isXSignal(r){
  return (Number(r.offers||0) >= 2) || (Number(r.views||0) >= 30);
}
function isHot(r){
  return (Number(r.offers||0) >= 4) || (Number(r.views||0) >= 60);
}


function scoreForRadar(r){
  // Simple "demand score" heuristic:
  // views (weight 1) + offers (weight 4) + freshness boost
  const created = new Date(r.createdAt).getTime();
  const ageH = (Date.now() - created) / 3600000;
  const freshness = Math.max(0, 48 - ageH) / 48; // 0..1
  return (Number(r.views||0) * 1) + (Number(r.offers||0) * 4) + (freshness * 10);
}

function renderRadar(){
  const el = document.getElementById("radar");
  if(!el) return;

  seedIfEmpty();
  const reqs = loadRequests().map(r=>({...r, _left: timeLeft(r)})).filter(r=>!r._left.done);

  // top by demand score
  const top = [...reqs].sort((a,b)=>scoreForRadar(b)-scoreForRadar(a)).slice(0, 8);

  // category hotspots
  const byCat = {};
  reqs.forEach(r=>{
    const c = r.category || "Other";
    byCat[c] = (byCat[c]||0) + scoreForRadar(r);
  });
  const cats = Object.entries(byCat).sort((a,b)=>b[1]-a[1]).slice(0,6);

  el.innerHTML = `
    <div class="grid" style="grid-template-columns: 1.2fr .8fr">
      <div class="card">
        <div class="cardPad">
          <h3 style="margin:0 0 6px">Demand Radar</h3>
          <div class="sub" style="margin-top:6px">What’s heating up right now (prototype scoring: views + offers + freshness).</div>
        </div>
        <div class="list">
          ${top.map(r=>{
            const offersCount = Array.isArray(r.offers) ? r.offers.length : Number(r.offers||0);
            const canComplete = offersCount>0 && !r.completedAt;
            return `
            <a class="req" href="request.html?id=${encodeURIComponent(r.id)}">
              <div class="ico">${escapeHTML((r.category||"O").slice(0,1).toUpperCase())}</div>
              <div class="main">
                <div class="title">${escapeHTML(r.title)}</div>
                <div class="meta">
                  <span class="badge">${escapeHTML(r.category)}</span>
                  <span>${money(r.minPrice)}–${money(r.maxPrice)}</span>
                  <span>⏳ ${r._left.text}</span>
          <span>👀 <b>${watchersFromViews(r.views||0)}</b> sellers watching</span>
          <span>⚡ <b>${offersCount}</b> offers</span>
                </div>
              </div>
              <div class="right">
                <div class="smallCaps">Score</div>
                <div class="kpi">${Math.round(scoreForRadar(r))}</div>
                ${canComplete?`<span class="miniComplete" data-id="${escapeHTML(r.id)}">✅ Complete</span>`:''}
              </div>
            </a>
          `
          }).join("")}
        </div>
      </div>

      <div class="card">
        <div class="cardPad">
          <h3 style="margin:0 0 6px">Hot Categories</h3>
          <div class="sub" style="margin-top:6px">Where demand is concentrating.</div>
          <hr class="sep"/>
          ${cats.map(([c,score])=>`
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid rgba(229,231,235,.7)">
              <div style="font-weight:950">${escapeHTML(c)}</div>
              <div class="badge">${Math.round(score)}</div>
            </div>
          `).join("")}
          <div class="notice" style="margin-top:12px">
            V1 is “simple radar.” Later you can add location heatmaps, trend lines, and “similar requests near you.”
          </div>
        </div>
      </div>
    </div>
  `;

  // Mini "complete" actions in the list
  el.querySelectorAll('.miniComplete').forEach(node=>{
    const handler = (e)=>{
      e.preventDefault();
      e.stopPropagation();
      const id = node.getAttribute('data-id');
      if(!id) return;
      const reqs = loadRequests();
      const idx = reqs.findIndex(r=>r.id===id);
      if(idx===-1) return;
      if(reqs[idx].completedAt) return;
      reqs[idx].completedAt = Date.now();
      saveRequests(reqs);
      try{ celebrateDeal(); }catch(_e){}
      renderRadar();
    };
    node.addEventListener('click', handler);
    node.addEventListener('keydown', (e)=>{
      if(e.key==='Enter' || e.key===' ') handler(e);
    });
  });
}

function setActiveNav(){
  const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll(".navlinks a").forEach(a=>{
    const href = (a.getAttribute("href")||"").toLowerCase();
    a.classList.toggle("active", href === path);
  });
}



function initGlobalDemandStrip(){
  const track = document.getElementById("globalDemandTrack");
  if(!track) return;

  const reqs = (typeof loadRequests === "function") ? loadRequests() : [];
  const seeded = [
    {title:"iPhone 15 Pro Max", maxPrice:950, views:12},
    {title:"MacBook Pro M3", max:1600, views:8},
    {title:"Snow tires + install", max:600, views:6},
    {title:"Pokémon booster box (sealed)", max:220, views:10},
    {title:"Kitchen tile cleaning (2 rooms)", max:180, views:5},
    {title:"Milwaukee impact driver kit", max:160, views:7}
  ];

  const list = (reqs && reqs.length ? reqs : seeded)
    .slice()
    .sort((a,b)=> (b.views||0)-(a.views||0))
    .slice(0,10);

  const chips = list.map(r=>{
    const title = escapeHTML(String(r.title||"Request"));
    const max = (r.maxPrice!=null || r.max!=null && r.max!=="") ? `$${escapeHTML(String(r.maxPrice!=null ? r.maxPrice : r.max))}` : "";
    const views = (r.views!=null) ? `${escapeHTML(String(r.views))} views` : "";
    const meta = [max && ("max " + max), views].filter(Boolean).join(" • ");
    return `<span class="demandChip">🔥 <b>${title}</b>${meta ? `<span style="opacity:.85">— ${meta}</span>` : ""}</span>`;
  }).join("");

  // Duplicate content for seamless marquee
  track.innerHTML = chips + chips;

  // Slightly faster when there are only a few chips
  track.style.animationDuration = (list.length <= 4) ? "18s" : "26s";
}

document.addEventListener("DOMContentLoaded", ()=>{
  ensureMarketPulse();
  setActiveNav();
  initGlobalDemandStrip();
  initHome();
  renderRequestDetail();
  renderRadar();

  // Welcome sound for Join/Register (must be user-initiated)
  document.querySelectorAll('a[href="login.html"], a[href="./login.html"]').forEach(a=>{
    a.addEventListener('click', ()=>{ playWelcomeSound(); });
  });
  const joinBetaBtn = document.getElementById('joinBetaBtn');
  if(joinBetaBtn){
    joinBetaBtn.addEventListener('click', ()=>{
      playWelcomeSound();
      toast('Welcome to XEKIE 👋');
    });
  }
});


function wirePreview(){
  const t = document.getElementById("q_title");
  const m = document.getElementById("q_max");
  const pvT = document.getElementById("pvTitle");
  const pvP = document.getElementById("pvPrice");
  if(!t || !m || !pvT || !pvP) return;

  const update = ()=>{
    const title = (t.value||"").trim();
    const maxP = Number(m.value||0);
    pvT.textContent = title ? title : "What do you want?";
    pvP.innerHTML = maxP ? `Buyer offering up to <b>${money(maxP)}</b>` : `What will you pay?`;
  };

  t.addEventListener("input", update);
  m.addEventListener("input", update);
  update();
}

function generateActivity(){
 const feed = document.getElementById("activityFeed")
 if(!feed) return
 const events=[
  "🔥 New buyer request posted",
  "⚡ Seller viewing opportunity",
  "💰 Offer submitted",
  "🔔 Trade executed"
 ]
 const item=document.createElement("div")
 item.className="activityItem"
 item.textContent=events[Math.floor(Math.random()*events.length)]
 feed.prepend(item)
 if(feed.children.length>6) feed.removeChild(feed.lastChild)
}
setInterval(generateActivity,6000)

function renderMarketActivity(){
  const feed = document.getElementById("activityFeed");
  if(!feed) return;

  const templates = [
    (t)=>`🔥 New buyer signal: ${t}`,
    (t)=>`⚡ Seller is watching: ${t}`,
    (t)=>`💰 Offer submitted on: ${t}`,
    (t)=>`🔔 Trade executed (demo): ${t}`
  ];

  const {reqs} = getMarketStats();
  const pickTitle = ()=>{
    if(!reqs.length) return "MacBook Pro M3";
    return String(reqs[Math.floor(Math.random()*reqs.length)].title||"Request");
  };

  const push = ()=>{
    const title = pickTitle();
    const line = templates[Math.floor(Math.random()*templates.length)](title);
    const div = document.createElement("div");
    div.className = "activityItem";
    div.textContent = line;
    feed.prepend(div);
    while(feed.children.length > 7) feed.removeChild(feed.lastChild);
  };

  // seed a few
  for(let i=0;i<4;i++) push();
  setInterval(push, 6500);
}

function renderHeatMap(){
  const grid = document.getElementById("heatGrid");
  if(!grid) return;
  const {byCat} = getMarketStats();
  const cats = ["Electronics","Collectibles","Vehicles","Services","Tools","Other"];
  const items = cats
    .filter(c=> byCat[c] && byCat[c].count)
    .map(c=>({cat:c, ...byCat[c]}))
  if(!items.length){
    grid.innerHTML = '<div class="notice">Post the first buyer signal to light up the market.</div>';
    return;
  }
  const maxCount = Math.max(...items.map(i=>i.count));
  grid.innerHTML = items.map(i=>{
    const intensity = Math.max(0.25, i.count / maxCount);
    const pct = Math.round(intensity*100);
    return `
      <a class="heatTile" href="radar.html">
        <div class="heatTop">
          <div class="heatCat">${escapeHTML(i.cat)}</div>
          <div class="heatCount">🔥 ${i.count} signals</div>
        </div>
        <div class="heatBar"><div class="heatFill" style="width:${pct}%"></div></div>
        <div class="heatSub">$${Math.round(i.demand).toLocaleString()} total demand</div>
      </a>
    `;
  }).join("");
}

// investor snapshot removed for now

function showToast(title, message){
  let t = document.getElementById("xToast");
  if(!t){
    t = document.createElement("div");
    t.id = "xToast";
    t.style.position="fixed";
    t.style.right="16px";
    t.style.bottom="16px";
    t.style.zIndex="9999";
    t.style.maxWidth="360px";
    t.style.padding="12px 14px";
    t.style.borderRadius="14px";
    t.style.background="rgba(11,18,32,.96)";
    t.style.color="#fff";
    t.style.boxShadow="0 10px 30px rgba(0,0,0,.25)";
    t.style.display="none";
    t.innerHTML = '<div id="xToastTitle" style="font-weight:900;margin-bottom:4px"></div><div id="xToastMsg" style="opacity:.9"></div>';
    document.body.appendChild(t);
  }
  document.getElementById("xToastTitle").textContent = title;
  document.getElementById("xToastMsg").textContent = message;
  t.style.display="block";
  clearTimeout(window.__xToastTimer);
  window.__xToastTimer = setTimeout(()=>{ t.style.display="none"; }, 3200);
}

function _todayKey(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function incrementDealsToday(){
  const key = "xekie_deals_"+_todayKey();
  const v = Number(localStorage.getItem(key)||"0")+1;
  localStorage.setItem(key, String(v));
  return v;
}
function getDealsToday(){
  const key = "xekie_deals_"+_todayKey();
  return Number(localStorage.getItem(key)||"0");
}
function renderLiveMarketPulse(){
  const el = document.getElementById("livePulseText");
  if(!el) return;
  const deals = getDealsToday();
  const buyers = Math.max(6, Math.min(32, 10 + Math.floor(Math.random()*14)));
  const offers = Math.max(3, Math.min(40, 6 + Math.floor(Math.random()*18)));
  const msgs = [
    `${buyers} buyers searching`,
    `${offers} offers posted today`,
    `${deals} deals completed today`,
    `market heat rising`,
    `new demand signals incoming`
  ];
  el.textContent = msgs[Math.floor(Math.random()*msgs.length)];
}

setInterval(renderLiveMarketPulse, 4200);

window.addEventListener('DOMContentLoaded', ()=>{ renderLiveMarketPulse(); });


document.addEventListener("DOMContentLoaded", function(){

const upload = document.getElementById("xekieImageUpload");
const preview = document.getElementById("xekiePreview");

if(upload){
upload.addEventListener("change", function(){
const file = this.files[0];
if(!file) return;
const reader = new FileReader();
reader.onload = function(e){
preview.src = e.target.result;
preview.style.display = "block";
};
reader.readAsDataURL(file);
});
}

// Seed demo requests
try{
let existing = JSON.parse(localStorage.getItem("xekieRequests") || "[]");
if(existing.length === 0){
const demo = [
{item:"Pokémon Booster Box (sealed)", price:"220"},
{item:"MacBook Pro M3", price:"1600"},
{item:"Toyota Tacoma 4x4", price:"18000"}
];
localStorage.setItem("xekieRequests", JSON.stringify(demo));
}
}catch(e){}

});
