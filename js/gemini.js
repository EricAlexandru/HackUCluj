// GEMINI API INTEGRATION FOR MATCH REPORTS
const GEMINI_CONFIG = {
  apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
};

// Get API key from localStorage
function getApiKey() {
  return localStorage.getItem('gemini_api_key') || '';
}

// Save API key to localStorage
function saveApiKey(key) {
  if(key.startsWith('AIza') && key.length > 30) {
    localStorage.setItem('gemini_api_key', key);
    updateApiStatus('Cheie API salvată cu succes!', true);
    return true;
  } else {
    updateApiStatus('Cheie API invalidă. Trebuie să înceapă cu "AIza" și să aibă minim 30 caractere.', false);
    return false;
  }
}

// Update API status in UI
function updateApiStatus(message, success) {
  const statusEl = document.getElementById('apiStatus');
  if(statusEl) {
    statusEl.textContent = message;
    if(success) {
      statusEl.style.background = 'rgba(100,200,100,0.1)';
      statusEl.style.borderColor = 'rgba(100,200,100,0.3)';
      statusEl.style.color = 'rgba(100,200,100,0.8)';
    } else {
      statusEl.style.background = 'rgba(200,100,100,0.1)';
      statusEl.style.borderColor = 'rgba(200,100,100,0.3)';
      statusEl.style.color = 'rgba(200,100,100,0.8)';
    }
  }
}

// Format match data for prompt
function formatMatchDataForPrompt(matchData, matchInfo, uClujStats, opponentStats) {
  // [A] MATCHES_DATA (Istoric meciuri)
  const matchesDataStr = JSON.stringify(window.MATCHES || []);

  // [B] PLAYERS_STATS (Atribute EA Sports)
  const playersStatsStr = JSON.stringify((window.PLAYERS_STATS || []).map(p => ({
    Nume: p.Nume,
    Numar_Tricou: p.Numar_Tricou,
    Pozitie: p.Pozitie,
    Overall_Rating: p.Overall_Rating,
    Statistici_Fizice_EA: p.Statistici_Fizice_EA,
    Statistici_Tehnice_EA: p.Statistici_Tehnice_EA
  })));

  // [C] DATE_ANTRENAMENT (Sesiuni GPS din ultimele 7 zile + Meci)
  let trainingDataStr = "[]";
  if (window.PHYSICAL_TRAINING && window.PHYSICAL_TRAINING.rows) {
    const matchDateObj = new Date(matchInfo.date);
    const weekBeforeObj = new Date(matchDateObj.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentTraining = window.PHYSICAL_TRAINING.rows.filter(row => {
      if (!row.sessionDate) return false;
      return row.sessionDate >= weekBeforeObj && row.sessionDate <= matchDateObj;
    }).map(row => ({
      Sessions: row.session,
      Date: row.sessionDate ? row.sessionDate.toISOString().split('T')[0] : '',
      Players: row.playerName,
      "Distance (m)": row.distanceM,
      "Distance/time (m/min)": row.durationMin > 0 ? Number((row.distanceM / row.durationMin).toFixed(1)) : 0,
      "Duration (min)": row.durationMin,
      "Acceleration Zones [4-10]": row.accel4_10Count,
      "Speed Zones [25-50]": row.speed25_50M,
      "Load - Power Metabolic AVG (W/kg)": row.metabolicPowerAvg,
      "Sprints Abs (count/min)": row.sprintRatePerMin
    }));
    
    trainingDataStr = JSON.stringify(recentTraining);
  }

  // [D] CURRENT_MATCH_STATS (Statistici meci curent selectat)
  const currentMatchStatsStr = JSON.stringify(matchData.filter(p => p.minutes > 0).map(p => ({
    Nume: p.name,
    Minute: p.minutes,
    Pozitie: p.position,
    Goluri: p.goals,
    PaseGol: p.assists,
    Recuperari: p.recoveries,
    Pierderi: p.losses
  })));

  return `Ești analistul de performanță al echipei de fotbal U Cluj. Rolul tău este să generezi rapoarte post-meci profesionale, clare și acționabile, destinate exclusiv staff-ului tehnic (antrenor principal, antrenori secundari, preparator fizic).

REGULI ABSOLUTE:
1. Folosești STRICT datele furnizate în contextul acestei conversații. Nu inventa statistici, scoruri, minute de joc sau orice altă informație care nu apare explicit în date.
2. Dacă o informație lipsește din date, menționezi explicit "date indisponibile" — nu specula.
3. Tonul este profesional, direct, tehnic. Fără clișee motivaționale.
4. Structura raportului este FIXĂ — respectă ordinea secțiunilor de mai jos.
5. Limba de output: română.

---

DATE DISPONIBILE ÎN CONTEXT:

[A] MATCHES_DATA:
${matchesDataStr}

[B] PLAYERS_STATS:
${playersStatsStr}

[C] DATE_ANTRENAMENT:
${trainingDataStr}

[D] CURRENT_MATCH_STATS:
${currentMatchStatsStr}

---

STRUCTURA FIXĂ A RAPORTULUI POST-MECI:

Nu genera alte texte introductive sau de încheiere. Generează EXACT următoarele secțiuni separate prin titluri cu "## ":

## 1. FORMA RECENTĂ
Pe baza MATCHES_DATA, afișează ultimele 5 meciuri (cronologic descrescător până la data meciului curent):
| Data | Adversar | Scor | Fază | Rezultat |
Calculează: W/D/L în ultimele 5. Identifică tendința (serie pozitivă/negativă/neutră).

## 2. OBSERVAȚII TEHNICE
Dacă există DATE_ANTRENAMENT din săptămâna premergătoare meciului:
- Identifică jucătorii cu sesiuni compensatorii sau de recuperare (cuvinte cheie: "COMPENSATOR", "REACTIVITATE")
- Identifică sesiunile de intensitate înaltă (cuvinte cheie: "FORTA", "METABOLIC", "REZISTENTA", "INTENSE")
- Menționează participarea la antrenamente (general)
Dacă nu există date relevante: "Date antrenament pre-meci indisponibile."

## 3. RECOMANDĂRI STAFF
3-5 puncte concrete, bazate exclusiv pe datele analizate anterior. Format:
- [Categorie: Fizic/Tactic/Recuperare] Recomandare specifică.
`;
}

// Generate match report using Gemini API
async function generateMatchReport(matchData, matchInfo) {
  const apiKey = getApiKey();
  
  if(!apiKey) {
    alert('Te rog introdu cheia Gemini API în setări (butonul ⚙️)');
    openSettingsModal();
    return null;
  }

  // Calculate stats
  const uClujStats = {
    passes: matchData.reduce((sum, p) => sum + (p.passes || 0), 0),
    successfulPasses: matchData.reduce((sum, p) => sum + (p.successfulPasses || 0), 0),
    shotsOnTarget: matchData.reduce((sum, p) => sum + (p.shotsOnTarget || 0), 0),
    duelsWon: matchData.reduce((sum, p) => sum + (p.duelsWon || 0), 0),
    duels: matchData.reduce((sum, p) => sum + (p.duels || 0), 0),
    recoveries: matchData.reduce((sum, p) => sum + (p.recoveries || 0), 0),
    losses: matchData.reduce((sum, p) => sum + (p.losses || 0), 0),
    goals: matchData.reduce((sum, p) => sum + (p.goals || 0), 0),
    assists: matchData.reduce((sum, p) => sum + (p.assists || 0), 0)
  };

  const prompt = formatMatchDataForPrompt(matchData, matchInfo, uClujStats, {});

  try {
    const response = await fetch(`${GEMINI_CONFIG.apiEndpoint}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if(!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }

    const data = await response.json();
    const reportText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Raportul nu a putut fi generat.';
    
    return reportText;
  } catch(error) {
    console.error('Eroare la generarea raportului:', error);
    alert('❌ Eroare: ' + error.message);
    return null;
  }
}

// Settings Modal Functions
function openSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if(modal) {
    modal.style.display = 'flex';
    const apiInput = document.getElementById('apiKeyInput');
    if(apiInput) {
      apiInput.value = getApiKey();
    }
    updateApiStatusDisplay();
  }
}

function closeSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if(modal) modal.style.display = 'none';
}

function updateApiStatusDisplay() {
  const apiKey = getApiKey();
  const statusEl = document.getElementById('apiStatus');
  if(statusEl) {
    if(apiKey) {
      statusEl.textContent = '✓ Cheie API setată (' + apiKey.substring(0, 10) + '...)';
      statusEl.style.background = 'rgba(100,200,100,0.1)';
      statusEl.style.borderColor = 'rgba(100,200,100,0.3)';
      statusEl.style.color = 'rgba(100,200,100,0.8)';
    } else {
      statusEl.textContent = '✗ Nicio cheie API setată';
      statusEl.style.background = 'rgba(200,100,100,0.1)';
      statusEl.style.borderColor = 'rgba(200,100,100,0.3)';
      statusEl.style.color = 'rgba(200,100,100,0.8)';
    }
  }
}

// Initialize settings modal event listeners
function initSettingsModal() {
  // Use setTimeout to ensure DOM is fully ready
  setTimeout(() => {
    const settingsBtn = document.getElementById('settingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const settingsModal = document.getElementById('settingsModal');

    console.log('[Gemini] initSettingsModal starting...');
    console.log('[Gemini] settingsBtn found:', !!settingsBtn);
    console.log('[Gemini] closeSettingsBtn found:', !!closeSettingsBtn);
    console.log('[Gemini] settingsModal found:', !!settingsModal);

    if(settingsBtn) {
      settingsBtn.addEventListener('click', (e) => {
        console.log('[Gemini] Settings button clicked');
        e.preventDefault();
        e.stopPropagation();
        openSettingsModal();
      });
      console.log('[Gemini] Settings button listener attached');
    }

    if(closeSettingsBtn) {
      closeSettingsBtn.addEventListener('click', (e) => {
        console.log('[Gemini] Close button clicked');
        e.preventDefault();
        e.stopPropagation();
        closeSettingsModal();
      });
      console.log('[Gemini] Close button listener attached');
    }

    if(saveApiKeyBtn) {
      saveApiKeyBtn.addEventListener('click', () => {
        console.log('[Gemini] Save API key button clicked');
        const apiKey = apiKeyInput.value.trim();
        if(saveApiKey(apiKey)) {
          setTimeout(closeSettingsModal, 1000);
        }
      });
      console.log('[Gemini] Save API key button listener attached');
    }

    if(apiKeyInput) {
      apiKeyInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') {
          saveApiKeyBtn.click();
        }
      });
      console.log('[Gemini] API key input listener attached');
    }

    if(settingsModal) {
      settingsModal.addEventListener('click', (e) => {
        if(e.target === settingsModal) {
          closeSettingsModal();
        }
      });
      console.log('[Gemini] Settings modal backdrop listener attached');
    }

    updateApiStatusDisplay();
    console.log('[Gemini] initSettingsModal completed');
  }, 100);
}

// Initialize on DOM ready or immediately if already loaded
if(document.readyState === 'loading') {
  console.log('[Gemini] Waiting for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', initSettingsModal);
} else {
  console.log('[Gemini] DOM already loaded, initializing immediately');
  initSettingsModal();
}
