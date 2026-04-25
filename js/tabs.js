// SQUAD TAB
function initSquad() {
  const grid = document.getElementById('squadGrid');
  grid.innerHTML = '';
  
  const positionOrder = {
    GK: 0,
    CB: 1, LB: 1, RB: 1, LWB: 1, RWB: 1,
    CDM: 2, CM: 2, CAM: 2,
    LW: 3, RW: 3,
    ST: 4
  };
  
  const sorted = [...(window.PLAYERS_STATS || [])].sort((a,b) => {
    const pa = positionOrder[a.Pozitie] ?? 99;
    const pb = positionOrder[b.Pozitie] ?? 99;
    if (pa !== pb) return pa - pb;
    return b.Overall_Rating - a.Overall_Rating;
  });
  sorted.forEach((p,i)=>{
    const card = document.createElement('div');
    card.className = 'player-card';
    card.style.animationDelay = (i*60)+'ms';
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
    card.addEventListener('click',()=>openModal(p));
    grid.appendChild(card);
  });
}

// MATCH REPORT TAB
let matchChartInst = null;
let matchSortBy = 'score'; // Criteriul de ordonare implicit

function initMatchReport() {
  // Adăugă event listeners pentru butonul de raport AI
  const generateReportBtn = document.getElementById('generateReportBtn');
  const closeReportBtn = document.getElementById('closeReportBtn');
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
      
      // Arată containerul și indică încarcarea
      const aiReportContainer = document.getElementById('aiReportContainer');
      const aiReportContent = document.getElementById('aiReportContent');
      
      if(aiReportContainer) {
        aiReportContainer.style.display = 'block';
        aiReportContent.innerHTML = '<p style="color:var(--muted); text-align:center;">⏳ Se genereaza raportul AI...</p>';
      }
      
      // Generează raportul
      const report = await generateMatchReport(matchData, match);
      
      if(report && aiReportContent) {
        aiReportContent.innerHTML = report.split('\n').map(line => {
          if(line.startsWith('##')) {
            return `<h3 style="color:var(--gold); margin-top:16px; margin-bottom:8px; font-size:14px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px;">${line.replace('##', '').trim()}</h3>`;
          } else if(line.startsWith('-')) {
            return `<div style="margin-left:16px; margin-bottom:8px;">${line}</div>`;
          } else if(line.startsWith('**') && line.endsWith('**')) {
            return `<strong>${line.replace(/\*\*/g, '')}</strong>`;
          } else if(line.trim()) {
            return `<p style="margin-bottom:8px;">${line}</p>`;
          }
          return '';
        }).join('');
      }
    });
  }
  
  if(closeReportBtn) {
    closeReportBtn.addEventListener('click', () => {
      const aiReportContainer = document.getElementById('aiReportContainer');
      if(aiReportContainer) {
        aiReportContainer.style.display = 'none';
      }
    });
  }
  
  renderMatchReport();
}

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
  let container = document.getElementById('progPlayerGrid');
  if (!container) {
    container = document.createElement('div');
    container.id = 'progPlayerGrid';
    container.style.cssText = 'display:flex; gap:16px; overflow-x:auto; padding:10px 5px 20px 5px; margin-bottom:20px; scroll-snap-type: x mandatory;';
    const controls = document.getElementById('progControls');
    if (controls) controls.parentNode.insertBefore(container, controls.nextSibling);
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
    teamCard.onclick = () => { progPlayerSelected = 'team'; renderProgressionCards(); renderProgression(); };
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
    const card = document.createElement('div');
    card.className = 'player-card';
    card.style.cssText = `width:160px; flex-shrink:0; cursor:pointer; transition:all 0.3s; animation-delay:${i * 30}ms; scroll-snap-align: start;`;
    
    if (progPlayerSelected === item.wName) {
      card.style.boxShadow = '0 0 15px rgba(200, 168, 75, 0.6)';
      card.style.border = '2px solid #C8A84B';
      card.style.transform = 'translateY(-5px)';
    }

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
    card.onclick = () => { progPlayerSelected = item.wName; renderProgressionCards(); renderProgression(); };
    container.appendChild(card);
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

  // Acum culorile arată clar RATINGUL (rezultatul performanței) în loc de rezultatul meciului
  const ptColorsTeam = teamScores.map(s => s !== null ? scoreColor(s) : '#8892a4');

  const datasets = [{
    label:'Medie Echipă',
    data:teamScores,
    borderColor: selected === 'team' ? '#3b82f6' : 'rgba(59,130,246,0.3)',
    backgroundColor: selected === 'team' ? 'rgba(59,130,246,0.1)' : 'transparent',
    fill:true,
    tension:0.1, // Linie mai dreaptă pentru a accentua vizual schimbările abrupte
    pointBackgroundColor:ptColorsTeam,
    pointBorderColor:'#fff',
    pointBorderWidth:2,
    pointRadius: selected === 'team' ? 6 : 4,
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
      borderColor: '#C8A84B',
      backgroundColor: 'rgba(200,168,75,0.05)',
      fill:false,
      tension:0.1,
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
  const ctx = document.getElementById('progressionChart').getContext('2d');
  progChart = new Chart(ctx, {
    type:'line',
    data:{labels, datasets},
    options:{
      responsive:true,
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

  const wins = window.MATCHES.filter(m=>{const[g1,g2]=m.score.split('-').map(Number);return g1>g2;}).length;
  const draws = window.MATCHES.filter(m=>{const[g1,g2]=m.score.split('-').map(Number);return g1===g2;}).length;
  const losses = window.MATCHES.length - wins - draws;
  document.getElementById('progStats').innerHTML = `
    <div class="stat-box"><div class="stat-label">Victorii</div><div class="stat-num" style="color:var(--green)">${wins}</div></div>
    <div class="stat-box"><div class="stat-label">Egaluri</div><div class="stat-num" style="color:var(--yellow)">${draws}</div></div>
    <div class="stat-box"><div class="stat-label">Înfrângeri</div><div class="stat-num" style="color:var(--red)">${losses}</div></div>
    <div class="stat-box"><div class="stat-label">Meciuri Play-off</div><div class="stat-num" style="color:var(--gold)">${window.MATCHES.filter(m=>m.phase==='Play-off').length}</div></div>`;
}