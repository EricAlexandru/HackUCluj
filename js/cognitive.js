let cogChartInstance = null;

function normalizeCognitiveText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/ș/g, "s")
    .replace(/ț/g, "t")
    .replace(/ă/g, "a")
    .replace(/â/g, "a")
    .replace(/î/g, "i");
}

function escapeCognitiveHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCognitiveRoleGroup(position) {
  const pos = String(position || "").toUpperCase().trim();

  if (pos.includes("GK")) return "GK";
  if (/(CB|LB|RB|LWB|RWB|DF)/.test(pos)) return "DEF";
  if (/(ST|FW|LW|RW|ATT|CF)/.test(pos)) return "ATT";
  if (/(CDM|CM|CAM|LM|RM|MID|AM|MD)/.test(pos)) return "MID";

  return "MID";
}

function getCognitivePositionIcon(group) {
  if (group === "GK") return "🧤";
  if (group === "DEF") return "🛡️";
  if (group === "MID") return "⚙️";
  return "⚡";
}

function getCognitivePlayerPhoto(player) {
  return player?.url || (findPlayerStats(player?.name)?.url ?? "");
}

function getCognitivePlayerLabel(player) {
  return escapeCognitiveHtml(player?.name || "Necunoscut");
}

function getCognitiveBaseDecay(group, rating) {
  const baseByGroup = {
    GK: 0.18,
    DEF: 0.62,
    MID: 0.8,
    ATT: 0.68
  };

  const base = baseByGroup[group] ?? 0.7;
  const ratingBoost = clampCog(1.12 - ((Number(rating) || 0) - 60) * 0.006, 0.82, 1.14);

  return Number((base * ratingBoost).toFixed(3));
}

function buildCognitiveRoster() {
  const pool = (window.PLAYERS_STATS || [])
    .filter((player) => player && player.Nume && player.Pozitie)
    .map((player) => ({
      name: String(player.Nume).trim(),
      position: String(player.Pozitie).trim(),
      rating: Number(player.Overall_Rating || 0),
      number: player.Numar_Tricou || "",
      url: player.url || "",
      roleGroup: getCognitiveRoleGroup(player.Pozitie),
      fullback: /^(LB|RB|LWB|RWB)$/i.test(String(player.Pozitie).trim()) || String(player.Pozitie).toUpperCase().includes("LB/LW")
    }))
    .filter((player) => player.name && player.roleGroup !== "OTHER");

  const used = new Set();
  const starters = [];
  const takeBest = (group, limit) => {
    pool
      .filter((player) => player.roleGroup === group && !used.has(player.name))
      .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name, "ro"))
      .slice(0, limit)
      .forEach((player) => {
        used.add(player.name);
        starters.push(player);
      });
  };

  takeBest("GK", 1);
  takeBest("DEF", 4);
  takeBest("MID", 4);
  takeBest("ATT", 2);

  if (starters.length < 11) {
    pool
      .filter((player) => !used.has(player.name))
      .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name, "ro"))
      .slice(0, 11 - starters.length)
      .forEach((player) => {
        used.add(player.name);
        starters.push(player);
      });
  }

  const bench = pool
    .filter((player) => !used.has(player.name))
    .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name, "ro"));

  return [...starters, ...bench].map((player, index) => ({
    id: `${index < 11 ? "S" : "B"}${index + 1}`,
    name: player.name,
    position: player.position,
    roleGroup: player.roleGroup,
    status: index < 11 ? "Teren" : "Bancă",
    energy: 100,
    errorRate: 5,
    baseDecay: getCognitiveBaseDecay(player.roleGroup, player.rating),
    fullback: Boolean(player.fullback),
    starter: index < 11,
    reserve: index >= 11,
    hasPlayed: index < 11,
    number: player.number,
    url: player.url,
    rating: player.rating,
    history: []
  }));
}

function renderCognitivePlayerVisual(player, label) {
  const photo = getCognitivePlayerPhoto(player);
  const name = getCognitivePlayerLabel(player);
  const number = escapeCognitiveHtml(player?.number || "");
  const group = getCognitiveRoleGroup(player?.position);
  const energyText = typeof player?.energy === "number" ? `${player.energy.toFixed(1)}% energie` : "";

  return `
    <div class="cog-sub-person">
      <div class="cog-sub-photo-wrap">
        ${photo
          ? `<img class="cog-sub-photo" src="${escapeCognitiveHtml(photo)}" alt="${name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
          : ""}
        <div class="cog-sub-photo-fallback" style="${photo ? "display:none;" : ""}">${getCognitivePositionIcon(group)}</div>
        ${number ? `<span class="cog-sub-number">#${number}</span>` : ""}
      </div>
      <div class="cog-sub-meta">
        <div class="cog-sub-label">${escapeCognitiveHtml(label)}</div>
        <div class="cog-sub-name">${name}</div>
        <div class="cog-sub-role">${escapeCognitiveHtml(player?.position || "")}</div>
        ${energyText ? `<div class="cog-sub-stats"><span>${escapeCognitiveHtml(energyText)}</span></div>` : ""}
      </div>
    </div>
  `;
}

function renderCognitiveSwapCard(event) {
  const outPlayer = event.outPlayer || {};
  const inPlayer = event.inPlayer || {};
  const outRisk = typeof event.outRisk === "number" ? `${event.outRisk.toFixed(1)}% risc` : "schimbare AI";
  const reasonLabel = event.reason === "prospețime" ? "prospețime" : "risc";
  const windowLabel = event.windowLabel ? ` · ${event.windowLabel}` : "";

  return `
    <li class="cog-event-card cog-event-swap">
      <div class="cog-event-topline">
        <span class="cog-event-minute">Min ${event.minute}${windowLabel}</span>
        <span class="cog-event-chip">${escapeCognitiveHtml(reasonLabel)}</span>
      </div>
      <div class="cog-event-text cog-event-summary">${escapeCognitiveHtml(`${outPlayer.name || "Un jucător"} (${outRisk}) → ${inPlayer.name || "rezervează"}`)}</div>
      <div class="cog-swap-grid">
        ${renderCognitivePlayerVisual(outPlayer, "iese")}
        <div class="cog-sub-arrow">→</div>
        ${renderCognitivePlayerVisual(inPlayer, "intră")}
      </div>
    </li>
  `;
}

const cognitiveState = {
  initialized: false,
  started: false,
  playing: false,
  playInterval: null,
  minute: 1,
  maxMinute: 90,
  maxSubs: 5,
  maxWindows: 3,
  usedSubs: 0,
  usedWindows: new Set(),
  windowsExhaustedLogged: false,
  subsExhaustedLogged: false,
  uclujScore: 0,
  oppScore: 0,
  tactics: "Echilibrat / Standard",
  players: [],
  events: [],
  snapshots: {}
};

const cogDom = {
  startBtn: null,
  resetBtn: null,
  slider: null,
  minuteLabel: null,
  playBtn: null,
  kpis: null,
  tableBody: null,
  eventsList: null,
  playerSelect: null,
  chartCanvas: null
};

function clampCog(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function computeErrorFromEnergy(energy) {
  if (energy >= 30) {
    return clampCog(5 + (100 - energy) * 0.12, 5, 20);
  }
  const overflow = Math.exp((30 - energy) / 6) - 1;
  return clampCog(20 + overflow * 6, 20, 40);
}

function riskStatus(errorRate) {
  if (errorRate > 20) return "CRITIC";
  if (errorRate > 12) return "ATENȚIE";
  return "OK";
}

function riskClass(errorRate) {
  if (errorRate > 20) return "cog-risk-red";
  if (errorRate > 12) return "cog-risk-yellow";
  return "cog-risk-green";
}

function initCognitivePlayers() {
  const roster = buildCognitiveRoster();

  return roster.map((player) => ({
    ...player,
    baseDecay: player.baseDecay * (window.getGPSCognitivePenalty ? window.getGPSCognitivePenalty(player.name) : 1)
  }));
}

function resetCognitiveState() {
  cognitiveState.started = false;
  if (cognitiveState.playInterval) clearInterval(cognitiveState.playInterval);
  cognitiveState.playing = false;
  cognitiveState.minute = 1;
  cognitiveState.usedSubs = 0;
  cognitiveState.usedWindows = new Set();
  cognitiveState.windowsExhaustedLogged = false;
  cognitiveState.subsExhaustedLogged = false;
  cognitiveState.uclujScore = 0;
  cognitiveState.oppScore = 0;
  cognitiveState.tactics = "Echilibrat / Standard";
  cognitiveState.players = initCognitivePlayers();
  cognitiveState.events = [];
  cognitiveState.snapshots = {};

  if (cogChartInstance) {
    cogChartInstance.destroy();
    cogChartInstance = null;
  }
}

function addCognitiveEvent(minute, type, text) {
  cognitiveState.events.push({ minute, type, text });
}

function getFieldPlayers() {
  return cognitiveState.players.filter((player) => player.status === "Teren");
}

function getBenchByPosition(position) {
  const targetGroup = getCognitiveRoleGroup(position);
  const targetPosition = normalizeCognitiveText(position);

  return cognitiveState.players
    .filter((player) => {
      if (player.status !== "Bancă" || !player.reserve || player.hasPlayed) return false;
      const playerPosition = normalizeCognitiveText(player.position);
      return playerPosition === targetPosition || player.roleGroup === targetGroup;
    })
    .sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name, "ro"));
}

function getCognitiveRiskThreshold(minute) {
  if (minute >= 80) return 14.5;
  if (minute >= 70) return 15.5;
  if (minute >= 60) return 16.5;
  if (minute >= 45) return 17.5;
  if (minute >= 30) return 18.5;
  return 20;
}

function getCognitiveSubstitutionWindow(minute) {
  if (minute === 45) return 0;
  if (minute >= 54 && minute <= 60) return 1;
  if (minute >= 64 && minute <= 72) return 2;
  if (minute >= 76 && minute <= 84) return 3;
  return null;
}

function getCognitiveWindowLabel(windowId) {
  if (windowId === 1) return "55-60'";
  if (windowId === 2) return "65-72'";
  if (windowId === 3) return "76-84'";
  return "pauză";
}

function getTacticalSubstitutionCandidate(minute) {
  const fatiguedPlayer = getFieldPlayers()
    .filter((player) => player.position !== "GK")
    .sort((a, b) => a.energy - b.energy || b.errorRate - a.errorRate)[0];

  if (!fatiguedPlayer) return null;

  // Permite schimbări timpurii dacă rata de eroare este CRITICĂ (ex: alertă medicală simulată)
  if (minute < 45 && fatiguedPlayer.errorRate < 22) return null;
  if (minute >= 45 && minute < 55 && fatiguedPlayer.errorRate < 16) return null;

  if (fatiguedPlayer.energy > 82 && fatiguedPlayer.errorRate < 14.5) return null;

  const benchCandidate = getBenchByPosition(fatiguedPlayer.position)[0];
  if (!benchCandidate) return null;

  return { playerOut: fatiguedPlayer, playerIn: benchCandidate };
}

function applyHalftimeRecovery(minute) {
  // Titularii de pe teren recuperează la pauză, apoi intră în degradare accelerată în repriza 2.
  getFieldPlayers().forEach((player) => {
    if (!player.starter) return;
    player.energy = clampCog(player.energy + 15, 0, 100);
    const safeError = computeErrorFromEnergy(player.energy);
    player.errorRate = clampCog(Math.min(player.errorRate * 0.72, safeError + 2), 5, 40);
  });

  addCognitiveEvent(minute, "info", "Min 45: Pauză. Recuperare activă aplicată titularilor de pe teren.");
}

function applySubstitution(minute, outPlayer, inPlayer, reason = "risc") {
  outPlayer.status = "Bancă";
  inPlayer.status = "Teren";
  inPlayer.hasPlayed = true;
  inPlayer.energy = 95;
  inPlayer.errorRate = 5;

  cognitiveState.usedSubs += 1;

  cognitiveState.events.push({
    minute,
    type: "swap",
    outPlayer: {
      name: outPlayer.name,
      position: outPlayer.position,
      number: outPlayer.number,
      url: outPlayer.url,
      roleGroup: outPlayer.roleGroup,
      energy: outPlayer.energy,
      errorRate: outPlayer.errorRate
    },
    inPlayer: {
      name: inPlayer.name,
      position: inPlayer.position,
      number: inPlayer.number,
      url: inPlayer.url,
      roleGroup: inPlayer.roleGroup,
      energy: inPlayer.energy,
      errorRate: inPlayer.errorRate
    },
    outRisk: outPlayer.errorRate,
    reason,
    windowLabel: getCognitiveWindowLabel(getCognitiveSubstitutionWindow(minute))
  });
}

function runAISubstitutionEngine(minute) {
  // Motorul AI lucrează în ferestre realiste de schimbare, cu prioritate pe risc și apoi pe prospețime.
  const threshold = getCognitiveRiskThreshold(minute);
  let windowId = getCognitiveSubstitutionWindow(minute);
  const isHalftime = minute === 45;

  // Detectează urgențele (erori masive) pentru a face schimbări în afara ferestrelor normale
  const hasEmergency = getFieldPlayers().some((p) => p.errorRate > 22);
  if (!isHalftime && !windowId && hasEmergency) {
    windowId = 10 + cognitiveState.usedWindows.size; // Creează o fereastră de urgență artificială
  }

  if (!isHalftime && !windowId) return;
  if (!isHalftime && cognitiveState.usedWindows.has(windowId) && !hasEmergency) return;

  const riskyPlayers = getFieldPlayers()
    .filter((player) => player.errorRate > threshold)
    .sort((a, b) => b.errorRate - a.errorRate);

  if (cognitiveState.usedSubs >= cognitiveState.maxSubs) {
    if (!cognitiveState.subsExhaustedLogged) {
      cognitiveState.subsExhaustedLogged = true;
      addCognitiveEvent(minute, "info", `Min ${minute}: toate cele 5 schimbări au fost deja utilizate.`);
    }
    return;
  }

  if (!isHalftime && cognitiveState.usedWindows.size >= cognitiveState.maxWindows) {
    if (!cognitiveState.windowsExhaustedLogged) {
      cognitiveState.windowsExhaustedLogged = true;
      addCognitiveEvent(minute, "info", `Min ${minute}: ferestrele de schimbare au fost deja consumate.`);
    }
    return;
  }

  let plannedChanges = [];

  if (riskyPlayers.length) {
    plannedChanges = riskyPlayers.slice(0, isHalftime ? 2 : 1).map((playerOut) => ({
      playerOut,
      playerIn: getBenchByPosition(playerOut.position)[0],
      reason: "risc"
    }));
  } else if (!isHalftime) {
    const tacticalSwap = getTacticalSubstitutionCandidate(minute);
    if (tacticalSwap) {
      plannedChanges = [{ ...tacticalSwap, reason: "prospețime" }];
    }
  }

  plannedChanges.forEach(({ playerOut, playerIn, reason }) => {
    if (cognitiveState.usedSubs >= cognitiveState.maxSubs) return;
    if (!playerIn) {
      addCognitiveEvent(
        minute,
        "warn",
        `Min ${minute}: ${playerOut.name} a intrat în fereastra de schimbare, dar nu există rezervă potrivită pe poziția ${playerOut.position}.`
      );
      return;
    }

    applySubstitution(minute, playerOut, playerIn, reason);
  });

  if (!isHalftime && plannedChanges.length > 0) {
    cognitiveState.usedWindows.add(windowId);
  }
}

function saveSnapshot(minute) {
  const clonedPlayers = cognitiveState.players.map((player) => ({
    name: player.name,
    position: player.position,
    status: player.status,
    energy: Number(player.energy.toFixed(2)),
    errorRate: Number(player.errorRate.toFixed(2))
  }));

  const activePlayers = clonedPlayers.filter((player) => player.status === "Teren");
  const avgEnergy = activePlayers.reduce((sum, player) => sum + player.energy, 0) / 11;

  cognitiveState.snapshots[minute] = {
    minute,
    players: clonedPlayers,
    usedSubs: cognitiveState.usedSubs,
    usedWindows: cognitiveState.usedWindows.size,
    avgEnergy: Number(avgEnergy.toFixed(2)),
    uclujScore: cognitiveState.uclujScore,
    oppScore: cognitiveState.oppScore,
    tactics: cognitiveState.tactics
  };
}

function simulateMinute(minute) {
  // Simulare pe minut: degradare energetică, efect cognitiv, pauză, decizie AI și snapshot pentru UI.
  const secondHalfFactor = minute > 45 ? 1.22 : 1;

  getFieldPlayers().forEach((player) => {
    const positionFactor = player.position === "MID" ? 1.16 : player.position === "DEF" ? 1.09 : player.position === "GK" ? 0.45 : 1;
    const flankFactor = player.position === "DEF" && player.fullback ? 1.12 : 1;
    const noise = (Math.random() - 0.5) * 0.08;
    const decay = (player.baseDecay + noise) * positionFactor * flankFactor * secondHalfFactor;

    player.energy = clampCog(player.energy - decay, 0, 100);
    player.errorRate = computeErrorFromEnergy(player.energy);
  });

  // --- SIMULARE GOLURI, INCIDENTE ȘI DECIZII TACTICE ---
  let goalChanceUCluj = 0.010;
  let goalChanceOpp = 0.010;

  const avgAttEnergy = getFieldPlayers().filter(p => p.roleGroup === "ATT" || p.roleGroup === "MID").reduce((s, p) => s + p.energy, 0) / 6;
  const avgDefError = getFieldPlayers().filter(p => p.roleGroup === "DEF" || p.roleGroup === "GK").reduce((s, p) => s + p.errorRate, 0) / 5;

  if (avgAttEnergy > 80) goalChanceUCluj += 0.005;
  if (avgDefError > 15) goalChanceOpp += 0.008;

  const rand = Math.random();
  if (rand < goalChanceUCluj) {
      cognitiveState.uclujScore++;
      addCognitiveEvent(minute, "info", `⚽ GOOOL U Cluj! Scorul devine ${cognitiveState.uclujScore} - ${cognitiveState.oppScore}.`);
      cognitiveState.tactics = Math.random() > 0.5 ? "Posesie & Control" : "Gegenpressing Atresiv";
      addCognitiveEvent(minute, "info", `🧠 TACTIC: Am preluat conducerea/am marcat. Recomandare sistem AI: ${cognitiveState.tactics}.`);
  } else if (rand < goalChanceUCluj + goalChanceOpp) {
      cognitiveState.oppScore++;
      addCognitiveEvent(minute, "warn", `🔴 GOL primit. Scorul devine ${cognitiveState.uclujScore} - ${cognitiveState.oppScore}.`);
      cognitiveState.tactics = "Ofensiv / Linii Sus";
      addCognitiveEvent(minute, "warn", `🧠 TACTIC: Am încasat gol. Linia de apărare e lentă (Eroare medie defensivă: ${avgDefError.toFixed(1)}%). Recomandare: ${cognitiveState.tactics}.`);
  } else if (rand < goalChanceUCluj + goalChanceOpp + 0.015) {
      const events = [
          "Mijlocul terenului este aglomerat. Încercați schimbarea direcției de atac pe flancuri.",
          "Adversarul lasă spații mari între linii. Cereți decarului (CAM) să atace acele zone libere.",
          "Risc de contraatac! Fundașii laterali urcă prea mult. Cereți prudență defensivă temporară.",
          "Echipa este prea statică la construcție. Intensificați mișcarea fără minge în zona neutră.",
          "Pressingul advers este sufocant. Folosiți pase sigure și portarul pentru a atrage presiunea."
      ];
      addCognitiveEvent(minute, "info", `💡 OBSERVAȚIE: ${events[Math.floor(Math.random() * events.length)]}`);
  }

  // Incident medical/fizic aleatoriu (simularea nevoii de schimbare înainte de pauză)
  if (minute > 10 && Math.random() < 0.004) {
      const field = getFieldPlayers();
      const unlucky = field[Math.floor(Math.random() * field.length)];
      unlucky.errorRate = Math.min(40, unlucky.errorRate + 18);
      unlucky.energy = Math.max(0, unlucky.energy - 30);
      addCognitiveEvent(minute, "warn", `🚑 ALERTĂ MEDICALĂ / EPUIZARE: ${unlucky.name} acuză dureri sau epuizare subită. Eroare critică crescută la ${unlucky.errorRate.toFixed(1)}%!`);
  }

  if (minute === 45) {
    applyHalftimeRecovery(minute);
  }

  runAISubstitutionEngine(minute);

  const activeCount = getFieldPlayers().length;
  if (activeCount !== 11) {
    addCognitiveEvent(minute, "warn", `Min ${minute}: consistență invalidă, jucători activi = ${activeCount}.`);
  }

  cognitiveState.players.forEach((player) => {
    player.history.push({
      minute,
      energy: Number(player.energy.toFixed(2)),
      errorRate: Number(player.errorRate.toFixed(2)),
      status: player.status
    });
  });

  saveSnapshot(minute);
}

function runFullSimulation() {
  for (let minute = 1; minute <= cognitiveState.maxMinute; minute += 1) {
    simulateMinute(minute);
  }
}

function renderCognitiveKpis(snapshot) {
  const kpiItems = [
    {
      label: "Timp / Scor",
      value: `${snapshot.minute}' | ${snapshot.uclujScore} - ${snapshot.oppScore}`,
      sub: "Simulare Meci"
    },
    {
      label: "Atitudine Tactică",
      value: `${snapshot.tactics}`,
      sub: "Sistem Recomandat Curent"
    },
    {
      label: "Schimbări Rămase",
      value: `${cognitiveState.maxSubs - snapshot.usedSubs}`,
      sub: "din 5 permise"
    },
    {
      label: "Energie Medie Echipă",
      value: `${snapshot.avgEnergy.toFixed(1)}%`,
      sub: "media jucătorilor activi"
    }
  ];

  cogDom.kpis.innerHTML = kpiItems
    .map(
      (kpi) => `
      <div class="stat-box">
        <div class="stat-label">${kpi.label}</div>
        <div class="stat-num">${kpi.value}</div>
        <div class="stat-sub">${kpi.sub}</div>
      </div>
    `
    )
    .join("");
}

function renderCognitiveTable(snapshot) {
  const activePlayers = snapshot.players
    .filter((player) => player.status === "Teren")
    .sort((a, b) => b.errorRate - a.errorRate);

  cogDom.tableBody.innerHTML = activePlayers
    .map((player) => {
      const status = riskStatus(player.errorRate);
      const badgeColor = player.errorRate > 20 ? '#ef4444' : player.errorRate > 12 ? '#eab308' : '#22c55e';
      const textColor = player.errorRate > 12 && player.errorRate <= 20 ? '#000' : '#fff';

      return `
        <tr class="${riskClass(player.errorRate)}">
          <td>${player.name}</td>
          <td>${player.position}</td>
          <td>${player.energy.toFixed(1)}%</td>
          <td>${player.errorRate.toFixed(1)}%</td>
          <td><span style="background:${badgeColor}; color:${textColor}; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; letter-spacing: 0.5px;">${status}</span></td>
        </tr>
      `;
    })
    .join("");
}

function renderCognitiveEvents(currentMinute) {
  const visible = cognitiveState.events.filter((event) => event.minute <= currentMinute);

  if (!visible.length) {
    cogDom.eventsList.innerHTML = "<li class='cog-event-card cog-event-empty'>Nu există recomandări până la acest minut.</li>";
    cogDom.eventsList.scrollTop = 0;
    return;
  }

  cogDom.eventsList.innerHTML = visible
    .reverse()
    .map((event) => {
      if (event.type === "swap") {
        return renderCognitiveSwapCard(event);
      }

      const cls = event.type === "warn" ? "cog-event-warn" : "cog-event-info";
      const icon = event.type === "warn" ? "⚠️" : "ℹ️";

      return `
        <li class="cog-event-card cog-event-note ${cls}">
          <div class="cog-event-topline">
            <span class="cog-event-minute">Min ${event.minute}</span>
            <span class="cog-event-chip">${icon}</span>
          </div>
          <div class="cog-event-text">${escapeCognitiveHtml(event.text)}</div>
        </li>
      `;
    })
    .join("");

  requestAnimationFrame(() => {
    cogDom.eventsList.scrollTop = 0;
  });
}

function syncCognitivePlayerSelect(snapshot) {
  const activeNames = snapshot.players.filter((player) => player.status === "Teren").map((player) => player.name);
  const selected = cogDom.playerSelect.value;

  cogDom.playerSelect.innerHTML = activeNames.map((name) => `<option value="${name}">${name}</option>`).join("");

  if (activeNames.includes(selected)) {
    cogDom.playerSelect.value = selected;
  }
}

function renderCognitiveChart(playerName, currentMinute) {
  const player = cognitiveState.players.find((item) => item.name === playerName);
  if (!player) return;

  // Evităm suprapunerea dataset-urilor prin distrugerea graficului precedent.
  if (cogChartInstance) {
    cogChartInstance.destroy();
  }

  const chartCtx = cogDom.chartCanvas.getContext("2d");
  cogChartInstance = new Chart(chartCtx, {
    type: "line",
    data: {
      labels: Array.from({length: 90}, (_, i) => i + 1),
      datasets: [
        {
          label: "Energie (%)",
          data: Array.from({length: 90}, (_, i) => i + 1 <= currentMinute ? player.history[i].energy : null),
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59, 130, 246, 0.15)",
          borderWidth: 3,
          tension: 0.3,
          pointRadius: 0,
          fill: true
        },
        {
          label: "Rata Eroare (%)",
          data: Array.from({length: 90}, (_, i) => i + 1 <= currentMinute ? player.history[i].errorRate : null),
          borderColor: "#ef4444",
          borderWidth: 3,
          borderDash: [6, 4],
          tension: 0.3,
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: false,
      plugins: {
        legend: {
          labels: {
            color: "#c9d0de",
            font: { family: "DM Sans" }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "#a9b4c7" },
          grid: { color: "rgba(255,255,255,0.05)" }
        },
        y: {
          min: 0,
          max: 100,
          ticks: { color: "#a9b4c7" },
          grid: { color: "rgba(255,255,255,0.05)" }
        }
      }
    }
  });
}

function renderCognitiveAtMinute(minute) {
  const snapshot = cognitiveState.snapshots[minute];
  if (!snapshot) return;

  cognitiveState.minute = minute;
  cogDom.slider.value = String(minute);
  cogDom.minuteLabel.textContent = `${minute}'`;

  renderCognitiveKpis(snapshot);
  renderCognitiveTable(snapshot);
  renderCognitiveEvents(minute);
  syncCognitivePlayerSelect(snapshot);

  if (cogDom.playerSelect.value) {
    renderCognitiveChart(cogDom.playerSelect.value, minute);
  }
}

function toggleCognitivePlayback() {
  if (!cognitiveState.started) return;

  if (cognitiveState.playing) {
    cognitiveState.playing = false;
    clearInterval(cognitiveState.playInterval);
    cogDom.playBtn.innerHTML = "▶ PLAY";
    cogDom.playBtn.classList.remove('active');
  } else {
    if (cognitiveState.minute >= cognitiveState.maxMinute) {
      renderCognitiveAtMinute(1);
    }
    cognitiveState.playing = true;
    cogDom.playBtn.innerHTML = "⏸ PAUZĂ";
    cogDom.playBtn.classList.add('active');

    cognitiveState.playInterval = setInterval(() => {
      let nextMin = cognitiveState.minute + 1;
      if (nextMin > cognitiveState.maxMinute) {
        toggleCognitivePlayback();
      } else {
        renderCognitiveAtMinute(nextMin);
      }
    }, 600);
  }
}

function startCognitiveSimulation() {
  resetCognitiveState();
  runFullSimulation();
  cognitiveState.started = true;
  cogDom.slider.disabled = false;
  if (cogDom.playBtn) {
    cogDom.playBtn.disabled = false;
    cogDom.playBtn.innerHTML = "▶ PLAY";
    cogDom.playBtn.classList.remove('active');
  }
  renderCognitiveAtMinute(1);
}

function clearCognitiveUI() {
  cogDom.slider.disabled = true;
  cogDom.slider.value = "1";
  cogDom.minuteLabel.textContent = "1'";
  if (cogDom.playBtn) {
    cogDom.playBtn.disabled = true;
    cogDom.playBtn.innerHTML = "▶ PLAY";
    cogDom.playBtn.classList.remove('active');
  }
  cogDom.kpis.innerHTML = "";
  cogDom.tableBody.innerHTML = "";
  cogDom.eventsList.innerHTML = "";
  cogDom.playerSelect.innerHTML = "";

  if (cogChartInstance) {
    cogChartInstance.destroy();
    cogChartInstance = null;
  }
}

function initCognitiveDashboard() {
  if (cognitiveState.initialized) return;

  cogDom.startBtn = document.getElementById("cogStartBtn");
  cogDom.resetBtn = document.getElementById("cogResetBtn");
  cogDom.slider = document.getElementById("cogMinuteSlider");
  cogDom.minuteLabel = document.getElementById("cogMinuteLabel");
  cogDom.playBtn = document.getElementById("cogPlayBtn");
  cogDom.kpis = document.getElementById("cogKpis");
  cogDom.tableBody = document.getElementById("cogPlayersTbody");
  cogDom.eventsList = document.getElementById("cogEventsList");
  cogDom.playerSelect = document.getElementById("cogPlayerSelect");
  cogDom.chartCanvas = document.getElementById("cogPlayerChart");

  resetCognitiveState();
  clearCognitiveUI();

  cogDom.startBtn.addEventListener("click", startCognitiveSimulation);

  cogDom.resetBtn.addEventListener("click", () => {
    resetCognitiveState();
    clearCognitiveUI();
  });

  cogDom.slider.addEventListener("input", (event) => {
    if (!cognitiveState.started) return;
    if (cognitiveState.playing) toggleCognitivePlayback();
    renderCognitiveAtMinute(Number(event.target.value));
  });

  cogDom.playerSelect.addEventListener("change", () => {
    if (!cognitiveState.started) return;
    renderCognitiveChart(cogDom.playerSelect.value, cognitiveState.minute);
  });

  if (cogDom.playBtn) {
    cogDom.playBtn.addEventListener("click", toggleCognitivePlayback);
  }

  cognitiveState.initialized = true;
}
