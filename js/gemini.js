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
  let prompt = `Ești un analist de fotbal profesionist. Analizează următoarele date detaliate din meciul:

**MECI**: FC Universitatea Cluj vs ${matchInfo.opponent}
**SCOR**: ${matchInfo.score}
**DATA**: ${new Date(matchInfo.date).toLocaleDateString('ro-RO')}
**FAZĂ**: ${matchInfo.phase}

## STATISTICI GENERALE ALE MECIURILOR
**U Cluj:**
- Mingii pe jucător: ${uClujStats.passes ? (uClujStats.passes / (matchData.filter(p => p.teamId).length || 1)).toFixed(1) : 0}
- Pasuri complete: ${uClujStats.successfulPasses || 0}
- Șuturi pe poartă: ${uClujStats.shotsOnTarget || 0}
- Duels câștigați: ${uClujStats.duelsWon || 0} / ${uClujStats.duels || 0}
- Recuperări: ${uClujStats.recoveries || 0}
- Pierderi balon: ${uClujStats.losses || 0}
- Goluri: ${uClujStats.goals || 0}
- Assist-uri: ${uClujStats.assists || 0}

## TOP PERFORMERI U CLUJ
`;

  const topPlayers = matchData
    .filter(p => p.minutes > 0)
    .sort((a, b) => (b.goals || 0) + (b.assists || 0) - (a.goals || 0) - (a.assists || 0))
    .slice(0, 5);

  topPlayers.forEach(p => {
    prompt += `\n- **${p.name}** (${p.position}): ${p.minutes}' jucate, ${p.goals || 0}G ${p.assists || 0}A, ${(p.passAccuracy || 0).toFixed(0)}% pase complete`;
  });

  prompt += `\n\n## DETALII TEHNICE JUCĂTORI
`;

  matchData.filter(p => p.minutes > 0).slice(0, 11).forEach(p => {
    prompt += `\n- **${p.name}** (${p.position}):
  • Minute: ${p.minutes}, Pase: ${p.passes} (${(p.passAccuracy || 0).toFixed(0)}% reusite)
  • Driblinguri: ${p.successfulDribbles || 0}/${p.dribbles || 0}
  • Duels: ${p.duelsWon || 0}/${p.duels || 0} câștigați
  • Goluri/Assist: ${p.goals || 0}/${p.assists || 0}
  • Recuperări: ${p.recoveries || 0}, Interceții: ${p.interceptions || 0}
  • Pase progresive: ${p.progressivePasses || 0}, Key passes: ${p.keyPasses || 0}
  • Pierderi balon: ${p.losses || 0} (${p.dangerousOwnHalfLosses || 0} periculoase)
  • Tancuri aeriene: ${p.aerialDuelsWon || 0}/${p.aerialDuels || 0}`;
  });

  prompt += `\n\n## CERINȚE DE ANALIZĂ
Scrie un raport detaliat (3-4 paragrafe) despre cum s-a desfășurat meciul, analizând:
1. Dinamica meciurilor și momentele cheie
2. Performanța defensivă și ofensivă
3. Jucători care au avut impact major
4. Greșeli sau oportunități ratate
5. Concluzie și perspective

Scrie în limba română și folosește limbaj profesional de analist de fotbal.`;

  return prompt;
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
