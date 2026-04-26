// Variabile globale
window.PLAYERS_STATS = [];
window.MATCHES = [];
window.WYSCOUT_PLAYERS = {}; 
window.ALL_MATCH_STATS = {};

// Incarca toate datele asincron
async function loadDataAndInit() {
  try {
    const [playersStatsRes, matchesDataRes, playersWyscoutRes] = await Promise.all([
      fetch('./data/players_stats.json'),
      fetch('./data/matches_data.json'),
      fetch('./data/players.json')
    ]);

    window.PLAYERS_STATS = await playersStatsRes.json();
    
    // Eliminăm complet jucătorul Matei Moraru din lot (squad) și din toate statisticile EA
    window.PLAYERS_STATS = window.PLAYERS_STATS.filter(p => p.Nume !== 'Matei Moraru' && p.Nume !== 'Moraru Matei');

    window.MATCHES = await matchesDataRes.json();
    
    const wyscoutData = await playersWyscoutRes.json();
    wyscoutData.players.forEach(p => {
      window.WYSCOUT_PLAYERS[p.wyId] = p.shortName || `${p.firstName} ${p.lastName}`;
    });

    // Încărcăm dinamic fișierele de meci din folderul data/matches/
    for (const m of window.MATCHES) {
      const fileName = `Universitatea Cluj - ${m.opponent}, ${m.score}_players_stats.json`;
      
      try {
        const matchRes = await fetch(`./data/matches/${fileName}`);
        
        if (matchRes.ok) {
          const matchStatsData = await matchRes.json();
          window.ALL_MATCH_STATS[m.matchId] = formatWyscoutData(matchStatsData.players, m.matchId);
        } else {
          console.warn(`Nu am găsit JSON-ul pentru: ${fileName}`);
          window.ALL_MATCH_STATS[m.matchId] = []; 
        }
      } catch (e) {
        window.ALL_MATCH_STATS[m.matchId] = [];
      }
    }

    // Încărcăm datele fizice din fișierele Excel de antrenament
    if (typeof loadPhysicalTrainingData === 'function') {
      await loadPhysicalTrainingData();
    }

    // Inițializare UI
    initSquad();
    if (typeof initPhysicalStats === 'function') {
      initPhysicalStats();
    }

    // Populăm dropdown-ul din UI DOAR cu meciurile care au date încărcate
    const matchSel = document.getElementById('matchSelect');
    [...window.MATCHES].reverse().forEach(m => {
      // Afișăm în listă doar dacă are date din JSON (adică length > 0)
      if (window.ALL_MATCH_STATS[m.matchId] && window.ALL_MATCH_STATS[m.matchId].length > 0) {
          const opt = document.createElement('option');
          opt.value = m.matchId;
          const d = new Date(m.date).toLocaleDateString('ro-RO',{day:'numeric',month:'short',year:'numeric'});
          opt.textContent = `${d} — vs ${m.opponent} (${m.score}) · ${m.phase}`;
          matchSel.appendChild(opt);
      }
    });

    // Randăm raportul meciului automat dacă există meciuri
    if (matchSel.options.length > 0) {
        document.getElementById('matchSelect').addEventListener('change', renderMatchReport);
        renderMatchReport();
    } else {
        document.getElementById('matchTeamStats').innerHTML = '<p style="color:var(--muted)">Nu există meciuri încărcate. Verifică numele fișierelor din folderul matches/.</p>';
    }

  } catch (error) {
    console.error("Eroare gravă la încărcare. Asigură-te că folosești extensia Live Server!", error);
    const errorContainer = document.getElementById('squadGrid') || document.getElementById('tab-squad');
    if (errorContainer) {
      errorContainer.innerHTML = "<p style='padding:20px;color:red'>Datele nu au putut fi încărcate. Verifică consola (F12). Asigură-te că rulezi proiectul folosind extensia <b>Live Server</b>.</p>";
    }
  }
}

// Convertește structura Wyscout în formatul pentru Dashboard
function formatWyscoutData(wyscoutPlayersArray, matchId) {
  // Identificăm ID-ul echipei U Cluj numărând jucătorii din lot care se regăsesc în players_stats
  const teamCounts = {};
  wyscoutPlayersArray.forEach(p => {
    const rawName = window.WYSCOUT_PLAYERS[p.playerId] || `Jucător (${p.playerId})`;
    if (findPlayerStats(rawName)) {
      const tId = p.teamId || (p.team && p.team.wyId) || "unknown";
      teamCounts[tId] = (teamCounts[tId] || 0) + 1;
    }
  });

  let uClujTeamId = 'unknown';
  let maxCount = 0;
  for (const [tId, count] of Object.entries(teamCounts)) {
    if (tId !== 'unknown' && count > maxCount) {
      maxCount = count;
      uClujTeamId = tId;
    }
  }

  return wyscoutPlayersArray.map(p => {
    const total = p.total || {}; 
    const percent = p.percent || {};
    const rawName = window.WYSCOUT_PLAYERS[p.playerId] || `Jucător (${p.playerId})`;
    const ps = findPlayerStats(rawName);
    
    return {
      playerId: p.playerId,
      teamId: p.teamId || (p.team && p.team.wyId) || "unknown",
      name: ps ? ps.Nume : rawName, // Forțăm mereu numele complet EA dacă există
      matchId: matchId,
      position: p.positions && p.positions.length > 0 ? p.positions[0].position.code : (ps ? ps.Pozitie : "unknown"),
      minutes: total.minutesOnField || 0,
      goals: total.goals || 0,
      assists: total.assists || 0,
      passes: total.passes || 0,
      successfulPasses: total.successfulPasses || 0,
      duels: total.duels || 0,
      duelsWon: total.duelsWon || 0,
      dribbles: total.dribbles || 0,
      successfulDribbles: total.successfulDribbles || 0,
      losses: total.losses || 0,
      ownHalfLosses: total.ownHalfLosses || 0,
      dangerousOwnHalfLosses: total.dangerousOwnHalfLosses || 0,
      keyPasses: total.keyPasses || 0,
      xgShot: total.xgShot || 0,
      xgAssist: total.xgAssist || 0,
      recoveries: total.recoveries || 0,
      counterpressingRecoveries: total.counterpressingRecoveries || 0,
      progressiveRun: total.progressiveRun || 0,
      touchInBox: total.touchInBox || 0,
      fouls: total.fouls || 0,
      interceptions: total.interceptions || 0,
      pressingDuels: total.pressingDuels || 0,
      shotsOnTarget: total.shotsOnTarget || 0,
      yellowCards: total.yellowCards || 0,
      progressivePasses: total.progressivePasses || 0,
      aerialDuels: total.aerialDuels || 0,
      aerialDuelsWon: total.aerialDuelsWon || 0,
      successfulKeyPasses: total.successfulKeyPasses || 0,
      successfulProgressivePasses: total.successfulProgressivePasses || 0,
      opponentHalfRecoveries: total.opponentHalfRecoveries || 0,
      dangerousOpponentHalfRecoveries: total.dangerousOpponentHalfRecoveries || 0,
      redCards: total.redCards || 0,
      passAccuracy: percent.successfulPasses || 0
    };
  }).filter(p => {
     // FILTRU SUPREM: Elimină absolut tot ce nu este în players_stats.json
     if (p.minutes <= 0) return false;
     if (!findPlayerStats(p.name)) return false; 
     // Excludem orice jucător de la echipa adversă care a trecut accidental de potrivirea de nume
     if (uClujTeamId !== 'unknown' && p.teamId !== 'unknown' && p.teamId !== uClujTeamId) return false;
     return true;
  }); 
}

// Start
document.addEventListener("DOMContentLoaded", () => {
  const introOverlay = document.getElementById('introOverlay');
  const introVideo = document.getElementById('introVideo');
  const skipBtn = document.getElementById('skipIntroBtn');

  if (introOverlay && introVideo) {
    const finishIntro = () => {
      introOverlay.classList.add('fade-out');
      // Așteptăm să se termine animația CSS de 1.2 secunde înainte de a șterge elementul din DOM
      setTimeout(() => {
        introOverlay.remove();
      }, 1200); 
    };

    // Rulăm intro-ul doar o singură dată per sesiune
    if (!sessionStorage.getItem('ucluj_intro_played')) {
      sessionStorage.setItem('ucluj_intro_played', 'true');
      
      // Evaluăm exact ca un @media query în CSS pentru a alege videoclipul
      if (window.matchMedia("(max-width: 768px)").matches) {
        introVideo.src = './data/animatie_intro_telefon.mp4';
      } else {
        introVideo.src = './data/animatie_intro_pc.mp4';
      }

      introVideo.muted = true;
      introVideo.setAttribute('playsinline', '');
      introVideo.setAttribute('preload', 'auto');

      introVideo.addEventListener('ended', finishIntro);
      if (skipBtn) skipBtn.addEventListener('click', finishIntro);
      
      // Fallback în caz că browserul blochează autoplay-ul
      introVideo.play().catch(() => finishIntro());
    } else {
      // Dacă a mai fost rulat în sesiunea curentă, îl eliminăm imediat pentru a evita blocarea UI
      introOverlay.remove();
    }
  }

  loadDataAndInit();
});