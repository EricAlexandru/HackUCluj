window.PHYSICAL_TRAINING = {
  loaded: false,
  sourceFilesUsed: [],
  missingFiles: [],
  rows: []
};

let physicalProgressionChart = null;
let physicalSelectedPlayer = 'team';
let physicalSelectedSession = 'all';

const TRAINING_FILE_CANDIDATES = [
  './data/date_antrenament_septembrie_2025.xlsx',
  './data/date_antrenament_septembrie.xlsx',
  './data/date_antrenament_noiembire_2025.xlsx',
  './data/date_antrenament_decembrie_2025.xlsx'
];

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function findColumnKey(columns, predicate) {
  return columns.find((col) => predicate(normalizeText(col)));
}

function extractDateFromText(value) {
  const match = String(value || '').match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3]);
  const date = new Date(year, month, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolvePlayerName(playerRaw) {
  if (!playerRaw) return null;

  const direct = findPlayerStats(playerRaw);
  if (direct && direct.Nume) return direct.Nume;

  const rawNorm = normalizeText(playerRaw);
  const players = window.PLAYERS_STATS || [];
  const byLastName = players.find((p) => {
    const full = normalizeText(p.Nume);
    const parts = full.split(/\s+/).filter(Boolean);
    const lastName = parts[parts.length - 1] || '';
    return lastName === rawNorm || full.includes(rawNorm);
  });

  // Dacă nu este găsit în lotul oficial (players_stats.json), returnăm null pentru a fi exclus din start
  return byLastName && byLastName.Nume ? byLastName.Nume : null;
}

function aggregatePhysicalRows(rows) {
  const summary = {};

  rows.forEach((row) => {
    const playerName = row.playerName;
    if (!playerName) return;

    if (!summary[playerName]) {
      summary[playerName] = {
        player: playerName,
        sessions: 0,
        totalDistanceM: 0,
        totalDurationMin: 0,
        speed15_20M: 0,
        speed20_25M: 0,
        speed25_50M: 0,
        accel3_4Count: 0,
        accel4_10Count: 0,
        decelNeg4_3Count: 0,
        decelNeg10_4Count: 0,
        metabolicPowerWeighted: 0,
        sprintRateWeighted: 0
      };
    }

    const item = summary[playerName];
    const duration = row.durationMin;

    item.sessions += 1;
    item.totalDistanceM += row.distanceM;
    item.totalDurationMin += duration;
    item.speed15_20M += row.speed15_20M;
    item.speed20_25M += row.speed20_25M;
    item.speed25_50M += row.speed25_50M;
    item.accel3_4Count += row.accel3_4Count;
    item.accel4_10Count += row.accel4_10Count;
    item.decelNeg4_3Count += row.decelNeg4_3Count;
    item.decelNeg10_4Count += row.decelNeg10_4Count;
    item.metabolicPowerWeighted += row.metabolicPowerAvg * duration;
    item.sprintRateWeighted += row.sprintRatePerMin * duration;
  });

  Object.values(summary).forEach((item) => {
    const duration = Math.max(1, item.totalDurationMin);
    item.distancePerMin = item.totalDistanceM / duration;
    item.zone15_25M = item.speed15_20M + item.speed20_25M;
    item.highSpeedM = item.speed20_25M + item.speed25_50M;
    item.accelTotalCount = item.accel3_4Count + item.accel4_10Count;
    item.metabolicPowerAvg = item.metabolicPowerWeighted / duration;
    item.sprintRateAvg = item.sprintRateWeighted / duration;
  });

  return summary;
}

function extractRowsFromSheet(jsonRows) {
  if (!jsonRows || !jsonRows.length) return [];

  const columns = Object.keys(jsonRows[0]);
  const playerCol = findColumnKey(columns, (k) => k === 'players' || k.includes('player'));
  const sessionCol = findColumnKey(columns, (k) => k === 'sessions' || k.includes('session'));
  const weekCol = findColumnKey(columns, (k) => k.includes('week'));
  const distanceCol = findColumnKey(columns, (k) => k === 'distance (m)' || (k.includes('distance') && !k.includes('time')));
  const durationCol = findColumnKey(columns, (k) => k.includes('duration'));

  const accel3_4Col = findColumnKey(columns, (k) => k.includes('acceleration zones') && k.includes('[3.0, 4.0]'));
  const accel4_10Col = findColumnKey(columns, (k) => k.includes('acceleration zones') && k.includes('[4.0, 10.0]'));
  const decel4_3Col = findColumnKey(columns, (k) => k.includes('acceleration zones') && k.includes('[-4.0, -3.0]'));
  const decel10_4Col = findColumnKey(columns, (k) => k.includes('acceleration zones') && k.includes('[-10.0, -4.0]'));

  const speed15_20Col = findColumnKey(columns, (k) => k.includes('speed zones') && k.includes('[15.0, 20.0]'));
  const speed20_25Col = findColumnKey(columns, (k) => k.includes('speed zones') && k.includes('[20.0, 25.0]'));
  const speed25_50Col = findColumnKey(columns, (k) => k.includes('speed zones') && k.includes('[25.0, 50.0]'));

  const metabolicCol = findColumnKey(columns, (k) => k.includes('power metabolic avg'));
  const sprintsCol = findColumnKey(columns, (k) => k.includes('sprints abs'));

  return jsonRows
    .map((row) => {
      const session = String(row[sessionCol] || '').trim();
      const week = String(row[weekCol] || '').trim();
      const sessionDate = extractDateFromText(session) || extractDateFromText(week);
      return {
        player: String(row[playerCol] || '').trim(),
        playerName: resolvePlayerName(String(row[playerCol] || '').trim()),
        session,
        week,
        sessionDate,
        sessionTimestamp: sessionDate ? sessionDate.getTime() : Number.MAX_SAFE_INTEGER,
        sessionKey: `${session}|||${week}`,
        distanceM: toNumber(row[distanceCol]),
        durationMin: toNumber(row[durationCol]),
        accel3_4Count: toNumber(row[accel3_4Col]),
        accel4_10Count: toNumber(row[accel4_10Col]),
        decelNeg4_3Count: toNumber(row[decel4_3Col]),
        decelNeg10_4Count: toNumber(row[decel10_4Col]),
        speed15_20M: toNumber(row[speed15_20Col]),
        speed20_25M: toNumber(row[speed20_25Col]),
        speed25_50M: toNumber(row[speed25_50Col]),
        metabolicPowerAvg: toNumber(row[metabolicCol]),
        sprintRatePerMin: toNumber(row[sprintsCol])
      };
    })
    .filter((row) => row.playerName && row.distanceM > 0)
    .sort((a, b) => a.sessionTimestamp - b.sessionTimestamp || a.session.localeCompare(b.session, 'ro'));
}

async function loadPhysicalTrainingData() {
  const parsedRows = [];
  const sourceFilesUsed = [];
  const missingFiles = [];

  if (!window.XLSX) {
    window.PHYSICAL_TRAINING = {
      loaded: false,
      sourceFilesUsed,
      missingFiles: ['Lipseste libraria XLSX pentru citirea fisierelor Excel.'],
      rows: []
    };
    return;
  }

  for (const filePath of TRAINING_FILE_CANDIDATES) {
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        missingFiles.push(filePath);
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const jsonRows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
      const extractedRows = extractRowsFromSheet(jsonRows).map((row) => ({ ...row, sourceFile: filePath }));

      parsedRows.push(...extractedRows);
      sourceFilesUsed.push(filePath);
    } catch (error) {
      missingFiles.push(filePath);
    }
  }

  window.PHYSICAL_TRAINING = {
    loaded: true,
    sourceFilesUsed,
    missingFiles,
    rows: parsedRows
  };
}

function buildSessionCatalog(rows) {
  const map = new Map();
  rows.forEach((row) => {
    if (map.has(row.sessionKey)) return;
    map.set(row.sessionKey, {
      key: row.sessionKey,
      label: row.week ? `${row.session} · sapt ${row.week}` : row.session,
      timestamp: row.sessionTimestamp,
      session: row.session
    });
  });

  return [...map.values()].sort((a, b) => a.timestamp - b.timestamp || a.label.localeCompare(b.label, 'ro'));
}

function buildPlayerCardsData(summary) {
  const players = window.PLAYERS_STATS || [];
  const summaryKeys = new Set(Object.keys(summary));

  const rosterMapped = players
    .filter((p) => summaryKeys.has(p.Nume))
    .sort((a, b) => b.Overall_Rating - a.Overall_Rating)
    .map((p) => ({
      key: p.Nume,
      name: p.Nume,
      number: p.Numar_Tricou,
      position: p.Pozitie,
      rating: p.Overall_Rating,
      url: p.url || ''
    }));

  const fallback = [...summaryKeys]
    .filter((name) => !rosterMapped.some((p) => p.name === name))
    .sort((a, b) => a.localeCompare(b, 'ro'))
    .map((name) => ({
      key: name,
      name,
      number: '?',
      position: 'UNK',
      rating: 0,
      url: ''
    }));

  return rosterMapped.concat(fallback);
}

function renderPhysicalPlayerCards(summary) {
  const grid = document.getElementById('physicalPlayerGrid');
  if (!grid) return;

  const searchInput = document.getElementById('physicalSearch');
  const sortSelect = document.getElementById('physicalSort');
  const query = searchInput ? searchInput.value.toLowerCase() : '';
  const sortBy = sortSelect ? sortSelect.value : 'rating';

  let cards = buildPlayerCardsData(summary);

  if (query) {
    cards = cards.filter((c) => c.name.toLowerCase().includes(query) || c.position.toLowerCase().includes(query));
  }

  const posOrder = { GK: 0, CB: 1, LB: 1, RB: 1, LWB: 1, RWB: 1, CDM: 2, CM: 2, CAM: 2, LW: 3, RW: 3, ST: 4, UNK: 99 };
  cards.sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'pos') {
      const pa = posOrder[(a.position || '').toUpperCase()] ?? 99;
      const pb = posOrder[(b.position || '').toUpperCase()] ?? 99;
      if (pa !== pb) return pa - pb;
      return b.rating - a.rating;
    }
    return b.rating - a.rating;
  });

  grid.innerHTML = '';

  if ("medie echipă".includes(query) || "echipa".includes(query) || query === "") {
    const teamCard = document.createElement('div');
    teamCard.className = `player-card ${physicalSelectedPlayer === 'team' ? 'is-active-team' : ''}`;
    teamCard.innerHTML = `
      <div class="card-photo-placeholder" style="background:rgba(0,61,165,0.8); color:#fff; font-size:32px;">🛡️</div>
      <div class="card-info">
        <div class="card-name">Medie Echipă</div>
        <div class="card-pos">Toți jucătorii</div>
      </div>`;
    teamCard.addEventListener('click', () => {
      physicalSelectedPlayer = 'team';
      renderPhysicalStats();
    });
    grid.appendChild(teamCard);
  }

  cards.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = `player-card ${physicalSelectedPlayer === item.key ? 'is-active-player' : ''}`;
    card.style.animationDelay = `${idx * 40}ms`;
    const photoEl = item.url
      ? `<img class="card-photo" src="${item.url}" alt="${item.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : '';
    const placeholderEl = `<div class="card-photo-placeholder" style="${item.url ? 'display:none' : ''}">${item.number}</div>`;
    card.innerHTML = `
      ${photoEl}${placeholderEl}
      <span class="card-jersey">#${item.number}</span>
      ${item.rating ? `<span class="card-rating">${item.rating}</span>` : ''}
      <div class="card-info">
        <div class="card-name">${item.name}</div>
        <div class="card-pos">${item.position}</div>
      </div>`;
    card.addEventListener('click', () => {
      physicalSelectedPlayer = item.key;
      renderPhysicalStats();
    });
    grid.appendChild(card);
  });
}

function filterRowsBySession(rows) {
  if (physicalSelectedSession === 'all') return rows;
  return rows.filter((row) => row.sessionKey === physicalSelectedSession);
}

function buildTeamSummary(summary) {
  const out = {
    sessions: 0,
    totalDistanceM: 0,
    totalDurationMin: 0,
    zone15_25M: 0,
    accelTotalCount: 0,
    distancePerMin: 0
  };

  Object.values(summary).forEach((item) => {
    out.sessions += item.sessions;
    out.totalDistanceM += item.totalDistanceM;
    out.totalDurationMin += item.totalDurationMin;
    out.zone15_25M += item.zone15_25M;
    out.accelTotalCount += item.accelTotalCount;
  });

  out.distancePerMin = out.totalDurationMin > 0 ? out.totalDistanceM / out.totalDurationMin : 0;
  return out;
}

function computeSessionMetric(rows, playerName) {
  const grouped = new Map();

  rows.forEach((row) => {
    if (playerName !== 'team' && row.playerName !== playerName) return;

    const existing = grouped.get(row.sessionKey) || {
      key: row.sessionKey,
      label: row.session,
      timestamp: row.sessionTimestamp,
      distanceM: 0,
      highSpeedM: 0,
      accelCount: 0,
      durationMin: 0,
      players: 0
    };

    existing.distanceM += row.distanceM;
    existing.highSpeedM += row.speed20_25M + row.speed25_50M;
    existing.accelCount += row.accel3_4Count + row.accel4_10Count;
    existing.durationMin += row.durationMin;
    existing.players += 1;
    grouped.set(row.sessionKey, existing);
  });

  const points = [...grouped.values()].sort((a, b) => a.timestamp - b.timestamp || a.label.localeCompare(b.label, 'ro'));
  if (playerName === 'team') {
    points.forEach((p) => {
      const count = Math.max(1, p.players);
      p.distanceM = p.distanceM / count;
      p.highSpeedM = p.highSpeedM / count;
      p.accelCount = p.accelCount / count;
      p.durationMin = p.durationMin / count;
    });
  }
  return points;
}

function renderPhysicalChart(rows, selectedPlayerLabel) {
  const canvas = document.getElementById('physicalProgressionChart');
  if (!canvas) return;

  if (physicalProgressionChart) {
    physicalProgressionChart.destroy();
  }

  const isSingleSession = physicalSelectedSession !== 'all';

  if (isSingleSession) {
    // === MOD SINGLE SESSION ===
    if (physicalSelectedPlayer === 'team') {
      // BAR CHART: Leaderboard jucători pe acea sesiune
      const playerRows = rows.filter(r => r.playerName).sort((a, b) => b.distanceM - a.distanceM);
      const labels = playerRows.map(r => r.playerName.split(' ').pop()); // Doar numele de familie
      const dataDist = playerRows.map(r => Number((r.distanceM).toFixed(0)));
      const dataSpeed = playerRows.map(r => Number((r.speed20_25M + r.speed25_50M).toFixed(0)));

      physicalProgressionChart = new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Distanță (m)',
              data: dataDist,
              backgroundColor: 'rgba(59,130,246,0.8)',
              borderRadius: 4,
              yAxisID: 'yDistance'
            },
            {
              label: 'Viteză 20+ (m)',
              data: dataSpeed,
              backgroundColor: 'rgba(34,197,94,0.8)',
              borderRadius: 4,
              yAxisID: 'ySpeed'
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { labels: { color: '#8892a4', font: { family: 'DM Sans' } } },
            tooltip: { backgroundColor: '#0f1628', titleColor: '#fff', bodyColor: '#8892a4', mode: 'index', intersect: false }
          },
          scales: {
            x: { ticks: { color: '#8892a4', maxRotation: 45, minRotation: 45, font: { size: 10 } }, grid: { display: false } },
            yDistance: { type: 'linear', position: 'left', ticks: { color: '#8892a4' }, grid: { color: 'rgba(255,255,255,0.04)' } },
            ySpeed: { type: 'linear', position: 'right', ticks: { color: '#8892a4' }, grid: { drawOnChartArea: false } }
          }
        }
      });
    } else {
      // RADAR CHART: Jucător vs Medie Echipă pe acea sesiune
      const playerRow = rows.find(r => r.playerName === physicalSelectedPlayer);
      const teamLen = rows.length || 1;
      const teamDist = rows.reduce((s, r) => s + r.distanceM, 0) / teamLen;
      const teamSpeed = rows.reduce((s, r) => s + r.speed20_25M + r.speed25_50M, 0) / teamLen;
      const teamAccel = rows.reduce((s, r) => s + r.accel3_4Count + r.accel4_10Count, 0) / teamLen;
      const teamDecel = rows.reduce((s, r) => s + r.decelNeg4_3Count + r.decelNeg10_4Count, 0) / teamLen;
      const teamSprint = rows.reduce((s, r) => s + r.speed15_20M, 0) / teamLen;

      const pDist = playerRow ? playerRow.distanceM : 0;
      const pSpeed = playerRow ? playerRow.speed20_25M + playerRow.speed25_50M : 0;
      const pAccel = playerRow ? playerRow.accel3_4Count + playerRow.accel4_10Count : 0;
      const pDecel = playerRow ? playerRow.decelNeg4_3Count + playerRow.decelNeg10_4Count : 0;
      const pSprint = playerRow ? playerRow.speed15_20M : 0;

      // Normalizare scale pentru Radar (pentru ca formele să aibă sens vizual)
      const scaleDist = 100;
      const scaleSpeed = 10;
      const scaleAccel = 0.5;
      const scaleSprint = 20;

      physicalProgressionChart = new Chart(canvas.getContext('2d'), {
        type: 'radar',
        data: {
          labels: ['Distanță Totală', 'High Speed (>20km/h)', 'Accelerări', 'Decelerări', 'Alergare (15-20km/h)'],
          datasets: [
            {
              label: selectedPlayerLabel,
              data: [pDist / scaleDist, pSpeed / scaleSpeed, pAccel / scaleAccel, pDecel / scaleAccel, pSprint / scaleSprint],
              backgroundColor: 'rgba(200,168,75,0.4)',
              borderColor: '#C8A84B',
              pointBackgroundColor: '#C8A84B',
              borderWidth: 2,
              fill: true
            },
            {
              label: 'Medie Echipă',
              data: [teamDist / scaleDist, teamSpeed / scaleSpeed, teamAccel / scaleAccel, teamDecel / scaleAccel, teamSprint / scaleSprint],
              backgroundColor: 'rgba(59,130,246,0.2)',
              borderColor: '#3b82f6',
              pointBackgroundColor: '#3b82f6',
              borderWidth: 2,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#c9d0de', font: { family: 'DM Sans' } }, position: 'top' },
            tooltip: {
              backgroundColor: '#0f1628',
              titleColor: '#fff',
              bodyColor: '#8892a4',
              callbacks: {
                label: function(context) {
                  let val = context.raw;
                  let realVal = 0;
                  let unit = '';
                  if (context.label.includes('Distanță')) { realVal = val * scaleDist; unit = 'm'; }
                  else if (context.label.includes('High Speed')) { realVal = val * scaleSpeed; unit = 'm'; }
                  else if (context.label.includes('Accelerări') || context.label.includes('Decelerări')) { realVal = val * scaleAccel; unit = 'buc'; }
                  else { realVal = val * scaleSprint; unit = 'm'; }
                  return `${context.dataset.label}: ${Math.round(realVal)} ${unit}`;
                }
              }
            }
          },
          scales: {
            r: {
              angleLines: { color: 'rgba(255,255,255,0.1)' },
              grid: { color: 'rgba(255,255,255,0.1)' },
              pointLabels: { color: '#c9d0de', font: { family: 'Bebas Neue', size: 14 } },
              ticks: { display: false, min: 0 }
            }
          }
        }
      });
    }
  } else {
    // === MOD ALL SESSIONS (Istoric Cronologic) ===
    const points = computeSessionMetric(rows, physicalSelectedPlayer);
    const labels = points.map((p) => p.label);

    physicalProgressionChart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Distanță (m)',
            data: points.map((p) => Number(p.distanceM.toFixed(1))),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59,130,246,0.08)',
            pointBackgroundColor: '#3b82f6',
            pointRadius: 5,
            pointHoverRadius: 8,
            tension: 0.15,
            fill: true,
            yAxisID: 'yDistance'
          },
          {
            label: 'Viteză 20+ (m)',
            data: points.map((p) => Number(p.highSpeedM.toFixed(1))),
            borderColor: '#22c55e',
            backgroundColor: 'rgba(34,197,94,0.06)',
            pointBackgroundColor: '#22c55e',
            pointRadius: 4,
            pointHoverRadius: 7,
            tension: 0.15,
            fill: false,
            yAxisID: 'yDistance'
          },
          {
            label: 'Accelerări (count)',
            data: points.map((p) => Number(p.accelCount.toFixed(1))),
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245,158,11,0.08)',
            pointBackgroundColor: '#f59e0b',
            pointRadius: 4,
            pointHoverRadius: 7,
            tension: 0.15,
            fill: false,
            yAxisID: 'yAccel'
          }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: {
              color: '#8892a4',
              font: { family: 'DM Sans' }
            }
          },
          tooltip: {
            backgroundColor: '#0f1628',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            titleColor: '#fff',
            bodyColor: '#8892a4',
            callbacks: {
              title: (items) => {
                const idx = items[0].dataIndex;
                return points[idx] ? points[idx].label : '';
              },
              afterBody: () => [`Jucător: ${selectedPlayerLabel}`]
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#8892a4', maxRotation: 20, minRotation: 20, font: { size: 10 } },
            grid: { color: 'rgba(255,255,255,0.04)' }
          },
          yDistance: {
            type: 'linear',
            position: 'left',
            ticks: { color: '#8892a4' },
            grid: { color: 'rgba(255,255,255,0.04)' }
          },
          yAccel: {
            type: 'linear',
            position: 'right',
            ticks: { color: '#8892a4' },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }
}

function rebuildSessionSelect(options) {
  const select = document.getElementById('physicalSessionSelect');
  if (!select) return;

  select.innerHTML = '<option value="all">- Toate sesiunile -</option>';
  options.forEach((opt) => {
    const optionEl = document.createElement('option');
    optionEl.value = opt.key;
    optionEl.textContent = opt.label;
    select.appendChild(optionEl);
  });

  const keys = options.map((item) => item.key);
  if (physicalSelectedSession !== 'all' && !keys.includes(physicalSelectedSession)) {
    physicalSelectedSession = 'all';
  }

  select.value = physicalSelectedSession;
}

function renderPhysicalStats() {
  const sourceRows = window.PHYSICAL_TRAINING.rows || [];
  const statusEl = document.getElementById('physicalDataStatus');
  const kpisEl = document.getElementById('physicalKpis');
  if (!statusEl || !kpisEl) return;

  const sessionCatalog = buildSessionCatalog(sourceRows);
  rebuildSessionSelect(sessionCatalog);

  const rowsForSession = filterRowsBySession(sourceRows);
  const summary = aggregatePhysicalRows(rowsForSession);

  if (physicalSelectedPlayer !== 'team' && !summary[physicalSelectedPlayer]) {
    physicalSelectedPlayer = 'team';
  }

  renderPhysicalPlayerCards(summary);

  const selectedSummary = physicalSelectedPlayer === 'team'
    ? buildTeamSummary(summary)
    : summary[physicalSelectedPlayer];
  
  const teamSummary = buildTeamSummary(summary);

  const selectedPlayerLabel = physicalSelectedPlayer === 'team' ? 'Medie echipă' : physicalSelectedPlayer;
  const selectedSession = physicalSelectedSession === 'all'
    ? 'Toate sesiunile'
    : (sessionCatalog.find((s) => s.key === physicalSelectedSession)?.label || 'Sesiune');

  const usedFiles = window.PHYSICAL_TRAINING.sourceFilesUsed.map((f) => f.replace('./data/', '')).join(', ');
  const missingFiles = window.PHYSICAL_TRAINING.missingFiles
    .filter((f) => f.includes('.xlsx'))
    .map((f) => f.replace('./data/', ''))
    .join(', ');

  statusEl.innerHTML = `
    <span>Jucător selectat: ${selectedPlayerLabel}</span>
    <span>Sesiune selectată: ${selectedSession}</span>
    <span>Surse încărcate: ${usedFiles || 'niciun fișier'}</span>
    ${missingFiles ? `<span>Fișiere lipsă: ${missingFiles}</span>` : ''}
  `;

  if (!selectedSummary) {
    kpisEl.innerHTML = '<div class="stat-box"><div class="stat-label">Date indisponibile</div><div class="stat-num">0</div><div class="stat-sub">Nu există în sesiunea filtrată</div></div>';
    const bdEl = document.getElementById('physicalBreakdown');
    if(bdEl) bdEl.innerHTML = '';
    renderPhysicalChart(rowsForSession, selectedPlayerLabel);
    return;
  }

  function getTrendHtml(playerVal, tVal, invert = false) {
    if (!tVal || physicalSelectedPlayer === 'team') return '';
    const pct = ((playerVal - tVal) / tVal) * 100;
    if (Math.abs(pct) < 1) return `<div style="color:var(--muted);font-size:11px;margin-top:6px;">~ egal cu media echipei</div>`;
    const isPositive = pct > 0;
    const isGood = invert ? !isPositive : isPositive;
    const color = isGood ? 'var(--green)' : 'var(--red)';
    const sign = isPositive ? '▲' : '▼';
    return `<div style="color:${color};font-size:11px;font-weight:bold;margin-top:6px;">${sign} ${Math.abs(pct).toFixed(1)}% vs echipă</div>`;
  }

  const pAvgDistPerMin = selectedSummary.distancePerMin || 0;
  const tAvgDistPerMin = teamSummary.distancePerMin || 0;

  const pZonePerMin = selectedSummary.totalDurationMin > 0 ? selectedSummary.zone15_25M / selectedSummary.totalDurationMin : 0;
  const tZonePerMin = teamSummary.totalDurationMin > 0 ? teamSummary.zone15_25M / teamSummary.totalDurationMin : 0;

  const pAccelPerMin = selectedSummary.totalDurationMin > 0 ? selectedSummary.accelTotalCount / selectedSummary.totalDurationMin : 0;
  const tAccelPerMin = teamSummary.totalDurationMin > 0 ? teamSummary.accelTotalCount / teamSummary.totalDurationMin : 0;

  kpisEl.innerHTML = `
    <div class="stat-box"><div class="stat-label">Distanță Totală</div><div class="stat-num">${(selectedSummary.totalDistanceM / 1000).toFixed(2)} km</div><div class="stat-sub">în ${selectedSummary.sessions} sesiuni</div></div>
    <div class="stat-box"><div class="stat-label">Ritm Mediu</div><div class="stat-num">${pAvgDistPerMin.toFixed(1)}</div><div class="stat-sub">m / min</div>${getTrendHtml(pAvgDistPerMin, tAvgDistPerMin)}</div>
    <div class="stat-box"><div class="stat-label">High-Speed Running</div><div class="stat-num">${pZonePerMin.toFixed(2)}</div><div class="stat-sub">m/min (>15km/h)</div>${getTrendHtml(pZonePerMin, tZonePerMin)}</div>
    <div class="stat-box"><div class="stat-label">Efort Exploziv</div><div class="stat-num">${pAccelPerMin.toFixed(2)}</div><div class="stat-sub">accel. / min</div>${getTrendHtml(pAccelPerMin, tAccelPerMin)}</div>
  `;

  const bdEl = document.getElementById('physicalBreakdown');
  if (bdEl) {
     const playerPoints = computeSessionMetric(rowsForSession, physicalSelectedPlayer);
     let light = 0, med = 0, intense = 0;
     playerPoints.forEach(p => {
         const dpm = p.durationMin > 0 ? p.distanceM / p.durationMin : 0;
         if (dpm > 0 && dpm < 70) light++;
         else if (dpm >= 70 && dpm < 95) med++;
         else if (dpm >= 95) intense++;
     });
     
     bdEl.innerHTML = `
       <div style="flex:1; min-width: 200px; background:rgba(34,197,94,0.05); border:1px solid rgba(34,197,94,0.2); border-radius:8px; padding:12px; text-align:center;">
          <div style="font-family:'Bebas Neue'; font-size:24px; color:var(--green)">${light}</div>
          <div style="font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:0.5px;">Antrenamente Ușoare / Refacere</div>
       </div>
       <div style="flex:1; min-width: 200px; background:rgba(234,179,8,0.05); border:1px solid rgba(234,179,8,0.2); border-radius:8px; padding:12px; text-align:center;">
          <div style="font-family:'Bebas Neue'; font-size:24px; color:var(--yellow)">${med}</div>
          <div style="font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:0.5px;">Antrenamente Tactice / Normale</div>
       </div>
       <div style="flex:1; min-width: 200px; background:rgba(239,68,68,0.05); border:1px solid rgba(239,68,68,0.2); border-radius:8px; padding:12px; text-align:center;">
          <div style="font-family:'Bebas Neue'; font-size:24px; color:var(--red)">${intense}</div>
          <div style="font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:0.5px;">Antrenamente Intense / Fizice</div>
       </div>
     `;
  }

  renderPhysicalChart(rowsForSession, selectedPlayerLabel);
}

function initPhysicalStats() {
  // Failsafe pentru versiuni vechi in cache care mai au campul de cautare sesiune.
  const legacySearch = document.getElementById('physicalSessionSearch');
  if (legacySearch) {
    const legacyLabel = document.querySelector('label[for="physicalSessionSearch"]');
    if (legacyLabel) legacyLabel.remove();
    legacySearch.remove();
  }

  const sessionSelect = document.getElementById('physicalSessionSelect');
  const statusEl = document.getElementById('physicalDataStatus');
  const searchInput = document.getElementById('physicalSearch');
  const sortSelect = document.getElementById('physicalSort');

  if (searchInput && !searchInput.dataset.bound) {
    searchInput.addEventListener('input', renderPhysicalStats);
    searchInput.dataset.bound = '1';
  }
  if (sortSelect && !sortSelect.dataset.bound) {
    sortSelect.addEventListener('change', renderPhysicalStats);
    sortSelect.dataset.bound = '1';
  }

  if (!sessionSelect || !statusEl) return;

  if (!window.PHYSICAL_TRAINING.loaded) {
    statusEl.innerHTML = 'Datele fizice nu sunt încă încărcate.';
    return;
  }

  if (!sessionSelect.dataset.bound) {
    sessionSelect.addEventListener('change', (event) => {
      physicalSelectedSession = event.target.value;
      renderPhysicalStats();
    });
    sessionSelect.dataset.bound = '1';
  }

  renderPhysicalStats();
}