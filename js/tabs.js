// SQUAD TAB
if (typeof window.squadViewMode === 'undefined') {
    window.squadViewMode = 'pitch';
}

function initSquad() {
  const tabPanel = document.getElementById('tab-squad');
  
  const allPlayers = [...(window.PLAYERS_STATS || [])].sort((a,b) => b.Overall_Rating - a.Overall_Rating);
  
  if (window.squadViewMode === 'list') {
     tabPanel.innerHTML = `
        <div class="prog-controls" style="display:flex; gap:10px; margin-bottom:16px; align-items:center; flex-wrap:wrap;">
          <input type="text" id="squadListSearch" placeholder="Caută jucător sau poziție..." style="flex:1; min-width:180px; max-width:300px; background:#0f1628;color:#fff;border:1px solid rgba(255,255,255,0.1);border-radius:4px;padding:8px 12px;font-size:13px;font-family:'DM Sans';outline:none;">
        </div>
        <div class="squad-grid" id="squadGrid" style="display:flex; flex-wrap:wrap; gap:16px; margin-bottom:24px;"></div>
        <div style="display:flex; justify-content:flex-start; margin-bottom:16px;">
            <button id="toggleSquadViewBtn" class="shadow-btn" style="display:flex; align-items:center; gap:8px;">
                ⚽ AFIȘEAZĂ AȘEZARE TACTICĂ
            </button>
        </div>
     `;
     
     document.getElementById('toggleSquadViewBtn').addEventListener('click', () => {
         window.squadViewMode = 'pitch';
         initSquad();
     });

     const grid = document.getElementById('squadGrid');
     const renderGrid = (query = '') => {
         grid.innerHTML = '';
         let filtered = allPlayers;
         if (query) {
             const q = query.toLowerCase();
             filtered = allPlayers.filter(p => p.Nume.toLowerCase().includes(q) || p.Pozitie.toLowerCase().includes(q));
         }
         filtered.forEach((p, i) => {
             const card = document.createElement('div');
             card.className = 'player-card';
             card.style.animationDelay = (i * 15) + 'ms';
             const photoEl = p.url
               ? `<img class="card-photo" src="${p.url}" alt="${p.Nume}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
               : '';
             const placeholderEl = `<div class="card-photo-placeholder" style="${p.url?'display:none':''}">${p.Numar_Tricou}</div>`;
             card.innerHTML = `
               ${photoEl}${placeholderEl}
               <span class="card-jersey">#${p.Numar_Tricou}</span>
               <span class="card-rating">${p.Overall_Rating}</span>
               <div class="card-info">
                 <div class="card-name">${p.Nume}</div>
                 <div class="card-pos">${p.Pozitie}</div>
               </div>`;
             card.addEventListener('click', () => openModal(p));
             grid.appendChild(card);
         });
     };

     renderGrid();
     document.getElementById('squadListSearch').addEventListener('input', (e) => renderGrid(e.target.value));

     return;
  }

  // Calculăm datele pentru panourile laterale
  let countATT = 0, countMID = 0, countDEF = 0, countGK = 0;
  let totalRating = 0;
  
  allPlayers.forEach(p => {
      totalRating += p.Overall_Rating || 0;
      const pos = p.Pozitie;
      if (['ST','CF','RW','LW'].includes(pos)) countATT++;
      else if (['CAM','CM','RM','LM','CDM'].includes(pos)) countMID++;
      else if (['CB','LB','RB','LWB','RWB'].includes(pos)) countDEF++;
      else if (pos === 'GK') countGK++;
  });
  
  const avgRating = allPlayers.length ? (totalRating / allPlayers.length).toFixed(1) : 0;
  const top3 = allPlayers.slice(0, 3);
  const injuryPlayers = allPlayers.map(p => ({
      ...p, 
      risk: typeof calcInjuryRisk === 'function' ? calcInjuryRisk(p.Nume) : 0
  })).sort((a,b) => b.risk - a.risk).slice(0, 3);

  tabPanel.innerHTML = `
    <div class="squad-layout-wrapper">
      
      <!-- PANOU STÂNGA -->
      <div class="squad-side-panel">
          <div class="panel-header">📊 SQUAD INSIGHTS</div>
          <div class="insight-box">
              <div class="insight-val" style="color:var(--gold);">${avgRating}</div>
              <div class="insight-lbl">Rating Mediu Lot</div>
          </div>
          <div class="insight-box">
              <div class="insight-val">${allPlayers.length}</div>
              <div class="insight-lbl">Jucători Valizi În Lot</div>
          </div>
          <div class="panel-subheader">ADÂNCIME LOT (DEPTH)</div>
          <div class="depth-row"><span>Atacanți (ATT)</span><span class="depth-val">${countATT}</span></div>
          <div class="depth-row"><span>Mijlocași (MID)</span><span class="depth-val">${countMID}</span></div>
          <div class="depth-row"><span>Fundași (DEF)</span><span class="depth-val">${countDEF}</span></div>
          <div class="depth-row"><span>Portari (GK)</span><span class="depth-val">${countGK}</span></div>
          
          <div style="margin-top:auto; padding-top:24px;">
              <button id="toggleSquadViewBtn" class="shadow-btn" style="width:100%; display:flex; align-items:center; justify-content:center; gap:8px;">
                  📋 AFIȘEAZĂ LISTĂ COMPLETĂ
              </button>
          </div>
      </div>

      <!-- PITCH CENTRAL -->
      <div class="squad-center-pitch">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <h3 style="color:var(--gold); font-family:'Bebas Neue'; font-size:24px; margin:0; text-align:center; width:100%;">PRIMUL 11 - SISTEM 4-3-1-2</h3>
        </div>
        <p style="color:var(--muted); font-size:14px; margin-bottom: 20px; text-align:center;">
          Treceți cu mouse-ul peste jucătorii din teren pentru a vizualiza rezervele disponibile.
        </p>
        <div id="pitchContainer" class="formation-pitch"></div>
      </div>

      <!-- PANOU DREAPTA -->
      <div class="squad-side-panel">
          <div class="panel-header">⭐ TOP JUCĂTORI</div>
          <div id="sideTopPlayers"></div>
          
          <div class="panel-header" style="margin-top:24px;">🏥 INJURY WATCH</div>
          <div id="sideInjuryPlayers"></div>
      </div>

    </div>
  `;
  
  document.getElementById('toggleSquadViewBtn').addEventListener('click', () => {
      window.squadViewMode = 'list';
      initSquad();
  });
  
  if (!document.getElementById('pitch-styles')) {
    const style = document.createElement('style');
    style.id = 'pitch-styles';
    style.innerHTML = `
        .squad-layout-wrapper {
            display: flex;
            gap: 24px;
            max-width: 1400px;
            margin: 0 auto;
            height: calc(100vh - 150px);
            align-items: stretch;
            justify-content: center;
        }
        .squad-center-pitch {
            flex: 1;
            min-width: 500px;
            max-width: 800px;
            display: flex;
            flex-direction: column;
        }
        .squad-side-panel {
            width: 260px;
            display: flex;
            flex-direction: column;
            background: rgba(15, 22, 40, 0.6);
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            flex-shrink: 0;
            overflow-y: auto;
        }
        .squad-side-panel::-webkit-scrollbar { width: 4px; }
        .squad-side-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        .panel-header {
            font-family: 'Bebas Neue';
            font-size: 20px;
            color: #fff;
            margin-bottom: 16px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            padding-bottom: 8px;
        }
        .panel-subheader {
            font-size: 11px;
            color: var(--muted);
            font-weight: bold;
            margin: 20px 0 10px 0;
            letter-spacing: 0.5px;
        }
        .insight-box {
            background: rgba(255,255,255,0.03);
            border-radius: 8px;
            padding: 12px;
            text-align: center;
            margin-bottom: 12px;
        }
        .insight-val { font-family: 'Bebas Neue'; font-size: 28px; line-height: 1; color: #fff; }
        .insight-lbl { font-size: 11px; color: var(--muted); text-transform: uppercase; margin-top: 4px; }
        .depth-row {
            display: flex; justify-content: space-between;
            font-size: 13px; color: #c9d0de; padding: 8px 0;
            border-bottom: 1px dashed rgba(255,255,255,0.05);
        }
        .depth-val { font-weight: bold; color: #fff; }
        .side-player-row {
            display: flex; align-items: center; gap: 10px;
            padding: 8px; border-radius: 8px; cursor: pointer;
            transition: background 0.2s; margin-bottom: 4px;
        }
        .side-player-row:hover { background: rgba(255,255,255,0.05); }
        .sp-avatar {
            width: 36px; height: 36px; border-radius: 50%;
            background: rgba(255,255,255,0.1); display: flex;
            align-items: center; justify-content: center;
            font-family: 'Bebas Neue'; font-size: 16px; color: #fff; overflow: hidden;
        }
        .sp-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .sp-info { flex: 1; min-width: 0; }
        .sp-name {
            font-size: 13px; font-weight: 500; color: #fff;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .sp-pos { font-size: 11px; color: var(--muted); }
        .sp-rating, .sp-risk { font-family: 'Bebas Neue'; font-size: 18px; }
        .sp-rating { color: var(--gold); }
        .risk-high { color: var(--red); }
        .risk-med { color: var(--yellow); }
        .risk-low { color: var(--green); }
        
        .formation-pitch {
            position: relative;
            flex: 1;
            width: 100%;
            margin: 0 auto;
            background: radial-gradient(circle at center, #1a243f 0%, #0f1628 100%);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            box-shadow: inset 0 0 60px rgba(0,0,0,0.5), 0 10px 30px rgba(0,0,0,0.5);
        }
        .formation-pitch::before {
            content: '';
            position: absolute;
            top: 50%; left: 0; right: 0;
            height: 1px;
            background: rgba(255,255,255,0.05);
            transform: translateY(-50%);
            z-index: 0;
        }
        .formation-pitch::after {
            content: '';
            position: absolute;
            top: 50%; left: 50%;
            width: 150px; height: 150px;
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            z-index: 0;
        }
        .fifa-svg-lines {
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            z-index: 1;
            pointer-events: none;
        }
        .fifa-svg-lines line {
            stroke: rgba(255, 255, 255, 0.2);
            stroke-width: 3;
        }
        .pitch-slot {
            position: absolute;
            transform: translate(-50%, -50%);
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 140px;
            z-index: 10;
        }
        .pitch-slot:hover {
            z-index: 100;
        }
        .starter-card {
            z-index: 10;
            position: relative;
            transform: scale(0.9);
            transition: transform 0.2s;
        }
        .pitch-slot:hover .starter-card {
            transform: scale(1.05);
            z-index: 30;
        }
        .reserves-list {
            position: absolute;
            display: flex;
            flex-direction: column;
            align-items: center;
            opacity: 0;
            visibility: hidden;
            z-index: 50;
            background: rgba(15, 22, 40, 0.98);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 12px;
            padding: 15px;
            box-shadow: 0 15px 40px rgba(0,0,0,0.9);
            pointer-events: none;
            max-height: 420px;
            overflow-y: auto;
            gap: 10px;
        }
        .align-center .reserves-list { left: 50%; }
        .align-left .reserves-list { left: 0; }
        .align-right .reserves-list { right: 0; }
        .reserves-list::-webkit-scrollbar { width: 4px; }
        .reserves-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        .pitch-slot:hover .reserves-list {
            opacity: 1;
            visibility: visible;
            pointer-events: auto;
        }
        
        /* Meniuri sub jucător */
        .pitch-slot.dir-down .reserves-list { top: 60%; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .pitch-slot.dir-down:hover .reserves-list { top: 100%; }
        .pitch-slot.dir-down.align-center .reserves-list { transform: translateX(-50%) translateY(-10px); }
        .pitch-slot.dir-down.align-center:hover .reserves-list { transform: translateX(-50%) translateY(0); }
        .pitch-slot.dir-down.align-left .reserves-list { transform: translateY(-10px); }
        .pitch-slot.dir-down.align-left:hover .reserves-list { transform: translateY(0); }
        .pitch-slot.dir-down.align-right .reserves-list { transform: translateY(-10px); }
        .pitch-slot.dir-down.align-right:hover .reserves-list { transform: translateY(0); }

        /* Meniuri deasupra jucătorului (pentru fundași) */
        .pitch-slot.dir-up .reserves-list { bottom: 60%; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .pitch-slot.dir-up:hover .reserves-list { bottom: 100%; }
        .pitch-slot.dir-up.align-center .reserves-list { transform: translateX(-50%) translateY(10px); }
        .pitch-slot.dir-up.align-center:hover .reserves-list { transform: translateX(-50%) translateY(0); }
        .pitch-slot.dir-up.align-left .reserves-list { transform: translateY(10px); }
        .pitch-slot.dir-up.align-left:hover .reserves-list { transform: translateY(0); }
        .pitch-slot.dir-up.align-right .reserves-list { transform: translateY(10px); }
        .pitch-slot.dir-up.align-right:hover .reserves-list { transform: translateY(0); }
        .reserves-list .player-card {
            transform: scale(0.9);
            transform-origin: center top;
            margin: 0 0 -15px 0;
            transition: transform 0.2s;
        }
        .reserves-list .player-card:last-child {
            margin-bottom: 0;
        }
        .reserves-list .player-card:hover {
            transform: scale(1);
            z-index: 60;
        }
        .reserves-title {
            font-family: 'Bebas Neue';
            color: var(--gold);
            font-size: 14px;
            margin-bottom: 5px;
            text-align: center;
            white-space: nowrap;
        }
    `;
    document.head.appendChild(style);
  }

  const pitch = document.getElementById('pitchContainer');
  pitch.innerHTML = `
    <svg class="fifa-svg-lines">
      <line x1="35%" y1="12%" x2="65%" y2="12%"/>
      <line x1="35%" y1="12%" x2="50%" y2="30%"/>
      <line x1="65%" y1="12%" x2="50%" y2="30%"/>
      <line x1="50%" y1="30%" x2="20%" y2="50%"/>
      <line x1="50%" y1="30%" x2="50%" y2="50%"/>
      <line x1="50%" y1="30%" x2="80%" y2="50%"/>
      <line x1="20%" y1="50%" x2="50%" y2="50%"/>
      <line x1="50%" y1="50%" x2="80%" y2="50%"/>
      <line x1="20%" y1="50%" x2="15%" y2="72%"/>
      <line x1="50%" y1="50%" x2="38%" y2="72%"/>
      <line x1="50%" y1="50%" x2="62%" y2="72%"/>
      <line x1="80%" y1="50%" x2="85%" y2="72%"/>
      <line x1="15%" y1="72%" x2="38%" y2="72%"/>
      <line x1="38%" y1="72%" x2="62%" y2="72%"/>
      <line x1="62%" y1="72%" x2="85%" y2="72%"/>
      <line x1="38%" y1="72%" x2="50%" y2="88%"/>
      <line x1="62%" y1="72%" x2="50%" y2="88%"/>
    </svg>
  `;

  // Populăm listele din panoul lateral dreapta cu Event Listeners direcți
  const topPlayersContainer = document.getElementById('sideTopPlayers');
  top3.forEach(p => {
      const row = document.createElement('div');
      row.className = 'side-player-row';
      row.innerHTML = `
          <div class="sp-avatar">${p.url ? `<img src="${p.url}">` : p.Numar_Tricou}</div>
          <div class="sp-info">
              <div class="sp-name">${p.Nume}</div>
              <div class="sp-pos">${p.Pozitie}</div>
          </div>
          <div class="sp-rating">${p.Overall_Rating}</div>
      `;
      row.addEventListener('click', () => openModal(p));
      topPlayersContainer.appendChild(row);
  });

  const injuryPlayersContainer = document.getElementById('sideInjuryPlayers');
  injuryPlayers.forEach(p => {
      const row = document.createElement('div');
      row.className = 'side-player-row';
      let riskClass = 'risk-low';
      if (p.risk > 70) riskClass = 'risk-high';
      else if (p.risk > 40) riskClass = 'risk-med';
      
      row.innerHTML = `
          <div class="sp-avatar">${p.url ? `<img src="${p.url}">` : p.Numar_Tricou}</div>
          <div class="sp-info">
              <div class="sp-name">${p.Nume}</div>
              <div class="sp-pos">${p.Pozitie}</div>
          </div>
          <div class="sp-risk ${riskClass}">${p.risk}%</div>
      `;
      row.addEventListener('click', () => openModal(p));
      injuryPlayersContainer.appendChild(row);
  });

  const pickedIds = new Set();

  function pickBest(pool, positions, count) {
      const picked = [];
      for (let i = 0; i < pool.length && picked.length < count; i++) {
          if (!pickedIds.has(pool[i].Nume) && positions.includes(pool[i].Pozitie)) {
              picked.push(pool[i]);
              pickedIds.add(pool[i].Nume);
          }
      }
      for (let i = 0; i < pool.length && picked.length < count; i++) {
          if (!pickedIds.has(pool[i].Nume)) {
              picked.push(pool[i]);
              pickedIds.add(pool[i].Nume);
          }
      }
      return picked;
  }

  const fwd = pickBest(allPlayers, ['ST', 'CF', 'RW', 'LW'], 2);
  const cam = pickBest(allPlayers, ['CAM', 'CM', 'RM', 'LM'], 1);
  const mid = pickBest(allPlayers, ['CM', 'CDM', 'RM', 'LM'], 3);
  const lb = pickBest(allPlayers, ['LB', 'LWB'], 1);
  const cb = pickBest(allPlayers, ['CB'], 2);
  const rb = pickBest(allPlayers, ['RB', 'RWB'], 1);
  const def = [lb[0], cb[0], cb[1], rb[0]].filter(Boolean);
  const gk = pickBest(allPlayers, ['GK'], 1);

  // Grupăm restul jucătorilor în rezerve după poziție
  const unpicked = allPlayers.filter(p => !pickedIds.has(p.Nume));
  const buckets = { fwd: [], cam: [], cm: [], lb: [], cb: [], rb: [], gk: [] };
  
  unpicked.forEach(p => {
      if (['GK'].includes(p.Pozitie)) buckets.gk.push(p);
      else if (['CB'].includes(p.Pozitie)) buckets.cb.push(p);
      else if (['LB', 'LWB'].includes(p.Pozitie)) buckets.lb.push(p);
      else if (['RB', 'RWB'].includes(p.Pozitie)) buckets.rb.push(p);
      else if (['CAM'].includes(p.Pozitie)) buckets.cam.push(p);
      else if (['CM', 'CDM', 'RM', 'LM'].includes(p.Pozitie)) buckets.cm.push(p);
      else if (['ST', 'CF', 'RW', 'LW'].includes(p.Pozitie)) buckets.fwd.push(p);
      else buckets.cm.push(p); // Fallback pt cele neacoperite
  });

  // Funcție de distribuire uniformă a rezervelor pentru pozițiile cu mai mulți jucători (ex: atacanți)
  function splitArray(array, parts) {
      const result = Array.from({length: parts}, () => []);
      array.forEach((item, i) => result[i % parts].push(item));
      return result;
  }

  const fwdReserves = splitArray(buckets.fwd, 2);
  const cbReserves = splitArray(buckets.cb, 2);
  const cmReserves = splitArray(buckets.cm, 3);

  // Configurația pozițiilor absolute (Titulari + Rezerve)
  const playersConfig = [
     { starter: fwd[0], reserves: fwdReserves[0], x: 35, y: 12, dir: 'down' },
     { starter: fwd[1], reserves: fwdReserves[1], x: 65, y: 12, dir: 'down' },
     { starter: cam[0], reserves: buckets.cam, x: 50, y: 30, dir: 'down' },
     { starter: mid[0], reserves: cmReserves[0], x: 20, y: 50, dir: 'down' },
     { starter: mid[1], reserves: cmReserves[1], x: 50, y: 50, dir: 'down' },
     { starter: mid[2], reserves: cmReserves[2], x: 80, y: 50, dir: 'down' },
     { starter: def[0], reserves: buckets.lb, x: 15, y: 72, dir: 'up' },
     { starter: def[1], reserves: cbReserves[0], x: 38, y: 72, dir: 'up' },
     { starter: def[2], reserves: cbReserves[1], x: 62, y: 72, dir: 'up' },
     { starter: def[3], reserves: buckets.rb, x: 85, y: 72, dir: 'up' },
     { starter: gk[0], reserves: buckets.gk, x: 50, y: 88, dir: 'up' }
  ];

  function createCardEl(p, delay) {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.style.animationDelay = delay + 'ms';
    if (!p) {
        card.style.opacity = '0.3';
        card.innerHTML = `<div class="card-info"><div class="card-pos">N/A</div></div>`;
        return card;
    }
    const photoEl = p.url
      ? `<img class="card-photo" src="${p.url}" alt="${p.Nume}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : '';
    const placeholderEl = `<div class="card-photo-placeholder" style="${p.url?'display:none':''}">
      ${p.Numar_Tricou}</div>`;
    card.innerHTML = `
      ${photoEl}${placeholderEl}
      <span class="card-jersey">#${p.Numar_Tricou}</span>
      <span class="card-rating">${p.Overall_Rating}</span>
      <div class="card-info">
        <div class="card-name">${p.Nume}</div>
        <div class="card-pos">${p.Pozitie}</div>
      </div>`;
    card.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevenim click accidental pe elementul parinte
        openModal(p);
    });
    return card;
  }

  let delayAcc = 0;
  playersConfig.forEach(slot => {
      const slotEl = document.createElement('div');
      
      let alignClass = 'align-center';
      if (slot.x <= 25) alignClass = 'align-left';
      else if (slot.x >= 75) alignClass = 'align-right';
      
      slotEl.className = `pitch-slot dir-${slot.dir} ${alignClass}`;
      slotEl.style.left = slot.x + '%';
      slotEl.style.top = slot.y + '%';
      
      const starterWrap = document.createElement('div');
      starterWrap.className = 'starter-card';
      starterWrap.appendChild(createCardEl(slot.starter, delayAcc));
      slotEl.appendChild(starterWrap);
      delayAcc += 30;

      if (slot.reserves && slot.reserves.length > 0) {
          const reservesEl = document.createElement('div');
          reservesEl.className = 'reserves-list';
          reservesEl.innerHTML = `<div class="reserves-title">REZERVE</div>`;
          slot.reserves.forEach(r => {
              reservesEl.appendChild(createCardEl(r, 0));
          });
          slotEl.appendChild(reservesEl);
      }
      pitch.appendChild(slotEl);
  });
}

// MATCH REPORT TAB
let matchChartInst = null;
let matchSortBy = 'score'; // Criteriul de ordonare implicit

function initMatchReport() {
  // Adăugă event listeners pentru butonul de raport AI
  const generateReportBtn = document.getElementById('generateReportBtn');
  const matchSelect = document.getElementById('matchSelect');
  
  if(generateReportBtn) {
    generateReportBtn.addEventListener('click', async () => {
      if(!matchSelect.value) {
        alert('Te rog selectează un meci mai întâi');
        return;
      }
      
      const matchId = parseInt(matchSelect.value);
      const match = window.MATCHES.find(m => m.matchId === matchId);
      const matchData = window.ALL_MATCH_STATS[matchId] || [];
      
      if(matchData.length === 0) {
        alert('Nu sunt disponibile date pentru acest meci');
        return;
      }
      
      // Arată modalul și indică încarcarea
      const modal = document.getElementById('aiReportModal');
      const modalBody = document.getElementById('aiReportModalBody');
      
      modalBody.innerHTML = '<p style="color:var(--gold); text-align:center; padding: 60px 0; font-size: 16px; letter-spacing: 1px;">⏳ SE GENEREAZĂ RAPORTUL AI...</p>';
      modal.classList.add('open');
      
      // Generează raportul
      const report = await generateMatchReport(matchData, match);
      
      if(report && modalBody) {
        // Separăm textul generat de AI în slide-uri pe baza delimitatorului "## "
        const sections = report.split(/##\s+/).filter(p => p.trim() !== '');
        
        let slidesHtml = '';
        sections.forEach((sec, index) => {
            const lines = sec.split('\n');
            const title = lines[0].trim();
            const content = lines.slice(1).join('\n');
            const parsedContent = marked.parse(content);
            
            slidesHtml += `
              <div class="ai-slide ${index === 0 ? 'active' : 'next'}">
                <h3 class="ai-slide-title">${title.replace(/^\d+\.\s*/, '')}</h3>
                <div class="ai-slide-content">${parsedContent}</div>
              </div>
            `;
        });

        // Adăugăm slide-ul suplimentar cu greșelile jucătorilor
        const activePlayers = matchData.filter(p => p.minutes > 0);
        let totalMistakes = 0;
        activePlayers.forEach(p => {
           p.mistakes = (p.losses || 0) + (p.fouls || 0);
           totalMistakes += p.mistakes;
        });
        
        const avgMistakes = activePlayers.length > 0 ? (totalMistakes / activePlayers.length) : 0;

        let mistakesHtml = `<div style="margin-bottom: 20px; color: var(--muted); font-size: 14px; background: rgba(255,255,255,0.03); padding: 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
          Media de greșeli a echipei în acest meci (pierderi + faulturi): <strong style="color:var(--gold); font-size: 18px; margin: 0 4px;">${avgMistakes.toFixed(1)}</strong>
          <br><span style="font-size: 12px; margin-top: 4px; display: inline-block;">Jucătorii care au depășit această medie sunt evidențiați cu <strong style="color:var(--red)">Roșu</strong>, indicând o rată crescută a erorilor individuale.</span>
        </div>`;
        
        mistakesHtml += `<div class="squad-grid" style="grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 16px;">`;

        const sortedPlayers = activePlayers.map(p => ({
            ...p,
            isAboveAvg: p.mistakes > avgMistakes
        })).sort((a, b) => b.mistakes - a.mistakes);

        sortedPlayers.forEach((p, i) => {
            const ps = findPlayerStats(p.name) || {};
            const photoEl = ps.url
              ? `<img class="card-photo" src="${ps.url}" alt="${p.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
              : '';
            const placeholderEl = `<div class="card-photo-placeholder" style="${ps.url?'display:none':''}">${ps.Numar_Tricou || '?'}</div>`;
            
            const isBad = p.isAboveAvg;
            const cardStyle = isBad 
              ? 'border: 1px solid rgba(239, 68, 68, 0.6); box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2);' 
              : 'opacity: 0.85; border: 1px solid rgba(255,255,255,0.05); box-shadow: none;';
              
            let errorsHtml = '';
            if (isBad) {
                errorsHtml = `
                  <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed rgba(239, 68, 68, 0.3); font-size: 11px; color: #fca5a5; line-height: 1.5;">
                    <strong style="color:#ef4444; font-size: 12px;">⚠️ ${p.mistakes} Greșeli:</strong><br>
                    ${p.losses > 0 ? `• ${p.losses} pierderi de balon<br>` : ''}
                    ${p.dangerousOwnHalfLosses > 0 ? `<span style="padding-left:8px; color:#f87171">- din care ${p.dangerousOwnHalfLosses} periculoase</span><br>` : ''}
                    ${p.fouls > 0 ? `• ${p.fouls} faulturi comise<br>` : ''}
                  </div>
                `;
            } else {
                errorsHtml = `
                  <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed rgba(255,255,255,0.1); font-size: 11px; color: var(--muted);">
                    ✅ ${p.mistakes} greșeli (Sub medie)
                  </div>
                `;
            }

            mistakesHtml += `
              <div class="player-card" style="animation-delay: ${i*15}ms; cursor: default; ${cardStyle}">
                 ${photoEl}${placeholderEl}
                 <span class="card-jersey">#${ps.Numar_Tricou || '?'}</span>
                 <div class="card-info" style="padding-bottom: 14px;">
                   <div class="card-name" style="font-size:14px; white-space: normal;">${p.name}</div>
                   <div class="card-pos">${(p.position || ps.Pozitie || '').toUpperCase()} · ${p.minutes}' jucate</div>
                   ${errorsHtml}
                 </div>
              </div>
            `;
        });

        mistakesHtml += `</div>`;

        slidesHtml += `
          <div class="ai-slide ${sections.length === 0 ? 'active' : 'next'}">
            <h3 class="ai-slide-title">🔍 ANALIZĂ GREȘELI INDIVIDUALE</h3>
            <div class="ai-slide-content">${mistakesHtml}</div>
          </div>
        `;

        const totalSlides = sections.length + 1;
        modalBody.innerHTML = `
          <div class="ai-slideshow">
            <div class="ai-slides-wrapper">
              ${slidesHtml}
            </div>
            <div class="ai-slides-controls">
              <button class="ai-slide-btn ai-slide-prev" disabled>❮ ÎNAPOI</button>
              <div class="ai-slide-dots">
                ${Array.from({length: totalSlides}).map((_, i) => `<span class="ai-dot ${i===0 ? 'active':''}"></span>`).join('')}
              </div>
              <button class="ai-slide-btn ai-slide-next">ÎNAINTE ❯</button>
            </div>
          </div>
        `;

        // Logica de navigare între slide-uri
        let currentSlide = 0;
        const slides = modalBody.querySelectorAll('.ai-slide');
        const dots = modalBody.querySelectorAll('.ai-dot');
        const prevBtn = modalBody.querySelector('.ai-slide-prev');
        const nextBtn = modalBody.querySelector('.ai-slide-next');

        const updateSlides = () => {
            slides.forEach((s, i) => {
                s.classList.remove('active', 'prev', 'next');
                if (i === currentSlide) s.classList.add('active');
                else if (i < currentSlide) s.classList.add('prev');
                else s.classList.add('next');
            });
            dots.forEach((d, i) => d.classList.toggle('active', i === currentSlide));
            prevBtn.disabled = currentSlide === 0;
            nextBtn.disabled = currentSlide === slides.length - 1;
        };

        prevBtn.addEventListener('click', () => { if(currentSlide > 0) { currentSlide--; updateSlides(); }});
        nextBtn.addEventListener('click', () => { if(currentSlide < slides.length - 1) { currentSlide++; updateSlides(); }});
        dots.forEach((d, i) => d.addEventListener('click', () => { currentSlide = i; updateSlides(); }));
      }
    });
  }
  
  renderMatchReport();
}

// Inchide modalul AI la click pe exterior
document.addEventListener('click', e => {
  const aiModal = document.getElementById('aiReportModal');
  if (e.target === aiModal) {
    aiModal.classList.remove('open');
  }
});

function renderMatchReport() {
  const selectEl = document.getElementById('matchSelect');
  if(!selectEl.value) return;
  const matchId = parseInt(selectEl.value);
  const match = window.MATCHES.find(m=>m.matchId===matchId);
  let stats = window.ALL_MATCH_STATS[matchId] || [];

  const posOrder = { GK: 0, CB: 1, LB: 1, RB: 1, LWB: 1, RWB: 1, CDM: 2, CM: 2, CAM: 2, LW: 3, RW: 3, ST: 4 };

  let scored = stats.map(p=>({...p, score:calcMatchScore(p)}))
    .filter(p=>p.score!==null);

  scored.sort((a,b) => {
    if (matchSortBy === 'name') return a.name.localeCompare(b.name);
    if (matchSortBy === 'position') {
      const pa = posOrder[(a.position || '').toUpperCase()] ?? 99;
      const pb = posOrder[(b.position || '').toUpperCase()] ?? 99;
      if (pa !== pb) return pa - pb;
      return b.score - a.score;
    }
    if (matchSortBy === 'minutes') return b.minutes - a.minutes;
    return b.score - a.score;
  });

  if(scored.length === 0) {
     document.getElementById('matchTeamStats').innerHTML = '<p style="color:var(--muted)">Nu există date pentru acest meci.</p>';
     document.getElementById('motmCard').innerHTML = '';
     document.getElementById('playerRankings').innerHTML = '';
     const existingSort = document.getElementById('matchSortContainer');
     if (existingSort) existingSort.style.display = 'none';
     return;
  }

  // Șterge elementul de afișare al formației în caz că există din randări anterioare
  let formationDisplay = document.getElementById('matchFormationDisplay');
  if (formationDisplay) {
    formationDisplay.remove();
  }

  const totalPasses = scored.reduce((s,p)=>s+(p.passes||0),0);
  const succPasses = scored.reduce((s,p)=>s+(p.successfulPasses||0),0);
  const totalDuels = scored.reduce((s,p)=>s+(p.duels||0),0);
  const wonDuels = scored.reduce((s,p)=>s+(p.duelsWon||0),0);
  const totalXg = scored.reduce((s,p)=>s+(p.xgShot||0),0);
  const avgScore = (scored.reduce((s,p)=>s+p.score,0)/scored.length).toFixed(1);

  document.getElementById('matchTeamStats').innerHTML = `
    <div class="stat-box"><div class="stat-label">Pase Reușite</div><div class="stat-num">${succPasses}/${totalPasses}</div><div class="stat-sub">${totalPasses?Math.round(succPasses/totalPasses*100):0}% acuratețe</div></div>
    <div class="stat-box"><div class="stat-label">Dueluri Câștigate</div><div class="stat-num">${wonDuels}/${totalDuels}</div><div class="stat-sub">${totalDuels?Math.round(wonDuels/totalDuels*100):0}%</div></div>
    <div class="stat-box"><div class="stat-label">xG Total</div><div class="stat-num">${totalXg.toFixed(2)}</div><div class="stat-sub">expected goals</div></div>
    <div class="stat-box"><div class="stat-label">Scor Mediu Echipă</div><div class="stat-num" style="color:${scoreColor(parseFloat(avgScore))}">${avgScore}</div><div class="stat-sub">/10</div></div>`;

  const motm = scored[0];
  const motmPs = findPlayerStats(motm.name) || {};
  document.getElementById('motmCard').innerHTML = `
    <div class="motm-card">
      ${motmPs.url?`<img class="motm-photo" src="${motmPs.url}" alt="${motm.name}">`:
      `<div class="motm-photo" style="display:flex;align-items:center;justify-content:center;font-size:22px;color:var(--gold)">★</div>`}
      <div class="motm-info">
        <div style="font-size:11px;color:var(--gold);margin-bottom:2px">⭐ OMUL MECIULUI</div>
        <h3>${motmPs.Nume||motm.name}</h3>
        <p>${(motmPs.Pozitie||motm.position).toUpperCase()} · ${motm.minutes}' jucate</p>
        <p style="margin-top:4px;font-size:12px;color:var(--muted)">
          ${motm.passes}pase(${motm.passes?Math.round(motm.successfulPasses/motm.passes*100):0}%) · 
          ${motm.duelsWon}/${motm.duels}dueluri · 
          ${motm.recoveries}rec · xG:${motm.xgShot.toFixed(2)}
        </p>
      </div>
      <div class="motm-score">
        <div class="stat-num" style="color:var(--gold)">${motm.score.toFixed(1)}</div>
        <small>scor meci</small>
      </div>
    </div>`;

  const rankings = document.getElementById('playerRankings');
  rankings.innerHTML = '';
  
  let sortContainer = document.getElementById('matchSortContainer');
  if (!sortContainer) {
    sortContainer = document.createElement('div');
    sortContainer.id = 'matchSortContainer';
    sortContainer.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:12px;align-items:center;font-size:12px;color:var(--muted);';
    sortContainer.innerHTML = `
      <span style="font-weight:bold;color:#fff;">CLASAMENT JUCĂTORI</span>
      <div>
        <label for="matchSortSelect" style="margin-right:5px;">Ordonează:</label>
        <select id="matchSortSelect" style="background:#0f1628;color:#fff;border:1px solid rgba(255,255,255,0.1);border-radius:4px;padding:4px 8px;font-size:12px;font-family:'DM Sans';outline:none;cursor:pointer;">
          <option value="score">Rating (Scor)</option>
          <option value="name">Nume</option>
          <option value="position">Poziție</option>
          <option value="minutes">Timp Jucat</option>
        </select>
      </div>`;
    rankings.parentElement.insertBefore(sortContainer, rankings);
    document.getElementById('matchSortSelect').addEventListener('change', e => { matchSortBy = e.target.value; renderMatchReport(); });
  }
  document.getElementById('matchSortSelect').value = matchSortBy;
  sortContainer.style.display = 'flex';

  scored.forEach(p=>{
    const row = document.createElement('div');
    row.className = 'player-row';
    row.style.cursor = 'pointer';
    row.title = 'Click pentru a vedea statisticile și ratingul complet';
    const pct = (p.score/10*100).toFixed(0);
    row.innerHTML = `
      <span class="p-pos" style="color:var(--muted);font-size:11px">${p.position.toUpperCase()}</span>
      <span class="p-name">${p.name}</span>
      <span style="font-size:11px;color:var(--muted);margin-right:8px">${p.minutes}'</span>
      <div class="p-bar-wrap">
        <div class="p-bar ${scoreClass(p.score)}" style="width:${pct}%; background-color:${scoreColor(p.score)}"></div>
      </div>
      <span class="score-badge" style="color:${scoreColor(p.score)}">${p.score.toFixed(1)}</span>`;
      
    row.addEventListener('click', () => openMatchPlayerModal(p));

    rankings.appendChild(row);
  });
}

// MODAL PENTRU JUCĂTOR ÎN MECI (RAPORT MECI)
function openMatchPlayerModal(p) {
  const ps = findPlayerStats(p.name) || {};
  const breakdown = getScoreBreakdown(p);
  
  const getScoreColor = (s) => s >= 9 ? '#3b82f6' : s >= 8 ? '#22c55e' : s >= 6 ? '#eab308' : '#ef4444';
  const scoreColorStr = getScoreColor(p.score);

  document.getElementById('modalHeader').innerHTML = `
    ${ps.url ? `<img class="modal-photo" src="${ps.url}" alt="${p.name}" onerror="this.src=''">` :
    `<div class="modal-photo" style="display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue';font-size:28px;color:var(--muted)">${ps.Numar_Tricou || '?'}</div>`}
    <div>
      <div style="font-family:'Bebas Neue';font-size:26px;color:#fff">${p.name}</div>
      <div style="color:var(--muted);font-size:13px">${(p.position || ps.Pozitie || '').toUpperCase()} · ${p.minutes}' jucate</div>
      <div style="margin-top:6px;">
        <span class="score-badge" style="background:${scoreColorStr}20; color:${scoreColorStr}; border: 1px solid ${scoreColorStr}; font-size:14px; padding:2px 8px; border-radius:4px;">Nota: ${p.score.toFixed(1)}</span>
      </div>
    </div>
    <button class="modal-close" onclick="document.getElementById('playerModal').classList.remove('open')">✕</button>`;

  let statsHtml = `
    <div style="font-size:12px;color:var(--muted);margin-bottom:8px;font-weight:bold;letter-spacing:0.5px;">STATISTICI MECI</div>
    <div class="modal-stats-grid" style="margin-bottom:24px;">
      <div class="modal-stat"><div class="ms-val">${p.goals} / ${p.assists}</div><div class="ms-lbl">Goluri / Pase gol</div></div>
      <div class="modal-stat"><div class="ms-val">${p.successfulPasses}/${p.passes}</div><div class="ms-lbl">Pase (${Math.round(p.passAccuracy)}%)</div></div>
      <div class="modal-stat"><div class="ms-val">${p.duelsWon}/${p.duels}</div><div class="ms-lbl">Dueluri Câștigate</div></div>
      <div class="modal-stat"><div class="ms-val">${p.recoveries}</div><div class="ms-lbl">Recuperări Total</div></div>
      <div class="modal-stat"><div class="ms-val">${p.losses}</div><div class="ms-lbl">Pierderi Balon</div></div>
      <div class="modal-stat"><div class="ms-val">${(p.xgShot || 0).toFixed(2)}</div><div class="ms-lbl">xG Generat</div></div>
      <div class="modal-stat"><div class="ms-val">${p.shotsOnTarget}</div><div class="ms-lbl">Șuturi pe Poartă</div></div>
      <div class="modal-stat"><div class="ms-val">${p.successfulDribbles}/${p.dribbles}</div><div class="ms-lbl">Driblinguri</div></div>
      <div class="modal-stat"><div class="ms-val">${p.fouls}</div><div class="ms-lbl">Faulturi</div></div>
    </div>
  `;

  let dHtml = `<div style="font-size:12px;color:var(--muted);margin-bottom:8px;font-weight:bold;letter-spacing:0.5px;">INFLUENȚĂ ASUPRA RATINGULUI (START: 6.0)</div>`;
  if (breakdown.length > 0) {
     dHtml += `<div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap:8px;">`;
     breakdown.forEach(b => {
         const isPos = b.val > 0;
         const color = isPos ? '#22c55e' : '#ef4444';
         const sign = isPos ? '+' : '';
         const bg = isPos ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)';
         dHtml += `<div style="display:flex; justify-content:space-between; background:${bg}; border: 1px solid ${color}40; padding:8px 12px; border-radius:6px; align-items:center; font-size:12px;">
           <span style="color:#c9d0de;">${b.label} <span style="opacity:0.6; margin-left:4px;">(${b.raw})</span></span>
           <span style="color:${color}; font-weight:bold; font-family:'Bebas Neue'; font-size:16px; letter-spacing:1px;">${sign}${b.val.toFixed(2)}</span>
         </div>`;
     });
     dHtml += `</div>`;
  } else {
     dHtml += `<div style="color:var(--muted); font-size:13px; background:rgba(255,255,255,0.03); padding:10px; border-radius:6px;">Nicio acțiune înregistrată care să modifice scorul de bază.</div>`;
  }

  document.getElementById('modalBody').innerHTML = statsHtml + dHtml;
  document.getElementById('playerModal').classList.add('open');
}

// PROGRESSION TAB
let progChart = null;
let progPlayerSelected = 'team'; // Stocăm starea selecției curente

function initProgression() {
  let wrapper = document.getElementById('progPlayerWrapper');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.id = 'progPlayerWrapper';
    wrapper.className = 'prog-player-wrapper';
    
    wrapper.innerHTML = `
        <div id="progOverlayLeft" class="prog-scroll-overlay left">
          <button id="progScrollLeftMax" class="prog-ctrl-btn" title="La început">«</button>
          <button id="progScrollLeft" class="prog-ctrl-btn" title="Înapoi">❮</button>
        </div>
        <div id="progPlayerGrid" class="prog-player-grid"></div>
        <div id="progOverlayRight" class="prog-scroll-overlay right">
          <button id="progScrollRight" class="prog-ctrl-btn" title="Înainte">❯</button>
          <button id="progScrollRightMax" class="prog-ctrl-btn" title="La sfârșit">»</button>
        </div>
    `;
    
    const controls = document.getElementById('progControls');
    if (controls) controls.parentNode.insertBefore(wrapper, controls.nextSibling);

    const grid = document.getElementById('progPlayerGrid');
    const leftOverlay = document.getElementById('progOverlayLeft');
    const rightOverlay = document.getElementById('progOverlayRight');
    const leftBtn = document.getElementById('progScrollLeft');
    const rightBtn = document.getElementById('progScrollRight');
    const leftMaxBtn = document.getElementById('progScrollLeftMax');
    const rightMaxBtn = document.getElementById('progScrollRightMax');

    // Butoane Săgeată
    leftBtn.addEventListener('click', () => { grid.scrollBy({ left: -300, behavior: 'smooth' }); });
    rightBtn.addEventListener('click', () => { grid.scrollBy({ left: 300, behavior: 'smooth' }); });
    leftMaxBtn.addEventListener('click', () => { grid.scrollTo({ left: 0, behavior: 'smooth' }); });
    rightMaxBtn.addEventListener('click', () => { grid.scrollTo({ left: grid.scrollWidth, behavior: 'smooth' }); });

    // Update vizibilitate săgeți și fade
    const updateButtons = () => {
        leftOverlay.style.opacity = grid.scrollLeft > 10 ? '1' : '0';
        leftOverlay.style.pointerEvents = grid.scrollLeft > 10 ? 'auto' : 'none';
        const maxScroll = grid.scrollWidth - grid.clientWidth;
        rightOverlay.style.opacity = grid.scrollLeft < maxScroll - 10 ? '1' : '0';
        rightOverlay.style.pointerEvents = grid.scrollLeft < maxScroll - 10 ? 'auto' : 'none';
    };
    grid.addEventListener('scroll', updateButtons);
    window.addEventListener('resize', updateButtons);

    // Drag to scroll
    let isDown = false;
    let startX, scrollLeft;

    grid.addEventListener('mousedown', (e) => {
        isDown = true;
        grid.classList.add('dragging');
        startX = e.pageX - grid.offsetLeft;
        scrollLeft = grid.scrollLeft;
    });
    grid.addEventListener('mouseleave', () => { isDown = false; grid.classList.remove('dragging'); });
    grid.addEventListener('mouseup', () => { 
        isDown = false; grid.classList.remove('dragging'); 
        setTimeout(() => { grid.dataset.isDragging = 'false'; }, 50); // reset drag lock
    });
    grid.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - grid.offsetLeft;
        const walk = (x - startX) * 2; // multiplicator viteză
        if (Math.abs(walk) > 5) grid.dataset.isDragging = 'true';
        grid.scrollLeft = scrollLeft - walk;
    });
    
    // Mouse Wheel orizontal adaptat
    grid.addEventListener('wheel', (e) => {
        const isAtStart = grid.scrollLeft === 0;
        const isAtEnd = grid.scrollLeft + grid.clientWidth >= grid.scrollWidth - 1;
        if (e.deltaY > 0 && !isAtEnd) { e.preventDefault(); grid.scrollBy({ left: 300, behavior: 'smooth' }); } 
        else if (e.deltaY < 0 && !isAtStart) { e.preventDefault(); grid.scrollBy({ left: -300, behavior: 'smooth' }); }
    });
  }

  const searchInput = document.getElementById('progSearch');
  const sortSelect = document.getElementById('progSort');
  if (searchInput && !searchInput.dataset.bound) {
    searchInput.addEventListener('input', renderProgressionCards);
    searchInput.dataset.bound = 'true';
  }
  if (sortSelect && !sortSelect.dataset.bound) {
    sortSelect.addEventListener('change', renderProgressionCards);
    sortSelect.dataset.bound = 'true';
  }

  renderProgressionCards();
  renderProgression();
}

function updateProgPlayerHighlight() {
  const container = document.getElementById('progPlayerGrid');
  if (!container) return;
  const cards = container.querySelectorAll('.player-card');
  cards.forEach(card => {
    const key = card.dataset.playerKey;
    if (key === progPlayerSelected) {
      if (key === 'team') {
        card.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.6)';
        card.style.border = '2px solid #3b82f6';
        card.style.transform = 'translateY(-5px)';
      } else {
        card.style.boxShadow = '0 0 15px rgba(251, 191, 36, 0.6)';
        card.style.border = '2px solid #fbbf24';
        card.style.transform = 'translateY(-5px)';
      }
    } else {
      card.style.boxShadow = '';
      card.style.border = '';
      card.style.transform = '';
    }
  });
}

function renderProgressionCards() {
  const container = document.getElementById('progPlayerGrid');
  if (!container) return;
  container.innerHTML = '';

  const searchInput = document.getElementById('progSearch');
  const sortSelect = document.getElementById('progSort');
  const query = searchInput ? searchInput.value.toLowerCase() : '';
  const sortBy = sortSelect ? sortSelect.value : 'rating';

  // 1. Card Medie Echipă (primul element)
  if ("medie echipă".includes(query) || "echipa".includes(query) || query === "") {
    const teamCard = document.createElement('div');
    teamCard.className = 'player-card';
    teamCard.dataset.playerKey = 'team';
    teamCard.style.cssText = 'width:160px; flex-shrink:0; cursor:pointer; transition:all 0.3s; scroll-snap-align: start;';
    if (progPlayerSelected === 'team') {
      teamCard.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.6)';
      teamCard.style.border = '2px solid #3b82f6';
      teamCard.style.transform = 'translateY(-5px)';
    }

    teamCard.innerHTML = `
      <div class="card-photo-placeholder" style="background:rgba(0,61,165,0.8); color:#fff; font-size:32px;">🛡️</div>
      <div class="card-info">
        <div class="card-name">Medie Echipă</div>
        <div class="card-pos">Toți Jucătorii</div>
      </div>`;
    teamCard.onclick = (e) => { 
      if (container.dataset.isDragging === 'true') { e.preventDefault(); return; }
      progPlayerSelected = 'team'; updateProgPlayerHighlight(); renderProgression(); 
    };
    container.appendChild(teamCard);
  }

  // 2. Cardurile Jucătorilor
  let allNames = new Set();
  Object.values(window.ALL_MATCH_STATS).flat().forEach(p => {
     if(p.minutes > 20) allNames.add(p.name);
  });

  let players = [...allNames].map(n => ({ wName: n, ps: findPlayerStats(n) })).filter(obj => obj.ps);

  if (query) {
    players = players.filter(item => item.ps.Nume.toLowerCase().includes(query) || item.ps.Pozitie.toLowerCase().includes(query));
  }

  const posOrder = { GK: 0, CB: 1, LB: 1, RB: 1, LWB: 1, RWB: 1, CDM: 2, CM: 2, CAM: 2, LW: 3, RW: 3, ST: 4 };
  players.sort((a,b) => {
    if (sortBy === 'name') return a.ps.Nume.localeCompare(b.ps.Nume);
    if (sortBy === 'pos') {
      const pa = posOrder[(a.ps.Pozitie || '').toUpperCase()] ?? 99;
      const pb = posOrder[(b.ps.Pozitie || '').toUpperCase()] ?? 99;
      if (pa !== pb) return pa - pb;
      return b.ps.Overall_Rating - a.ps.Overall_Rating;
    }
    return b.ps.Overall_Rating - a.ps.Overall_Rating;
  });

  players.forEach((item, i) => {
    const p = item.ps;

    // Calculăm indicatorul de TREND (Forma recentă: ultimul meci vs meciul anterior)
    let trendHtml = '';
    const validMatchesForTrend = window.MATCHES.filter(m => window.ALL_MATCH_STATS[m.matchId] && window.ALL_MATCH_STATS[m.matchId].length > 0);
    let playerScores = validMatchesForTrend.map(m => {
      const ms = window.ALL_MATCH_STATS[m.matchId] || [];
      const pData = ms.find(s => s.name === item.wName);
      return pData ? calcMatchScore(pData) : null;
    }).filter(s => s !== null);

    if (playerScores.length >= 2) {
      const lastScore = playerScores[playerScores.length - 1];
      const prevScore = playerScores[playerScores.length - 2];
      if (lastScore > prevScore + 0.1) {
        trendHtml = `<span style="color:#22c55e; font-size:12px; margin-left:4px; vertical-align:middle;" title="Formă în creștere">▲</span>`;
      } else if (lastScore < prevScore - 0.1) {
        trendHtml = `<span style="color:#ef4444; font-size:12px; margin-left:4px; vertical-align:middle;" title="Formă în scădere">▼</span>`;
      } else {
        trendHtml = `<span style="color:#8892a4; font-size:12px; margin-left:4px; vertical-align:middle;" title="Formă constantă">▬</span>`;
      }
    }

    const card = document.createElement('div');
    card.className = 'player-card';
    card.dataset.playerKey = item.wName;
    card.style.cssText = `width:160px; flex-shrink:0; cursor:pointer; transition:all 0.3s; animation-delay:${i * 30}ms; scroll-snap-align: start;`;
    
    if (progPlayerSelected === item.wName) {
      card.style.boxShadow = '0 0 15px rgba(251, 191, 36, 0.6)';
      card.style.border = '2px solid #fbbf24';
      card.style.transform = 'translateY(-5px)';
    }

    const photoEl = p.url
      ? `<img class="card-photo" src="${p.url}" alt="${p.Nume}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : '';
    const placeholderEl = `<div class="card-photo-placeholder" style="${p.url?'display:none':''}">${p.Numar_Tricou}</div>`;
    
    card.innerHTML = `
      ${photoEl}${placeholderEl}
      <span class="card-jersey">#${p.Numar_Tricou}</span>
      <span class="card-rating" style="width: auto; padding: 0 8px;">${p.Overall_Rating} ${trendHtml}</span>
      <div class="card-info">
        <div class="card-name">${p.Nume}</div>
        <div class="card-pos">${p.Pozitie}</div>
      </div>`;
    card.onclick = (e) => { 
      if (container.dataset.isDragging === 'true') { e.preventDefault(); return; }
      progPlayerSelected = item.wName; updateProgPlayerHighlight(); renderProgression(); 
    };
    container.appendChild(card);
  });
  
  // Verifică vizibilitatea overlay-ului după generarea conținutului
  setTimeout(() => {
    if (container) container.dispatchEvent(new Event('scroll'));
  });
}

function renderProgression() {
  const selected = progPlayerSelected;
  
  // Excludem meciurile fără date
  const validMatches = window.MATCHES.filter(m => window.ALL_MATCH_STATS[m.matchId] && window.ALL_MATCH_STATS[m.matchId].length > 0);

  const labels = validMatches.map(m=>{
    const d=new Date(m.date);
    return `${d.getDate()}/${d.getMonth()+1} ${m.opponent.split(' ')[0]}`;
  });

  let teamScores = validMatches.map(m=>{
    const ms = window.ALL_MATCH_STATS[m.matchId]||[];
    const scored = ms.map(p=>calcMatchScore(p)).filter(s=>s!==null);
    return scored.length ? parseFloat((scored.reduce((a,b)=>a+b,0)/scored.length).toFixed(2)) : null;
  });

  const ctx = document.getElementById('progressionChart').getContext('2d');
  
  // Creăm un gradient atractiv pentru elementul selectat (echipă sau jucător)
  const activeGradient = ctx.createLinearGradient(0, 0, 0, 300);
  activeGradient.addColorStop(0, selected === 'team' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(251, 191, 36, 0.4)');
  activeGradient.addColorStop(1, 'transparent');

  const datasets = [{
    label:'Medie Echipă',
    data:teamScores,
    borderColor: selected === 'team' ? '#3b82f6' : 'rgba(136, 146, 164, 0.4)',
    backgroundColor: selected === 'team' ? activeGradient : 'transparent',
    fill: selected === 'team',
    borderDash: selected === 'team' ? [] : [5, 5],
    borderWidth: selected === 'team' ? 3 : 2,
    tension: 0.3,
    pointBackgroundColor: selected === 'team' ? teamScores.map(s => s !== null ? scoreColor(s) : '#8892a4') : 'rgba(136, 146, 164, 0.4)',
    pointBorderColor:'#fff',
    pointBorderWidth:2,
    pointRadius: selected === 'team' ? 6 : 0, // Ascundem punctele mediei când analizăm un jucător
    pointHoverRadius:8,
  }];

  let minScore = Math.min(...teamScores.filter(s => s !== null));
  let maxScore = Math.max(...teamScores.filter(s => s !== null));

  if(selected !== 'team') {
    const playerScores = validMatches.map(m=>{
      const ms = window.ALL_MATCH_STATS[m.matchId]||[];
      const p = ms.find(s=>s.name===selected);
      return p ? parseFloat((calcMatchScore(p)||0).toFixed(2)) : null;
    });

    const ptColorsPlayer = playerScores.map(s => s !== null ? scoreColor(s) : '#8892a4');

    datasets.push({
      label: selected,
      data: playerScores,
      borderColor: '#fbbf24',
      backgroundColor: activeGradient,
      fill:true,
      borderWidth: 3,
      tension:0.3,
      pointBackgroundColor:ptColorsPlayer,
      pointBorderColor:'#fff',
      pointBorderWidth:2,
      pointRadius:6,
      pointHoverRadius:8,
    });

    const pMin = Math.min(...playerScores.filter(s => s !== null));
    const pMax = Math.max(...playerScores.filter(s => s !== null));
    if (pMin < minScore) minScore = pMin;
    if (pMax > maxScore) maxScore = pMax;
  }

  // Zoom pe axa Y (se ajustează dinamic în funcție de performanță ca diferențele să fie clare)
  minScore = Math.max(0, Math.floor(minScore) - 1);
  maxScore = Math.min(10, Math.ceil(maxScore) + 1);

  if(progChart) progChart.destroy();
  
  // Plugin pentru indicatorul vertical (Crosshair)
  const crosshairPlugin = {
    id: 'crosshair',
    afterDraw: chart => {
      if (chart.tooltip?._active && chart.tooltip._active.length) {
        const activePoint = chart.tooltip._active[0];
        const ctx = chart.ctx;
        const x = activePoint.element.x;
        const topY = chart.scales.y.top;
        const bottomY = chart.scales.y.bottom;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, topY);
        ctx.lineTo(x, bottomY);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.restore();
      }
    }
  };

  progChart = new Chart(ctx, {
    type:'line',
    data:{labels, datasets},
    plugins: [crosshairPlugin],
    options:{
      responsive:true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins:{
        legend:{labels:{color:'#8892a4',font:{family:'DM Sans'}}},
        tooltip:{
          backgroundColor:'#0f1628',
          borderColor:'rgba(255,255,255,0.1)',
          borderWidth:1,
          titleColor:'#fff',
          bodyColor:'#8892a4',
          callbacks:{
            afterBody:(items)=>{
              const idx=items[0].dataIndex;
              const m=validMatches[idx];
              return [`${m.score} vs ${m.opponent}`,m.phase];
            }
          }
        }
      },
      scales:{
        x:{ticks:{color:'#8892a4',font:{size:10}},grid:{color:'rgba(255,255,255,0.04)'}},
        y:{min:minScore,max:maxScore,ticks:{color:'#8892a4'},grid:{color:'rgba(255,255,255,0.04)'}}
      }
    }
  });

  const totalMatches = window.MATCHES.length;
  const wins = window.MATCHES.filter(m=>{const[g1,g2]=m.score.split('-').map(Number);return g1>g2;}).length;
  const draws = window.MATCHES.filter(m=>{const[g1,g2]=m.score.split('-').map(Number);return g1===g2;}).length;
  const losses = totalMatches - wins - draws;
  const playoffs = window.MATCHES.filter(m=>m.phase==='Play-off').length;

  const winPct = totalMatches ? Math.round((wins / totalMatches) * 100) : 0;
  const drawPct = totalMatches ? Math.round((draws / totalMatches) * 100) : 0;
  const lossPct = totalMatches ? Math.round((losses / totalMatches) * 100) : 0;
  const playPct = totalMatches ? Math.round((playoffs / totalMatches) * 100) : 0;

  document.getElementById('progStats').innerHTML = `
    <div class="prog-widget prog-widget-green">
      <div class="prog-widget-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg></div>
      <div class="prog-widget-title">Victorii</div>
      <div class="prog-widget-value">${wins}</div>
      <div class="prog-widget-context">${winPct}% din totalul meciurilor</div>
    </div>
    <div class="prog-widget prog-widget-yellow">
      <div class="prog-widget-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg></div>
      <div class="prog-widget-title">Egaluri</div>
      <div class="prog-widget-value">${draws}</div>
      <div class="prog-widget-context">${drawPct}% din totalul meciurilor</div>
    </div>
    <div class="prog-widget prog-widget-red">
      <div class="prog-widget-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
      <div class="prog-widget-title">Înfrângeri</div>
      <div class="prog-widget-value">${losses}</div>
      <div class="prog-widget-context">${lossPct}% din totalul meciurilor</div>
    </div>
    <div class="prog-widget prog-widget-gold">
      <div class="prog-widget-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M5 3L2 6"/><path d="M19 3l3 3"/><path d="M12 1v2"/></svg></div>
      <div class="prog-widget-title">Meciuri Play-off</div>
      <div class="prog-widget-value">${playoffs}</div>
      <div class="prog-widget-context">${playPct}% din totalul meciurilor</div>
    </div>`;
}