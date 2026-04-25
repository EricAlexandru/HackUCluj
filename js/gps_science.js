// ==========================================================================
// MODUL GPS SPORTS SCIENCE - COACH COPILOT
// ==========================================================================

// Aici se vor încărca datele din CSV parșate (ex: cu PapaParse sau SheetJS)
window.TRAINING_GPS_DATA = [];

/**
 * 1. ACUTE TRAINING LOAD (ATL)
 * Calculează încărcarea pe ultimele 7 zile.
 */
window.calculateAcuteLoad = function(playerName, referenceDate = new Date('2025-12-07')) {
  if (!window.TRAINING_GPS_DATA || !window.TRAINING_GPS_DATA.length) return null;

  const playerData = window.TRAINING_GPS_DATA.filter(row => row.Players === playerName);
  if (playerData.length === 0) return null;

  let acuteLoad = 0;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  playerData.forEach(session => {
    const sessionDate = new Date(session['Week Calendar'] || session.Sessions);
    const diffTime = referenceDate - sessionDate;

    if (diffTime >= 0 && diffTime <= sevenDaysMs) {
      const duration = parseFloat(session['Duration (min)']) || 0;
      const powerAvg = parseFloat(session['Load - Power Metabolic AVG (W/kg)']) || 0;
      acuteLoad += (duration * powerAvg);
    }
  });

  return acuteLoad;
};

/**
 * 2. UPGRADE RISC ACCIDENTARE (LOAD MANAGEMENT)
 * Detectează traumele mecanice din decelerări și sprinturi.
 */
window.calculateGPSInjuryRisk = function(playerName, referenceDate = new Date('2025-12-07')) {
  if (!window.TRAINING_GPS_DATA || !window.TRAINING_GPS_DATA.length) return null;

  const playerData = window.TRAINING_GPS_DATA.filter(row => row.Players === playerName);
  if (playerData.length === 0) return null;

  let totalDecelerations = 0; 
  let totalSprintsCount = 0;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  playerData.forEach(session => {
    const sessionDate = new Date(session['Week Calendar'] || session.Sessions);
    const diffTime = referenceDate - sessionDate;

    if (diffTime >= 0 && diffTime <= sevenDaysMs) {
      totalDecelerations += parseFloat(session['High Intensity Dec Abs (m)']) || 0;
      const duration = parseFloat(session['Duration (min)']) || 1;
      const sprintsPerMin = parseFloat(session['Sprints - Sprints Abs (count/min)']) || 0;
      totalSprintsCount += (sprintsPerMin * duration);
    }
  });

  const SAFE_DEC_LIMIT = 450; // metri limită de decelerări violente/săptămână
  const SAFE_SPRINT_LIMIT = 40; // sprinturi maxime/săptămână
  let baseRisk = 15; // Risc minim implicit
  
  if (totalDecelerations > SAFE_DEC_LIMIT) {
    const excess = totalDecelerations - SAFE_DEC_LIMIT;
    baseRisk += Math.pow((excess / 50), 1.5) * 10; // Creștere exponențială
  }
  if (totalSprintsCount > SAFE_SPRINT_LIMIT) {
    const excessSprints = totalSprintsCount - SAFE_SPRINT_LIMIT;
    baseRisk += (excessSprints * 1.2);
  }

  return Math.min(95, Math.max(0, Math.round(baseRisk)));
};

/**
 * 3. INTEGRARE DEGRADARE COGNITIVĂ (CNS FATIGUE)
 * Influențează "baseDecay"-ul jucătorului.
 */
window.getGPSCognitivePenalty = function(playerName, matchDate = new Date('2025-12-07')) {
  if (!window.TRAINING_GPS_DATA || !window.TRAINING_GPS_DATA.length) return 1.0;
  const playerData = window.TRAINING_GPS_DATA.filter(row => row.Players === playerName);
  let penaltyFactor = 1.0;
  playerData.forEach(session => {
    const sessionDate = new Date(session['Week Calendar'] || session.Sessions);
    const diffHours = (matchDate - sessionDate) / (1000 * 60 * 60);
    if (diffHours > 0 && diffHours <= 48) {
      const powerAvg = parseFloat(session['Load - Power Metabolic AVG (W/kg)']) || 0;
      if (powerAvg > 12) penaltyFactor = Math.max(penaltyFactor, 1.40); // 40% penalizare
      else if (powerAvg > 10) penaltyFactor = Math.max(penaltyFactor, 1.20); // 20% penalizare
    }
  });
  return penaltyFactor;
};