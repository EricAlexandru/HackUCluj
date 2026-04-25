// SCORE CALCULATION
function calcMatchScore(p) {
  if (!p.minutes || p.minutes < 1) return null;

  // 1. Nota de start
  let base_rating = 6.0;
  
  // 2. Impact Pozitiv
  let points_added = 0.0;
  points_added += (p.goals || 0) * 1.2;
  points_added += (p.assists || 0) * 0.8;
  points_added += (p.successfulKeyPasses || 0) * 0.3;
  points_added += (p.successfulProgressivePasses || 0) * 0.1;
  points_added += (p.successfulDribbles || 0) * 0.15;
  points_added += (p.shotsOnTarget || 0) * 0.2;
  points_added += (p.opponentHalfRecoveries || 0) * 0.1;
  points_added += (p.dangerousOpponentHalfRecoveries || 0) * 0.2;

  // 3. Impact Negativ
  let points_subtracted = 0.0;
  let total_duels = p.duels || 0;
  let duels_won = p.duelsWon || 0;
  
  if (total_duels > 0) {
    let duels_lost = total_duels - duels_won;
    points_subtracted += duels_lost * 0.05;
  }

  points_subtracted += (p.losses || 0) * 0.05;
  points_subtracted += (p.fouls || 0) * 0.1;
  points_subtracted += (p.yellowCards || 0) * 0.4;
  points_subtracted += (p.redCards || 0) * 3.0;

  // 4. Ajustare Acuratețe Pase
  let pass_accuracy = p.passAccuracy || 0;
  let pass_bonus = 0;
  if (pass_accuracy > 90) pass_bonus = 0.4;
  else if (pass_accuracy > 80) pass_bonus = 0.2;
  else if (pass_accuracy > 0 && pass_accuracy < 70) pass_bonus = -0.2;

  // Calcul Final (constrâns între 0 și 10, rotunjit la o zecimală)
  let final_rating = base_rating + points_added - points_subtracted + pass_bonus;
  return Number(Math.min(10, Math.max(0, final_rating)).toFixed(1));
}

function getScoreBreakdown(p) {
  let b = [];
  if (!p.minutes || p.minutes < 1) return b;

  if (p.goals) b.push({ label: 'Goluri', val: p.goals * 1.2, raw: p.goals });
  if (p.assists) b.push({ label: 'Pase de gol', val: p.assists * 0.8, raw: p.assists });
  if (p.successfulKeyPasses) b.push({ label: 'Pase cheie reușite', val: p.successfulKeyPasses * 0.3, raw: p.successfulKeyPasses });
  if (p.successfulProgressivePasses) b.push({ label: 'Pase progresive', val: p.successfulProgressivePasses * 0.1, raw: p.successfulProgressivePasses });
  if (p.successfulDribbles) b.push({ label: 'Driblinguri reușite', val: p.successfulDribbles * 0.15, raw: p.successfulDribbles });
  if (p.shotsOnTarget) b.push({ label: 'Șuturi pe poartă', val: p.shotsOnTarget * 0.2, raw: p.shotsOnTarget });
  if (p.opponentHalfRecoveries) b.push({ label: 'Recuperări (jum. adv.)', val: p.opponentHalfRecoveries * 0.1, raw: p.opponentHalfRecoveries });
  if (p.dangerousOpponentHalfRecoveries) b.push({ label: 'Recuperări periculoase', val: p.dangerousOpponentHalfRecoveries * 0.2, raw: p.dangerousOpponentHalfRecoveries });

  let duels_lost = (p.duels || 0) - (p.duelsWon || 0);
  if (duels_lost > 0) b.push({ label: 'Dueluri pierdute', val: -(duels_lost * 0.05), raw: duels_lost });
  if (p.losses) b.push({ label: 'Pierderi balon', val: -(p.losses * 0.05), raw: p.losses });
  if (p.fouls) b.push({ label: 'Faulturi comise', val: -(p.fouls * 0.1), raw: p.fouls });
  if (p.yellowCards) b.push({ label: 'Cartonașe galbene', val: -(p.yellowCards * 0.4), raw: p.yellowCards });
  if (p.redCards) b.push({ label: 'Cartonașe roșii', val: -(p.redCards * 3.0), raw: p.redCards });

  let pass_accuracy = p.passAccuracy || 0;
  if (pass_accuracy > 90) b.push({ label: 'Acuratețe pase >90%', val: 0.4, raw: `${pass_accuracy}%` });
  else if (pass_accuracy > 80) b.push({ label: 'Acuratețe pase >80%', val: 0.2, raw: `${pass_accuracy}%` });
  else if (pass_accuracy > 0 && pass_accuracy < 70) b.push({ label: 'Acuratețe pase <70%', val: -0.2, raw: `${pass_accuracy}%` });

  return b;
}

function scoreColor(s) {
  if(s>=9) return '#3b82f6';
  if(s>=8) return '#22c55e';
  if(s>=6) return '#eab308';
  return '#ef4444';
}

function scoreClass(s) {
  if(s>=9) return 'score-blue';
  if(s>=8) return 'score-green';
  if(s>=6) return 'score-yellow';
  return 'score-red';
}

// INJURY RISK
function calcInjuryRisk(playerName) {
  // Dacă avem datele GPS încărcate, folosim noul model biomecanic!
  if (window.calculateGPSInjuryRisk && window.TRAINING_GPS_DATA && window.TRAINING_GPS_DATA.length > 0) {
    const gpsRisk = window.calculateGPSInjuryRisk(playerName);
    if (gpsRisk !== null) return gpsRisk;
  }

  // Găsim profilul jucătorului pentru a uniformiza căutarea indiferent dacă primim nume EA sau Wyscout
  const targetPs = findPlayerStats(playerName);
  const targetName = targetPs ? targetPs.Nume : playerName;

  let totalMins=0,totalDuels=0,totalPress=0,matches=0;
  Object.values(window.ALL_MATCH_STATS || {}).forEach(matchStats=>{
    const p = matchStats.find(s => {
      const sPs = findPlayerStats(s.name);
      return sPs ? sPs.Nume === targetName : s.name === targetName;
    });
    if(p && p.minutes > 0){
      totalMins += p.minutes;
      totalDuels += p.duels || 0;
      totalPress += (p.pressingDuels || 0);
      matches++;
    }
  });
  if(totalMins===0) return 0;
  const workload = Math.min(1,(totalMins/(matches*94)))*40;
  const pressing = Math.min(1,(totalPress/totalMins)*90/15)*30;
  const contact = Math.min(1,(totalDuels/totalMins)*90/20)*30;
  return Math.round(workload+pressing+contact);
}

// PLAYER LOOKUP
function findPlayerStats(name) {
  if(!window.PLAYERS_STATS) return null;
  return window.PLAYERS_STATS.find(p => {
    const pn = p.Nume.toLowerCase().trim().replace(/ș/g,'s').replace(/ț/g,'t').replace(/ă/g,'a').replace(/â/g,'a').replace(/î/g,'i');
    const n = name.toLowerCase().trim().replace(/ș/g,'s').replace(/ț/g,'t').replace(/ă/g,'a').replace(/â/g,'a').replace(/î/g,'i');
    
    if (pn === n) return true;

    const nWords = n.replace(/-/g, ' ').replace(/\./g, ' ').split(' ').filter(w => w.length > 0);
    const pnWords = pn.replace(/-/g, ' ').replace(/\./g, ' ').split(' ').filter(w => w.length > 0);
    
    if (nWords.length === 0 || pnWords.length === 0) return false;

    const nLast = nWords[nWords.length - 1];
    const pnLast = pnWords[pnWords.length - 1];

    // 1. Potrivire pe ultimul nume (numele de familie de obicei)
    if (pnLast === nLast) {
      if (nWords.length > 1 && pnWords.length > 1 && nWords[0].charAt(0) !== pnWords[0].charAt(0)) return false;
      return true;
    }

    // 2. Numele Wyscout e complet inclus în cel EA (ex: "A. Popa" in "Alexandru Popa")
    if (nWords.every(w => pnWords.includes(w) || (w.length === 1 && pnWords.some(pw => pw.startsWith(w))))) {
      return true;
    }

    return false;
  });
}