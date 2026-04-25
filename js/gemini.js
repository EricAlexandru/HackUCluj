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
  let physicalDataInfo = "";
  
  // Extragem datele fizice din preajma meciului pentru a le furniza AI-ului
  if (window.PHYSICAL_TRAINING && window.PHYSICAL_TRAINING.rows) {
    const matchDateObj = new Date(matchInfo.date);
    const matchGps = window.PHYSICAL_TRAINING.rows.filter(row => {
        if (!row.sessionDate) return false;
        const diffDays = Math.abs(row.sessionDate - matchDateObj) / (1000 * 60 * 60 * 24);
        return diffDays <= 1; // Sesiune exact în ziua meciului sau o zi diferență
    });
    
    if (matchGps.length > 0) {
        physicalDataInfo = "DATE FIZICE (Sesiune GPS meci/antrenament):\n";
        matchGps.slice(0, 15).forEach(row => {
            physicalDataInfo += `- ${row.playerName}: Distanța Totală=${row.distanceM}m, Speed Zone [25-50]=${row.speed25_50M}m, Accel Zone [4-10]=${row.accel4_10Count}, Power Metabolic AVG=${row.metabolicPowerAvg} W/kg\n`;
        });
    }
  }

  // Formatăm datele jucătorilor din Wyscout + EA Sports
  let playersDataText = "DATE JUCĂTORI (Wyscout + EA Sports):\n";
  matchData.filter(p => p.minutes > 0).sort((a,b) => b.minutes - a.minutes).slice(0, 14).forEach(p => {
      const ps = findPlayerStats(p.name);
      const eaPace = ps && ps.Statistici_Fizice_EA ? ps.Statistici_Fizice_EA.Pace : 'N/A';
      const eaStamina = ps && ps.Statistici_Fizice_EA ? ps.Statistici_Fizice_EA.Stamina : 'N/A';
      
      playersDataText += `- ${p.name} (${p.position}): ${p.minutes}' jucate, EA Pace: ${eaPace}, EA Stamina: ${eaStamina}, Pase Reușite: ${p.successfulPasses}/${p.passes}, Dueluri câștigate: ${p.duelsWon}/${p.duels}, Recuperări: ${p.recoveries}, Pierderi: ${p.losses}\n`;
  });

  return `Rol: Acționează ca un Analist de Performanță Senior (Sport Scientist) și Consultant Tactic pentru clubul U Cluj.

Obiectiv: Generează un Raport de Analiză Post-Meci ultra-detaliat pentru partida JOC OFICIAL ${matchInfo.opponent} - U CLUJ din ${new Date(matchInfo.date).toLocaleDateString('ro-RO')}, utilizând datele furnizate din fișierele atașate (antrenament, players_stats.json, matches_data.json).

DATE DISPONIBILE PENTRU ANALIZĂ:
${physicalDataInfo ? physicalDataInfo : "Notă: Datele GPS exacte de la meci lipsesc, aproximează încărcătura fizică pe baza minutelor jucate și a atributelor EA."}
${playersDataText}

Instrucțiuni de procesare a datelor:
1. Identificarea Sursei: Corelează sesiunea GPS furnizată (dacă există) cu efortul din meci.
2. Analiza Volumului și Intensității: Evaluează Distanța Totală și Distanța/minut (m/min). Analizează Speed Zones [25.0, 50.0] și Acceleration Zones [4.0, 10.0].
3. Corelație cu Profilul Jucătorului (JSON): Compară performanța din teren cu atributele EA (Stamina, Pace).
4. Analiza Metabolică: Interpretează "Power Metabolic AVG (W/kg)" sau volumul de minute pentru a evalua costul energetic.

Structura Raportului (Vreau să respecți EXACT acest format):

📊 Raport de Performanță: ${matchInfo.opponent} vs U CLUJ
Context: Scorul final (${matchInfo.score}), data și faza competiției (${matchInfo.phase}).

Sinteză Echipă: O scurtă concluzie despre nivelul de intensitate al echipei (m/min mediu) și organizarea tactico-fizică.

🏃‍♂️ Top 3 Performeri (Capacitate Fizică)
Pentru fiecare din cei 3 jucători, include:
- Nume și Poziție.
- Cifre Cheie: Distanța totală, numărul de sprinturi/dueluri și accelerații.
- Observație: Corelează efortul cu stat-ul de "Stamina" sau "Pace" din profilul lor EA Sports.

⚡ Analiza Intensității (Viteză și Explozivitate)
- Cel mai rapid jucător: (Cea mai mare distanță în Speed Zone [25.0, 50.0] sau Pace ridicat).
- Cel mai exploziv jucător: (Cele mai multe acțiuni în Acceleration Zone [4.0, 10.0] sau eficiență mare în dueluri/recuperări scurte).

🔋 Managementul Efortului (Load Monitoring)
- Identifică jucătorii cu cel mai mare Metabolic Load (W/kg) sau risc de uzură pe baza minutelor.
- Recomandare: Specifică cine ar trebui să intre într-un program de recuperare intensă.

💡 Recomandări Tactice și Rotație (Meciul Următor)
- Oferă 2-3 sugestii de specialitate pentru antrenor: jucători ce trebuie menajați, ajustări tactice pe baza pierderilor de minge din acest meci și cum se pot preveni accidentările la jucătorii epuizați.

Restricții de output:
- Folosește tabele Markdown pentru datele comparative (ex: tabel cu Top 3 jucători sau Load Monitoring).
- Nu inventa cifre; dacă un jucător nu are date GPS, bazează-te exclusiv pe minutele jucate, recuperări, dueluri și atributele EA furnizate.
- Tonul trebuie să fie cel al unui expert tehnic și sport scientist.`;
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
