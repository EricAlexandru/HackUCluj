const STARTER_CHIPS = [
  "Care e cel mai bun jucător din Play-off?",
  "Cine pierde cel mai mult balonul periculos?",
  "Generează cel mai bun 11 bazat pe formă",
  "Compară meciurile Sezon Regulat vs Play-off",
  "Cine are cea mai bună progresie în 2026?",
  "Ce jucător are cel mai mare risc de accidentare?",
];

document.getElementById('apiKeyInput').addEventListener('input', checkApiKey);

function checkApiKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  const status = document.getElementById('apiStatus');
  const warn = document.getElementById('apiWarning');
  if(key.startsWith('AIza') && key.length > 20) {
    status.textContent = '✓ API key setat';
    status.className = 'ok';
    warn.classList.remove('show');
  } else {
    status.textContent = 'Introdu cheia pentru AI Chat';
    status.className = '';
    warn.classList.add('show');
  }
}

function initChat() {
  const chipsEl = document.getElementById('starterChips');
  chipsEl.innerHTML = '';
  STARTER_CHIPS.forEach(chip=>{
    const el = document.createElement('div');
    el.className = 'chip';
    el.textContent = chip;
    el.addEventListener('click',()=>{ document.getElementById('chatInput').value=chip; sendChat(); });
    chipsEl.appendChild(el);
  });
  document.getElementById('chatInput').addEventListener('keydown',e=>{if(e.key==='Enter')sendChat();});
}

function buildSystemPrompt() {
  const uniquePlayers = new Set();
  Object.values(window.ALL_MATCH_STATS).flat().forEach(p => {
    if (p.minutes > 20) uniquePlayers.add(p.name);
  });

  const summaries = [...uniquePlayers].map(name => {
    const scores = Object.values(window.ALL_MATCH_STATS).map(ms=>{
      const mp=ms.find(s=>s.name===name);
      return mp?calcMatchScore(mp):null;
    }).filter(s=>s!==null);
    const avgScore = scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1):'N/A';
    const ps = findPlayerStats(name);
    const risk = calcInjuryRisk(name);
    return `${ps?ps.Nume:name} (#${ps?ps.Numar_Tricou:'?'}, ${ps?ps.Pozitie:'?'}, Overall:${ps?ps.Overall_Rating:'?'}, ScorMediu:${avgScore}/10, RiscAcc:${risk}%)`;
  });

  const validMatches = window.MATCHES.filter(m => window.ALL_MATCH_STATS[m.matchId] && window.ALL_MATCH_STATS[m.matchId].length > 0);
  const matchSummary = validMatches.map(m=>{
    const ms = window.ALL_MATCH_STATS[m.matchId]||[];
    const scored = ms.map(p=>calcMatchScore(p)).filter(s=>s!==null);
    const avg = scored.length?(scored.reduce((a,b)=>a+b,0)/scored.length).toFixed(1):'?';
    return `${m.date} vs ${m.opponent}: ${m.score} (${m.phase}) - ScorMediu:${avg}`;
  });

  return `Ești analistul tactic expert al FC Universitatea Cluj pentru sezonul 2025-2026.

JUCĂTORI ȘI FORMA LOR:
${summaries.join('\n')}

REZULTATE MECIURI (cronologic):
${matchSummary.join('\n')}

NOTE IMPORTANTE:
- Scorul de performanță e calculat din: acuratețe pase, dueluri câștigate, recuperări, xG, pierderi periculoase
- Scor >=9.0 = Albastru (Elită) | >=8.0 = Verde (Excelent) | >=6.0 = Galben (Mediu) | <6.0 = Roșu (Slab)
- Datele sunt citite din fișierele reale descărcate.

Răspunde MEREU în română. Fii concis și tactic. Bazează-te pe date. 
Când menționezi un jucător scrie-l cu **bold**. Oferă insights acționabile.`;
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if(!msg) return;

  const key = document.getElementById('apiKeyInput').value.trim();
  if(!key.startsWith('AIza')) {
    addMessage('ai','⚠️ Te rog introdu API key-ul Gemini în bara din stânga!');
    return;
  }

  addMessage('user', msg);
  input.value = '';
  document.getElementById('sendBtn').disabled = true;

  const loadingId = addLoadingDots();

  try {
    const history = getChatHistory();
    const systemPrompt = buildSystemPrompt();

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          system_instruction:{parts:[{text:systemPrompt}]},
          contents: history.concat([{role:'user',parts:[{text:msg}]}]),
          generationConfig:{maxOutputTokens:800,temperature:0.7}
        })
      }
    );

    const data = await response.json();
    removeLoading(loadingId);

    if(data.error) {
      addMessage('ai', `❌ Eroare API: ${data.error.message}`);
    } else {
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Nu am primit răspuns.';
      addMessage('ai', text);
    }
  } catch(err) {
    removeLoading(loadingId);
    addMessage('ai', `❌ Eroare de conexiune: ${err.message}`);
  }

  document.getElementById('sendBtn').disabled = false;
}

let chatHistory = [];
function addMessage(role, text) {
  const msgs = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = `msg ${role}`;
  if(role==='ai') {
    div.innerHTML = text.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
  } else {
    div.textContent = text;
  }
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  if(role!=='loading') chatHistory.push({role:role==='user'?'user':'model', parts:[{text}]});
  return div;
}

function addLoadingDots() {
  const msgs = document.getElementById('chatMessages');
  const div = document.createElement('div');
  div.className = 'msg ai loading';
  div.id = 'loading-'+Date.now();
  div.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div.id;
}
function removeLoading(id) {
  const el=document.getElementById(id);
  if(el) el.remove();
}
function getChatHistory() {
  return chatHistory.slice(-10);
}