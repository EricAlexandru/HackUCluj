// TAB NAVIGATION
const tabTitles = {
  squad: 'LOT JUCĂTORI',
  match: 'RAPORT MECI',
  progression: 'PROGRESIE SEZON',
  physical: 'STATISTICI FIZICE',
  shadow: 'SHADOW XI',
  cognitive: 'DEGRADARE COGNITIVĂ'
};

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    // Eliminăm starea activă de pe toate
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    
    // Setăm starea activă pe tab-ul apăsat
    item.classList.add('active');
    
    const tab = item.dataset.tab;
    document.getElementById('tab-' + tab).classList.add('active');
    document.getElementById('tabTitle').textContent = tabTitles[tab];
    
    // Inițializări specifice fiecărui tab
    if(tab === 'match') initMatchReport();
    if(tab === 'progression') initProgression();
    if(tab === 'physical' && typeof initPhysicalStats === 'function') initPhysicalStats();
    if(tab === 'cognitive') {
        // Dacă funcția din cognitive.js există, o apelăm
        if(typeof initCognitiveDashboard === 'function') {
            initCognitiveDashboard();
        }
    }
  });
});

// PLAYER MODAL
function openModal(ps) {
  // Funcție nouă pentru culorile notelor (>= 9 albastru, >= 8 verde, 6-8 galben, < 6 roșu)
  const getScoreColor = (s) => s >= 9 ? '#3b82f6' : s >= 8 ? '#22c55e' : s >= 6 ? '#eab308' : '#ef4444';

  const risk = calcInjuryRisk(ps.Nume);
  const riskClass = risk > 70 ? 'inj-high' : risk > 40 ? 'inj-mid' : 'inj-low';
  const riskLabel = risk > 70 ? '🔴 Risc Mare' : risk > 40 ? '🟡 Monitorizat' : '🟢 OK';

  let scores = [];
  Object.values(window.ALL_MATCH_STATS || {}).forEach(ms => {
    const p = ms.find(s => {
      const sPs = findPlayerStats(s.name);
      return sPs && sPs.Nume === ps.Nume;
    });
    if (p) {
      const sc = calcMatchScore(p);
      if (sc) scores.push(sc);
    }
  });
  
  const avgScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 'N/A';
  const bestScore = scores.length ? Math.max(...scores).toFixed(1) : 'N/A';

  const avgColor = avgScore !== 'N/A' ? getScoreColor(parseFloat(avgScore)) : 'var(--muted)';
  const bestColor = bestScore !== 'N/A' ? getScoreColor(parseFloat(bestScore)) : 'var(--muted)';

  const f = ps.Statistici_Fizice_EA;
  document.getElementById('modalHeader').innerHTML = `
    ${ps.url ? `<img class="modal-photo" src="${ps.url}" alt="${ps.Nume}" onerror="this.src=''">` :
    `<div class="modal-photo" style="display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue';font-size:28px;color:var(--muted)">${ps.Numar_Tricou}</div>`}
    <div>
      <div style="font-family:'Bebas Neue';font-size:26px;color:#fff">${ps.Nume}</div>
      <div style="color:var(--muted);font-size:13px">#${ps.Numar_Tricou} · ${ps.Pozitie}</div>
      <span class="injury-badge ${riskClass}">${riskLabel} · Risc Accidentare ${risk}</span>
    </div>
    <button class="modal-close" onclick="document.getElementById('playerModal').classList.remove('open')">✕</button>`;

  document.getElementById('modalBody').innerHTML = `
    <div class="modal-stats-grid">
      <div class="modal-stat"><div class="ms-val">${ps.Overall_Rating}</div><div class="ms-lbl">Overall</div></div>
      <div class="modal-stat"><div class="ms-val" style="color:${avgColor}">${avgScore}</div><div class="ms-lbl">Scor Mediu</div></div>
      <div class="modal-stat"><div class="ms-val" style="color:${bestColor}">${bestScore}</div><div class="ms-lbl">Best Match</div></div>
      <div class="modal-stat"><div class="ms-val">${f.Pace}</div><div class="ms-lbl">Viteză</div></div>
      <div class="modal-stat"><div class="ms-val">${f.Strength}</div><div class="ms-lbl">Forță</div></div>
      <div class="modal-stat"><div class="ms-val">${f.Stamina}</div><div class="ms-lbl">Rezistență</div></div>
      <div class="modal-stat"><div class="ms-val">${ps.Statistici_Tehnice_EA.Dribbling}</div><div class="ms-lbl">Dribling</div></div>
      <div class="modal-stat"><div class="ms-val">${ps.Statistici_Tehnice_EA.Ball_Control}</div><div class="ms-lbl">Controlul Mingii</div></div>
      <div class="modal-stat"><div class="ms-val">${f.Agility}</div><div class="ms-lbl">Agilitate</div></div>
    </div>
    <div style="margin-top:16px">
      <div style="font-size:12px;color:var(--muted);margin-bottom:8px">FORMĂ (ultime meciuri)</div>
      <div style="display:flex;gap:4px;align-items:flex-end;height:40px">
        ${scores.slice(-8).map(s => `<div style="flex:1;background:${getScoreColor(s)};border-radius:2px;height:${Math.round((s / 10) * 100) + '%'};min-height:4px;opacity:0.8;transition:all 0.3s" title="${s.toFixed(1)}"></div>`).join('')}
      </div>
    </div>`;

  document.getElementById('playerModal').classList.add('open');
}

document.getElementById('playerModal').addEventListener('click', e => {
  if (e.target === document.getElementById('playerModal'))
    document.getElementById('playerModal').classList.remove('open');
});