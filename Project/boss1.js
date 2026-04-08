// ════════════════════════════════════════════════════════════
//  BOSS 1 — EGGMAN  |  boss1.js
//  • Movimentação horizontal com ← → (COM LOOPING)
//  • Plataformas com colisão top e bottom
//  • Caixa mistério a cada 25s (1 power-up aleatório)
//  • Duplo pulo mata terrestres mas NÃO voadores
//  • inimigo3 (tucano) dispara
//  • eggman2.gif virado corretamente (scaleX via CSS)
//  • Sons para power-ups, colisões, etc.
// ════════════════════════════════════════════════════════════

// ── AUDIO SYSTEM (Web Audio API para sons procedurais) ────────
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// ── BGM SYSTEM ─────────────────────────────────────────────────
// Usa arquivos mp3 quando disponíveis, fallback para procedural
let bgmInterval = null;
let currentBgmLevel = 0;
let currentBgmId = null;
let bassOsc = null;
let melodyOsc = null;
let arpeggioOsc = null;
let bassGain = null;
let melodyGain = null;
let arpeggioGain = null;
let arpeggioIndex = 0;

// Notas musicais para as diferentes fases
const bgmNotes = {
  // Fase 1: Score 0-249 - Calma e relaxante
  level1: [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25], // C4-D4-E4-F4-G4-A4-B4-C5
  bass1:  [130.81, 146.83, 164.81, 174.61], // C3-D3-E3-F3

  // Fase 2: Score 250-499 - Um pouco mais energética
  level2: [293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33], // D4-E4-F4-G4-A4-B4-C5-D5
  bass2:  [146.83, 164.81, 174.61, 196.00], // D3-E3-F3-G3

  // Fase 3: Score 500-749 - Mais intensa
  level3: [349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 698.46], // F4-G4-A4-B4-C5-D5-E5-F5
  bass3:  [174.61, 196.00, 220.00, 246.94], // F3-G3-A3-B3

  // Fase 4: Score 750-999 - Muito intensa
  level4: [392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99], // G4-A4-B4-C5-D5-E5-F5-G5
  bass4:  [196.00, 220.00, 246.94, 261.63], // G3-A3-B3-C4

  // BATTLE INCOMING: Score 1000+ (antes do boss aparecer) - Música de batalha épica
  battle: [392.00, 440.00, 523.25, 440.00, 392.00, 523.25, 659.25, 523.25], // G4-A4-C5-A4-G4-C5-E5-C5
  battleBass: [98.00, 130.81, 98.00, 130.81], // G2-C3-G2-C3

  // BOSS: Boss fase ativa - Agressiva e épica
  boss: [523.25, 587.33, 659.25, 698.46, 783.99, 880.00, 987.77, 1046.50], // C5-D5-E5-F5-G5-A5-B5-C6
  bossBass: [130.81, 146.83, 164.81, 196.00, 220.00, 246.94, 261.63, 293.66] // C3-D3-E3-G3-A3-B3-C4-D4
};

// Arpeggios para efeitos especiais
const arpeggios = {
  calm: [1, 3, 5, 3],
  normal: [1, 2, 4, 3],
  intense: [1, 3, 5, 7],
  boss: [1, 3, 6, 8]
};

function getBgmData(level) {
  switch(level) {
    case 1: return { melody: bgmNotes.level1, bass: bgmNotes.bass1, arpeggio: arpeggios.calm };
    case 2: return { melody: bgmNotes.level2, bass: bgmNotes.bass2, arpeggio: arpeggios.normal };
    case 3: return { melody: bgmNotes.level3, bass: bgmNotes.bass3, arpeggio: arpeggios.intense };
    case 4: return { melody: bgmNotes.level4, bass: bgmNotes.bass4, arpeggio: arpeggios.intense };
    case 'battle': return { melody: bgmNotes.battle, bass: bgmNotes.battleBass, arpeggio: arpeggios.boss };
    case 'boss': return { melody: bgmNotes.boss, bass: bgmNotes.bossBass, arpeggio: arpeggios.boss };
    default: return { melody: bgmNotes.level1, bass: bgmNotes.bass1, arpeggio: arpeggios.calm };
  }
}

function startProceduralBGM(level) {
  stopProceduralBGM();

  const ctx = audioCtx;
  if (ctx.state === 'suspended') ctx.resume();

  const data = getBgmData(level);
  const isBoss = level === 'boss';
  const isBattle = level === 'battle';

  // Configurar volume baseado na fase
  const bassVol = isBoss ? 0.15 : (isBattle ? 0.12 : 0.08 + level * 0.015);
  const melodyVol = isBoss ? 0.12 : (isBattle ? 0.10 : 0.06 + level * 0.01);
  const arpeggioVol = isBoss ? 0.08 : (isBattle ? 0.07 : 0.03 + level * 0.008);

  // Criar osciladores
  bassOsc = ctx.createOscillator();
  bassGain = ctx.createGain();
  bassOsc.type = isBoss || isBattle ? 'sawtooth' : 'triangle';
  bassOsc.frequency.value = data.bass[0];
  bassGain.gain.value = 0;
  bassOsc.connect(bassGain);
  bassGain.connect(ctx.destination);
  bassOsc.start();

  melodyOsc = ctx.createOscillator();
  melodyGain = ctx.createGain();
  melodyOsc.type = isBoss || isBattle ? 'square' : 'sine';
  melodyOsc.frequency.value = data.melody[0];
  melodyGain.gain.value = 0;
  melodyOsc.connect(melodyGain);
  melodyGain.connect(ctx.destination);
  melodyOsc.start();

  arpeggioOsc = ctx.createOscillator();
  arpeggioGain = ctx.createGain();
  arpeggioOsc.type = isBoss || isBattle ? 'sawtooth' : 'sine';
  arpeggioOsc.frequency.value = data.melody[data.arpeggio[0] - 1];
  arpeggioGain.gain.value = 0;
  arpeggioOsc.connect(arpeggioGain);
  arpeggioGain.connect(ctx.destination);
  arpeggioOsc.start();

  arpeggioIndex = 0;

  // Fade in
  const fadeInTime = 0.5;
  const now = ctx.currentTime;
  bassGain.gain.setValueAtTime(0, now);
  bassGain.gain.linearRampToValueAtTime(bassVol, now + fadeInTime);
  melodyGain.gain.setValueAtTime(0, now);
  melodyGain.gain.linearRampToValueAtTime(melodyVol, now + fadeInTime);
  arpeggioGain.gain.setValueAtTime(0, now);
  arpeggioGain.gain.linearRampToValueAtTime(arpeggioVol, now + fadeInTime);

  // Loop de melodia principal
  let melodyIndex = 0;
  const melodySpeed = isBoss ? 250 : (isBattle ? 200 : 400 - level * 20);

  bgmInterval = setInterval(() => {
    if (!bassOsc || !melodyOsc || !arpeggioOsc) return;

    // Avançar melodia
    melodyIndex = (melodyIndex + 1) % data.melody.length;
    const melodyFreq = data.melody[melodyIndex];

    // Avançar arpeggio
    arpeggioIndex = (arpeggioIndex + 1) % data.arpeggio.length;
    const arpIdx = data.arpeggio[arpeggioIndex] - 1;
    const arpFreq = data.melody[Math.min(arpIdx, data.melody.length - 1)];

    // Avançar baixo (mais lento)
    if (melodyIndex % 4 === 0) {
      const bassIdx = (melodyIndex / 4) % data.bass.length;
      bassOsc.frequency.setValueAtTime(data.bass[bassIdx], ctx.currentTime);
    }

    melodyOsc.frequency.setValueAtTime(melodyFreq, ctx.currentTime);
    arpeggioOsc.frequency.setValueAtTime(arpFreq, ctx.currentTime);

    // Efeito de variação para boss e battle
    if ((isBoss || isBattle) && melodyIndex % 8 === 0) {
      melodyGain.gain.setValueAtTime(melodyVol * 1.3, ctx.currentTime);
      setTimeout(() => {
        if (melodyGain) melodyGain.gain.setValueAtTime(melodyVol, ctx.currentTime);
      }, 100);
    }

  }, melodySpeed);
}

function stopProceduralBGM() {
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }

  const ctx = audioCtx;
  const now = ctx.currentTime;
  const fadeTime = 0.3;

  if (bassGain) {
    bassGain.gain.setValueAtTime(bassGain.gain.value, now);
    bassGain.gain.linearRampToValueAtTime(0, now + fadeTime);
    setTimeout(() => { if (bassOsc) { bassOsc.stop(); bassOsc = null; } }, fadeTime * 1000);
  }
  if (melodyGain) {
    melodyGain.gain.setValueAtTime(melodyGain.gain.value, now);
    melodyGain.gain.linearRampToValueAtTime(0, now + fadeTime);
    setTimeout(() => { if (melodyOsc) { melodyOsc.stop(); melodyOsc = null; } }, fadeTime * 1000);
  }
  if (arpeggioGain) {
    arpeggioGain.gain.setValueAtTime(arpeggioGain.gain.value, now);
    arpeggioGain.gain.linearRampToValueAtTime(0, now + fadeTime);
    setTimeout(() => { if (arpeggioOsc) { arpeggioOsc.stop(); arpeggioOsc = null; } }, fadeTime * 1000);
  }

  bassGain = null;
  melodyGain = null;
  arpeggioGain = null;
}

// Mapeamento score -> id do audio element
function getBgmIdForScore() {
  if (isBossPhase)    return 'bgm-boss';
  if (score >= 1000)  return 'bgm-fight';
  if (score >= 750)   return 'bgm-score750';
  if (score >= 500)   return 'bgm-score500';
  if (score >= 250)   return 'bgm-score250';
  return 'bgm-score0';
}

const ALL_BGM_IDS = ['bgm-score0','bgm-score250','bgm-score500','bgm-score750','bgm-boss','bgm-fight','bgm-result-win','bgm-result-lose'];

function updateBGMProcedural() {
  if (isGameOver || isPaused) return;
  const targetId = getBgmIdForScore();
  if (targetId === currentBgmId) return;
  currentBgmId = targetId;
  stopProceduralBGM();
  ALL_BGM_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === targetId) {
      el.volume = 0.55;
      el.currentTime = 0;
      el.play().catch(() => {});
    } else {
      el.pause();
      el.currentTime = 0;
    }
  });
}

function playProceduralSound(type, vol = 0.3) {
  const ctx = audioCtx;
  if (ctx.state === 'suspended') ctx.resume();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.value = vol;
  switch(type) {
    case 'jump': osc.frequency.setValueAtTime(400, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15); osc.start(); osc.stop(ctx.currentTime + 0.15); break;
    case 'doublejump': osc.frequency.setValueAtTime(600, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.12); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18); osc.start(); osc.stop(ctx.currentTime + 0.18); break;
    case 'stomp': osc.frequency.setValueAtTime(150, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12); osc.start(); osc.stop(ctx.currentTime + 0.12); break;
    case 'collect': osc.type = 'sine'; osc.frequency.setValueAtTime(880, ctx.currentTime); osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.05); osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.1); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2); osc.start(); osc.stop(ctx.currentTime + 0.2); break;
    case 'hit': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2); osc.start(); osc.stop(ctx.currentTime + 0.2); break;
    case 'powerup': osc.type = 'sine'; osc.frequency.setValueAtTime(523, ctx.currentTime); osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1); osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2); osc.frequency.setValueAtTime(1047, ctx.currentTime + 0.3); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4); osc.start(); osc.stop(ctx.currentTime + 0.4); break;
    case 'enemydeath': osc.type = 'square'; osc.frequency.setValueAtTime(300, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2); osc.start(); osc.stop(ctx.currentTime + 0.2); break;
    case 'boxhit': osc.type = 'triangle'; osc.frequency.setValueAtTime(200, ctx.currentTime); osc.frequency.setValueAtTime(400, ctx.currentTime + 0.05); osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1); gain.gain.value = 0.4; gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25); osc.start(); osc.stop(ctx.currentTime + 0.25); break;
    case 'shoot': osc.type = 'square'; osc.frequency.setValueAtTime(800, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08); osc.start(); osc.stop(ctx.currentTime + 0.08); break;
  }
}

// ── DOM REFS ────────────────────────────────────────────────
const pauseScreen    = document.getElementById('pause-screen');
const board          = document.getElementById('game-board');
const marioEl        = document.getElementById('mario');
const playerWrap     = document.getElementById('player-wrap');
const bossWrap       = document.getElementById('boss-wrap');
const bossImgEl      = document.getElementById('boss-img');
const bossHpFill     = document.getElementById('boss-hp-fill');
const bossHpPct      = document.getElementById('boss-hp-pct');
const bossHpWrap     = document.getElementById('boss-hpbar-wrap');
const bossPhaseLabel = document.getElementById('boss-phase-label');
const bossAlertEl    = document.getElementById('boss-alert');
const bulletCon      = document.getElementById('bullet-container');
const enemyCon       = document.getElementById('enemy-container');
const itemCon        = document.getElementById('item-container');
const particleCon    = document.getElementById('particle-container');
const dmgNumCon      = document.getElementById('dmg-number-container');
const scoreVal       = document.getElementById('score-val');
const hudShieldBlock = document.getElementById('hud-shield-block');
const shieldVal      = document.getElementById('shield-val');
const hudInvBlock    = document.getElementById('hud-invincible-block');
const hudDoubleBlock = document.getElementById('hud-double-block');
const doubleVal      = document.getElementById('double-val');
const powerupToast   = document.getElementById('powerup-toast');
const resultScreen   = document.getElementById('result-screen');
const resultTitle    = document.getElementById('result-title');
const resultEggImg   = document.getElementById('result-eggman-img');
const rsScore        = document.getElementById('rs-score');
const rsKills        = document.getElementById('rs-kills');
const rsTime         = document.getElementById('rs-time');
const rsDmg          = document.getElementById('rs-dmg');
const rankLetter     = document.getElementById('rank-letter');
const btnRestart     = document.getElementById('btn-restart');
const btnAdvance     = document.getElementById('btn-advance');
const fireOverlay    = document.getElementById('fire-overlay');
const emberCon       = document.getElementById('ember-container');

// ── SOUNDS ──────────────────────────────────────────────────
function playSound(id, vol = 1) {
  const el = document.getElementById(id);
  if (!el) return;
  el.volume = vol; el.currentTime = 0;
  el.play().catch(() => {});
}
function stopSound(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.pause(); el.currentTime = 0;
}
function stopAllBGMs() {
  stopProceduralBGM();
  currentBgmId = null;
  ['bgm-score0','bgm-score250','bgm-score500','bgm-score750','bgm-boss','bgm-fight','bgm-result-win','bgm-result-lose'].forEach(stopSound);
}
function playBGM(id, vol = 0.5) {
  stopAllBGMs();
  const el = document.getElementById(id);
  if (!el) return;
  el.volume = vol; el.currentTime = 0;
  el.play().catch(() => {});
}

// ── BGM SCORE SYSTEM (usa sons procedurais) ────────────────
function updateBGM() {
  // Redireciona para o sistema procedural
  updateBGMProcedural();
}

// ── CONSTANTS ────────────────────────────────────────────────
const FLOOR_H     = 60;          // floor height in px
const BOARD_W     = () => window.innerWidth;
const BOARD_H     = () => window.innerHeight;
const MARIO_W     = 72;
const MARIO_SPEED = 4.5;
const GRAVITY     = 1.3;
const JUMP_FORCE  = 22;
const DOUBLE_JMP  = 17;

// Platform definitions (must match HTML left/width/bottom)
const PLATFORMS = [
  { id:'plat-high',  left:300, width:220, bottom:220 },
  { id:'plat-mid-l', left:600, width:180, bottom:165 },
  { id:'plat-mid-r', left:900, width:200, bottom:185 },
  { id:'plat-low',   left:500, width:160, bottom:120 },
];

// ── GAME STATE ───────────────────────────────────────────────
let isPaused      = false;
let score         = 0;
let lives         = 500
let enemiesKilled = 0;
let damageTaken   = 0;
let specialCharges = 0;
let specialFillPct = 0;
const SP_FILL_RATE  = 100 / 15;   // 1 bar per 15s
let isGameOver    = false;
let isBossPhase   = false;
let bossHP        = 100;
let bossPhase     = 'A';
let isInvincible  = false;
let canTakeDmg    = true;
let isCrouching   = false;
let isDoubleShot  = false;
let shieldKills   = 0;
let startTime     = Date.now();

// Player physics
let marioX    = 120;
let marioY    = 0;
let vSpeed    = 0;
let vHoriz    = 0;
let jumpCount = 0;
let facingLeft = false;

// Boss
let bossY  = 0;
let bossVY = 2.5;
const BOSS_MIN_Y = 10;
const BOSS_MAX_Y = 260;

// Intervals
let spawnInterval, bossBulletInterval, bossSpecialInterval;
let shieldTimerCD, doubleTimerCD, emberInterval, specialFillInterval;
let boxSpawnInterval;

// ── HUD ─────────────────────────────────────────────────────
function renderHearts() {
  for (let i = 1; i <= 5; i++) {
    const h = document.getElementById('heart-' + i);
    if (!h) continue;
    if (i <= lives) {
      h.classList.remove('lost');
    } else if (!h.classList.contains('lost')) {
      h.classList.add('lost', 'pulse');
      setTimeout(() => h.classList.remove('pulse'), 400);
    }
  }
}

function renderSpecialBars() {
  for (let i = 1; i <= 3; i++) {
    const bar  = document.getElementById('sp-' + i);
    const fill = document.getElementById('spf-' + i);
    if (!bar || !fill) continue;
    if (i < specialCharges + 1)       { fill.style.width = '100%'; bar.classList.add('full'); }
    else if (i === specialCharges + 1) { fill.style.width = specialFillPct + '%'; bar.classList.remove('full'); }
    else                               { fill.style.width = '0%'; bar.classList.remove('full'); }
  }
}

specialFillInterval = setInterval(() => {
  if (isGameOver || isPaused || specialCharges >= 3) return;
  specialFillPct += SP_FILL_RATE * 0.2;
  if (specialFillPct >= 100) { specialFillPct = 0; specialCharges = Math.min(3, specialCharges + 1); }
  renderSpecialBars();
}, 200);

function showToast(msg, color = '#ffe060', duration = 2200) {
  powerupToast.textContent = msg;
  powerupToast.style.color = color;
  powerupToast.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => powerupToast.classList.add('hidden'), duration);
}

function updateHUD() {
  scoreVal.textContent = score;
  renderHearts();
  renderSpecialBars();
  updateAtmosphere();
}

// ── ATMOSPHERE ───────────────────────────────────────────────
function updateAtmosphere() {
  board.className = board.className.replace(/atmo-\d/g, '').trim();
  if      (score >= 1000) {
    board.classList.add('atmo-4');
    fireOverlay.classList.add('active');
    startEmbers();
    // Forçar atualização do BGM para boss music
    if (!isBossPhase) {
      updateBGMProcedural();
    }
  }
  else if (score >= 750)  { board.classList.add('atmo-3'); stopEmbers(); fireOverlay.classList.remove('active'); }
  else if (score >= 500)  { board.classList.add('atmo-2'); stopEmbers(); fireOverlay.classList.remove('active'); }
  else if (score >= 250)  { board.classList.add('atmo-1'); stopEmbers(); fireOverlay.classList.remove('active'); }
  else                    {                                stopEmbers(); fireOverlay.classList.remove('active'); }
}

let embersRunning = false;
function startEmbers() {
  if (embersRunning) return; embersRunning = true;
  emberInterval = setInterval(() => { for(let i=0;i<3;i++) spawnEmber(); }, 120);
}
function stopEmbers() {
  embersRunning = false; clearInterval(emberInterval);
}
function spawnEmber() {
  const e = document.createElement('div');
  e.className = 'ember';
  const s = 4 + Math.random()*8;
  e.style.cssText=`width:${s}px;height:${s}px;left:${Math.random()*100}%;bottom:${Math.random()*30}%;--ex:${(Math.random()-.5)*80}px;animation-duration:${1.8+Math.random()*1.5}s;`;
  emberCon.appendChild(e);
  e.addEventListener('animationend',()=>e.remove());
}

// Score multipliers para diferentes ações
function addScore(amount, source = 'normal') {
  score += amount;
  updateHUD();
  updateBGM(); // Sempre atualizar BGM quando score muda
}

// ── PAUSE ────────────────────────────────────────────────────
function togglePause() {
  if (isGameOver) return;
  isPaused = !isPaused;
  pauseScreen.classList.toggle('hidden', !isPaused);

  if (isPaused) {
    // PAUSAR: parar todos os intervalos de movimento
    stopAllIntervals();
    stopProceduralBGM(); // Pausar música também
  } else {
    // DESPAUSAR: retomar intervalos baseado no estado atual
    resumeAllIntervals();
    updateBGMProcedural(); // Retomar música
  }
}

// Arrays para guardar referências dos intervalos
let allIntervals = [];

function saveAllIntervals() {
  // Esta função será chamada para salvar referências dos intervalos
  // quando eles forem criados
}

function stopAllIntervals() {
  if (spawnInterval) clearInterval(spawnInterval);
  if (bossBulletInterval) clearInterval(bossBulletInterval);
  if (bossSpecialInterval) clearInterval(bossSpecialInterval);
  if (bossSpiralInterval) clearInterval(bossSpiralInterval);
  if (bossLaserInterval) clearInterval(bossLaserInterval);
  if (bossEnrageInterval) clearInterval(bossEnrageInterval);
  if (bossMovementInterval) clearInterval(bossMovementInterval);
  if (boxSpawnInterval) clearInterval(boxSpawnInterval);
  if (emberInterval) clearInterval(emberInterval);
}

function resumeAllIntervals() {
  // Retomar intervalos baseado no estado do jogo
  if (!isBossPhase) {
    spawnInterval = setInterval(() => { if (!isGameOver && !isPaused && !isBossPhase) spawnEnemy(); }, 2500);
    boxSpawnInterval = setInterval(() => { if (!isGameOver && !isPaused && !isBossPhase) spawnMysteryBox(); }, 25000);
  } else {
    // Boss phase - retomar intervalos do boss
    if (bossBulletInterval) clearInterval(bossBulletInterval);
    bossBulletInterval = setInterval(bossShoot, bossPhase === 'B' ? 300 : 450);
    if (bossPhase === 'B' && !bossSpecialInterval) {
      bossSpecialInterval = setInterval(bossSpecialShoot, 6000);
    }
    spawnInterval = setInterval(() => { if (!isGameOver && !isPaused) spawnEnemy(); }, 3000);
  }

  // Retomar partículas de brasas se necessário
  if (score >= 1000 && !embersRunning) {
    startEmbers();
  }
}

// ── PLATFORM COLLISION ───────────────────────────────────────
function getPlatformAt(px, py, pw) {
  // Returns a platform the player is landing on (top surface)
  for (const plat of PLATFORMS) {
    const playerRight  = px + pw;
    const playerLeft   = px;
    const platRight    = plat.left + plat.width;
    const overlapX     = playerRight > plat.left + 8 && playerLeft < platRight - 8;
    const playerBottom = py;           // bottom of player (world Y from floor)
    const platTop      = plat.bottom;  // top surface Y
    // Landing: player bottom was above, now at/below platform top, falling
    if (overlapX && playerBottom >= platTop - 2 && playerBottom <= platTop + 16 && vSpeed <= 0) {
      return plat;
    }
  }
  return null;
}

function getPlatformBelow(px, py, pw) {
  // Returns platform we're standing on
  for (const plat of PLATFORMS) {
    const playerRight = px + pw;
    const overlapX    = (px + pw) > plat.left + 4 && px < (plat.left + plat.width) - 4;
    const atSurface   = Math.abs(py - plat.bottom) <= 4;
    if (overlapX && atSurface) return plat;
  }
  return null;
}

// ── PHYSICS LOOP ─────────────────────────────────────────────
function physicsLoop() {
  if (isGameOver) { requestAnimationFrame(physicsLoop); return; }
  if (isPaused)   { requestAnimationFrame(physicsLoop); return; }

  // Horizontal movement with SCREEN WRAP (looping)
  const boardWidth = BOARD_W();
  if (keysDown['ArrowLeft']) {
    marioX -= MARIO_SPEED;
    if (!facingLeft) { facingLeft = true; applyMarioFlip(); }
  } else if (keysDown['ArrowRight']) {
    marioX += MARIO_SPEED;
    if (facingLeft) { facingLeft = false; applyMarioFlip(); }
  }

  // WRAP AROUND: quando chega na borda, aparece do outro lado
  if (marioX > boardWidth) {
    marioX = -MARIO_W;
    wrapEnemiesAndItems();
  } else if (marioX < -MARIO_W) {
    marioX = boardWidth;
    wrapEnemiesAndItems();
  }

  // Gravidade
  vSpeed -= GRAVITY;
  marioY += vSpeed;

  // Colisão com o chão
  if (marioY <= 0) {
    marioY = 0; vSpeed = 0; jumpCount = 0;
  }

  // Colisão com plataformas (aterrissar em cima)
  const landedPlat = getPlatformAt(marioX, marioY, MARIO_W);
  if (landedPlat && vSpeed <= 0) {
    marioY    = landedPlat.bottom;
    vSpeed    = 0;
    jumpCount = 0;
  }

  // Aplicar posição
  playerWrap.style.left   = marioX + 'px';
  playerWrap.style.bottom = (FLOOR_H + marioY) + 'px';

  // Boss float
  if (isBossPhase) {
    bossY += bossVY;
    if (bossY >= BOSS_MAX_Y) bossVY = -Math.abs(bossVY);
    if (bossY <= BOSS_MIN_Y) bossVY =  Math.abs(bossVY);
    bossWrap.style.bottom = (FLOOR_H + bossY) + 'px';
  }

  checkStompEnemies();
  requestAnimationFrame(physicsLoop);
}

// ── SCREEN WRAP (Looping de cenário) ─────────────────────────
function wrapEnemiesAndItems() {
  // Move todos os elementos do jogo para criar efeito de wrapping
  const allEnemies = enemyCon.querySelectorAll('.enemy');
  const allBullets = bulletCon.querySelectorAll('.bullet');
  const allItems = itemCon.querySelectorAll('.power-item, .shield-item');
  const boxes = board.querySelectorAll('.mystery-box');

  // Inverter direção dos inimigos terrestres quando wrapped
  allEnemies.forEach(e => {
    if (e.dataset.type === 'normal') {
      const currentRight = parseInt(e.style.right || 0);
      const newRight = -(BOARD_W() - currentRight);
      e.style.right = newRight + 'px';
    }
  });
}
requestAnimationFrame(physicsLoop);

function applyMarioFlip() {
  if (isCrouching) {
    marioEl.className = marioEl.className.replace(/facing-left|crouching/g,'').trim();
    marioEl.classList.add('crouching');
    if (facingLeft) marioEl.classList.add('facing-left');
  } else {
    marioEl.classList.toggle('facing-left', facingLeft);
  }
}

// ── JUMP ─────────────────────────────────────────────────────
function jump() {
  if (isGameOver || isPaused) return;
  if (jumpCount === 0) {
    vSpeed = JUMP_FORCE; jumpCount = 1;
    playSound('snd-jump', 0.7);
    playProceduralSound('jump', 0.2);
  } else if (jumpCount === 1) {
    vSpeed = DOUBLE_JMP; jumpCount = 2;
    playSound('snd-jump', 0.5);
    playProceduralSound('doublejump', 0.25);
  }
}

// ── CROUCH ───────────────────────────────────────────────────
function crouch(on) {
  isCrouching = on;
  if (on) { marioEl.classList.add('crouching'); if(facingLeft) marioEl.classList.add('facing-left'); }
  else    { marioEl.classList.remove('crouching'); }
}

// ── STOMP ENEMIES (Duplo pulo mata terrestres, stomp em tucano mata ele sem dano) ──
function checkStompEnemies() {
  if (vSpeed >= 0) return;
  enemyCon.querySelectorAll('.enemy').forEach(eEl => {
    const mRect = playerWrap.getBoundingClientRect();
    const eRect = eEl.getBoundingClientRect();
    const ox = !(mRect.right < eRect.left || mRect.left > eRect.right);
    const oy = mRect.bottom >= eRect.top && mRect.bottom <= eRect.top + 28;
    if (ox && oy) {
      if (eEl.dataset.type === 'toucan') {
        // Tucano (inimigo3.gif) morre com pulo, sem tirar vida do player
        playProceduralSound('stomp', 0.4);
        killEnemy(eEl);
        vSpeed = JUMP_FORCE * 0.55;
      } else {
        // Terrestres MORREM com stomp
        playProceduralSound('stomp', 0.4);
        killEnemy(eEl);
        vSpeed = JUMP_FORCE * 0.55;
      }
    }
  });
}

// ── SHOOT ────────────────────────────────────────────────────
function shoot(special = false, direction = 'horizontal') {
  if (isGameOver || isPaused) return;
  if (special) {
    if (specialCharges <= 0) return;
    specialCharges--; specialFillPct = 0;
    renderSpecialBars();
    playSound('snd-shoot-special', 0.8);
  } else {
    playSound('snd-shoot', 0.5);
  }
  if (direction === 'up') {
    fireBulletUp(special);
    if (!special && isDoubleShot) setTimeout(() => fireBulletUp(false), 80);
  } else if (direction === 'down') {
    fireBulletDown(special);
    if (!special && isDoubleShot) setTimeout(() => fireBulletDown(false), 80);
  } else {
    fireBullet(special, false);
    if (!special && isDoubleShot) setTimeout(() => fireBullet(false, true), 80);
  }
}

function fireBulletUp(special) {
  playProceduralSound('shoot', 0.15);
  const b = document.createElement('div');
  b.className = special ? 'special-bullet bullet-up' : 'bullet-up';
  const startX = marioX + MARIO_W / 2 - 5;
  const startY = FLOOR_H + marioY + (isCrouching ? 18 : 38);
  b.style.left   = startX + 'px';
  b.style.bottom = startY + 'px';
  bulletCon.appendChild(b);

  let by = startY;
  const spd = special ? 18 : 12;
  const dmg = special ? 10 : 2;

  const mv = setInterval(() => {
    if (isGameOver || !b.parentElement) { clearInterval(mv); return; }
    by += spd;
    b.style.bottom = by + 'px';

    if (isBossPhase && checkCollision(b, bossWrap)) {
      clearInterval(mv); b.remove(); hitBoss(dmg, special); return;
    }

    board.querySelectorAll('.boss-bullet,.boss-bullet-special').forEach(bb => {
      if (checkCollision(b, bb)) { bb.remove(); if (!special) { b.remove(); clearInterval(mv); } }
    });
    if (!b.parentElement) return;

    board.querySelectorAll('.mystery-box:not(.hit)').forEach(box => {
      if (checkCollision(b, box)) { b.remove(); clearInterval(mv); hitMysteryBox(box); }
    });
    if (!b.parentElement) return;

    for (const e of enemyCon.querySelectorAll('.enemy')) {
      if (checkCollision(b, e)) {
        if (e.dataset.type === 'toucan') {
          damageToucan(e, special ? 3 : 1);
          if (!special) { b.remove(); clearInterval(mv); return; }
        } else {
          killEnemy(e);
          if (!special) { b.remove(); clearInterval(mv); return; }
        }
      }
    }

    if (by > BOARD_H() + 80) { b.remove(); clearInterval(mv); }
  }, 16);
}

function fireBulletDown(special) {
  playProceduralSound('shoot', 0.15);
  const b = document.createElement('div');
  b.className = special ? 'special-bullet bullet-down' : 'bullet-down';
  const startX = marioX + MARIO_W / 2 - 5;
  const startY = FLOOR_H + marioY - 10;
  b.style.left   = startX + 'px';
  b.style.bottom = startY + 'px';
  bulletCon.appendChild(b);

  let by = startY;
  const spd = special ? -18 : -12;
  const dmg = special ? 10 : 2;

  const mv = setInterval(() => {
    if (isGameOver || !b.parentElement) { clearInterval(mv); return; }
    by += spd;
    b.style.bottom = by + 'px';

    if (isBossPhase && checkCollision(b, bossWrap)) {
      clearInterval(mv); b.remove(); hitBoss(dmg, special); return;
    }

    board.querySelectorAll('.boss-bullet,.boss-bullet-special').forEach(bb => {
      if (checkCollision(b, bb)) { bb.remove(); if (!special) { b.remove(); clearInterval(mv); } }
    });
    if (!b.parentElement) return;

    board.querySelectorAll('.mystery-box:not(.hit)').forEach(box => {
      if (checkCollision(b, box)) { b.remove(); clearInterval(mv); hitMysteryBox(box); }
    });
    if (!b.parentElement) return;

    for (const e of enemyCon.querySelectorAll('.enemy')) {
      if (checkCollision(b, e)) {
        if (e.dataset.type === 'toucan') {
          damageToucan(e, special ? 3 : 1);
          if (!special) { b.remove(); clearInterval(mv); return; }
        } else {
          killEnemy(e);
          if (!special) { b.remove(); clearInterval(mv); return; }
        }
      }
    }

    if (by < -80) { b.remove(); clearInterval(mv); }
  }, 16);
}

function fireBullet(special, isSecond) {
  playProceduralSound('shoot', 0.15);
  const b = document.createElement('div');
  b.className = special ? 'bullet special-bullet' : 'bullet';
  // Shoot direction based on facing
  const dir = facingLeft ? -1 : 1;
  const startX = marioX + (facingLeft ? -24 : MARIO_W);
  const startY = FLOOR_H + marioY + (isCrouching ? 18 : 38) + (isSecond ? 10 : 0);
  b.style.left   = startX + 'px';
  b.style.bottom = startY + 'px';
  bulletCon.appendChild(b);

  let bx = startX;
  const spd = (special ? 22 : 15) * dir;
  const dmg = special ? 10 : 2;

  const mv = setInterval(() => {
    if (isGameOver || !b.parentElement) { clearInterval(mv); return; }
    bx += spd;
    b.style.left = bx + 'px';

    // Hit boss
    if (isBossPhase && checkCollision(b, bossWrap)) {
      clearInterval(mv); b.remove(); hitBoss(dmg, special); return;
    }

    // Neutralise boss bullets
    board.querySelectorAll('.boss-bullet,.boss-bullet-special').forEach(bb => {
      if (checkCollision(b, bb)) {
        bb.remove();
        if (!special) { b.remove(); clearInterval(mv); }
      }
    });
    if (!b.parentElement) return;

    // Hit mystery box
    board.querySelectorAll('.mystery-box:not(.hit)').forEach(box => {
      if (checkCollision(b, box)) {
        b.remove(); clearInterval(mv);
        hitMysteryBox(box);
      }
    });
    if (!b.parentElement) return;

    // Hit enemy
    for (const e of enemyCon.querySelectorAll('.enemy')) {
      if (checkCollision(b, e)) {
        if (e.dataset.type === 'toucan') {
          damageToucan(e, special ? 3 : 1);
          if (!special) { b.remove(); clearInterval(mv); return; }
        } else {
          killEnemy(e);
          if (!special) { b.remove(); clearInterval(mv); return; }
        }
      }
    }

    if (bx > BOARD_W() + 80 || bx < -80) { b.remove(); clearInterval(mv); }
  }, 16);
}

// ── KILL ENEMY ───────────────────────────────────────────────
function killEnemy(eEl) {
  if (!eEl || !eEl.parentElement) return;
  score += 25; enemiesKilled++; shieldKills++;
  spawnParticles(eEl, '#ff8800', 8);
  spawnDmgNumber(eEl, '+25');
  playProceduralSound('enemydeath', 0.3);
  eEl.remove(); updateHUD(); updateBGM();
  if (shieldKills >= 12) { shieldKills = 0; dropShield(); }
  if (!isBossPhase && score >= 1000) triggerBossArena();
}

// ── TOUCAN ───────────────────────────────────────────────────
function damageToucan(eEl, dmg) {
  if (!eEl || !eEl.parentElement) return false;
  let hp = parseInt(eEl.dataset.hp || 3) - dmg;
  eEl.dataset.hp = hp;
  const img = eEl.querySelector('img');
  if (img) { img.style.filter='brightness(4)'; setTimeout(()=>{if(img)img.style.filter='';},120); }
  const fill = eEl.querySelector('.toucan-hp-fill');
  if (fill) fill.style.width = Math.max(0,(hp/3)*100)+'%';
  spawnDmgNumber(eEl, '-'+dmg, 'dmg-boss');
  if (hp <= 0) {
    score += 50; enemiesKilled++; shieldKills++;
    spawnParticles(eEl,'#44ff44',10);
    spawnDmgNumber(eEl,'+50');
    playProceduralSound('enemydeath', 0.3);
    eEl.remove(); updateHUD(); updateBGM();
    if (shieldKills>=12){shieldKills=0;dropShield();}
    if (!isBossPhase && score>=1000) triggerBossArena();
    return true;
  }
  return false;
}

// ── DROP SHIELD ──────────────────────────────────────────────
function dropShield() {
  const item = document.createElement('div');
  item.className = 'shield-item'; item.textContent = '🛡️';
  item.style.left   = (100 + Math.random() * (BOARD_W()-200)) + 'px';
  item.style.bottom = (FLOOR_H + 5) + 'px';
  itemCon.appendChild(item);
  const col = setInterval(() => {
    if (!item.parentElement) { clearInterval(col); return; }
    if (checkCollision(item, playerWrap)) { clearInterval(col); item.remove(); activatePower('shield'); }
  }, 100);
  setTimeout(() => { if(item.parentElement) item.remove(); clearInterval(col); }, 8000);
}

// ── MYSTERY BOX ──────────────────────────────────────────────
let mysteryBoxEl = null;
let mysteryBoxInterval = null;

function spawnMysteryBox() {
  if (isGameOver || isBossPhase) return;
  if (mysteryBoxEl && mysteryBoxEl.parentElement) return; // já existe uma caixa

  const box = document.createElement('div');
  box.className = 'mystery-box';
  box.textContent = '?';
  box.style.left   = (80 + Math.random() * (BOARD_W() - 200)) + 'px';
  box.style.bottom = (BOARD_H() * 0.45) + 'px';
  board.appendChild(box);
  mysteryBoxEl = box;

  // Falls down slowly
  let by = parseFloat(box.style.bottom);
  const fallTarget = FLOOR_H + 80;
  const fallMv = setInterval(() => {
    if (!box.parentElement) { clearInterval(fallMv); return; }
    by -= 2.5;
    box.style.bottom = by + 'px';
    if (by <= fallTarget) { clearInterval(fallMv); box.style.bottom = fallTarget + 'px'; }
  }, 16);

  // Check collision with player continuously (drops on touch)
  mysteryBoxInterval = setInterval(() => {
    if (!box.parentElement || box.classList.contains('hit')) { clearInterval(mysteryBoxInterval); return; }
    if (checkCollision(box, playerWrap)) {
      clearInterval(mysteryBoxInterval);
      hitMysteryBox(box);
    }
  }, 50);

  // Auto-remove after 18s
  setTimeout(() => {
    if(box.parentElement) { box.remove(); clearInterval(fallMv); clearInterval(mysteryBoxInterval); }
    mysteryBoxEl = null;
  }, 18000);
}

function hitMysteryBox(box) {
  if (box.classList.contains('hit')) return;
  box.classList.add('hit');
  playProceduralSound('boxhit', 0.4);

  // DROP APENAS 1 ITEM ALEATÓRIO
  const powers = ['invincible', 'double', 'charge'];
  const power = powers[Math.floor(Math.random() * powers.length)];
  spawnPowerDrop(box, power, 0);

  setTimeout(() => { if(box.parentElement) box.remove(); }, 1200);
}

function spawnPowerDrop(box, power, idx) {
  const item = document.createElement('div');
  item.className = 'power-item';
  const icons = { invincible:'⭐', double:'🔥', charge:'⚡' };
  item.textContent = icons[power] || '?';

  const boxRect = box.getBoundingClientRect();
  const gRect   = board.getBoundingClientRect();
  // Centralizar o item único
  let bx = boxRect.left - gRect.left + (idx - 1) * 52;
  let by = parseFloat(box.style.bottom) + 50;
  item.style.left   = bx + 'px';
  item.style.bottom = by + 'px';
  board.appendChild(item);

  // Float down to floor
  const fallMv = setInterval(() => {
    if (!item.parentElement) { clearInterval(fallMv); return; }
    by -= 1.8;
    item.style.bottom = by + 'px';
    if (by <= FLOOR_H + 2) { clearInterval(fallMv); item.style.bottom = (FLOOR_H + 2) + 'px'; }
  }, 16);

  const col = setInterval(() => {
    if (!item.parentElement) { clearInterval(col); clearInterval(fallMv); return; }
    if (checkCollision(item, playerWrap)) {
      clearInterval(col); clearInterval(fallMv);
      item.remove();
      activatePower(power);
    }
  }, 80);
  setTimeout(() => { if(item.parentElement){item.remove();clearInterval(col);clearInterval(fallMv);}}, 10000);
}

// ── POWER UPS ────────────────────────────────────────────────
function activatePower(type) {
  playProceduralSound('powerup', 0.25);
  playSound('snd-shield', 0.8);
  if (type === 'shield' || type === 'invincible') {
    if (isInvincible) return;
    isInvincible = true; canTakeDmg = false;
    marioEl.classList.add('invincible-effect');
    hudShieldBlock.classList.remove('hidden');
    hudInvBlock.classList.remove('hidden');
    showToast('⭐ INVENCÍVEL! 7s', '#ffe060');
    let sec = 7; shieldVal.textContent = sec+'s';
    clearInterval(shieldTimerCD);
    shieldTimerCD = setInterval(() => {
      sec--; shieldVal.textContent = sec+'s';
      if (sec <= 0) {
        clearInterval(shieldTimerCD);
        isInvincible=false; canTakeDmg=true;
        marioEl.classList.remove('invincible-effect');
        hudShieldBlock.classList.add('hidden');
        hudInvBlock.classList.add('hidden');
      }
    }, 1000);

  } else if (type === 'double') {
    isDoubleShot = true;
    hudDoubleBlock.classList.remove('hidden');
    showToast('🔥 DISPARO DUPLO! 10s', '#00f2ff');
    let sec = 10; doubleVal.textContent = sec+'s';
    clearInterval(doubleTimerCD);
    doubleTimerCD = setInterval(() => {
      sec--; doubleVal.textContent = sec+'s';
      if (sec <= 0) { clearInterval(doubleTimerCD); isDoubleShot=false; hudDoubleBlock.classList.add('hidden'); }
    }, 1000);

  } else if (type === 'charge') {
    // 60% faster special charge for 15s
    const oldRate = SP_FILL_RATE;
    showToast('⚡ CARGA RÁPIDA! 15s', '#88ff44');
    clearInterval(specialFillInterval);
    specialFillInterval = setInterval(() => {
      if (isGameOver || isPaused || specialCharges >= 3) return;
      specialFillPct += SP_FILL_RATE * 0.2 * 1.6;
      if (specialFillPct >= 100) { specialFillPct=0; specialCharges=Math.min(3,specialCharges+1); }
      renderSpecialBars();
    }, 200);
    setTimeout(() => {
      clearInterval(specialFillInterval);
      specialFillInterval = setInterval(() => {
        if (isGameOver || isPaused || specialCharges >= 3) return;
        specialFillPct += SP_FILL_RATE * 0.2;
        if (specialFillPct >= 100) { specialFillPct=0; specialCharges=Math.min(3,specialCharges+1); }
        renderSpecialBars();
      }, 200);
    }, 15000);
  }
}

// ── DAMAGE ───────────────────────────────────────────────────
function handleDamage(amount = 1) {
  if (isInvincible || !canTakeDmg) return;
  lives = Math.max(0, lives - amount);
  damageTaken += amount;
  canTakeDmg = false;
  marioEl.classList.add('damage-effect');
  renderHearts();
  playProceduralSound('hit', 0.35);
  playSound(lives <= 0 ? 'snd-mario-die' : 'snd-mario-hurt', 0.8);
  if (lives <= 0) { marioEl.classList.remove('damage-effect'); endGame(false); }
  else setTimeout(() => { marioEl.classList.remove('damage-effect'); canTakeDmg=true; }, 1200);
}

// ── BOSS ─────────────────────────────────────────────────────
let bossX = null;          // null = usa CSS right
let bossVX = 0;            // velocidade horizontal (fase B)
let bossDashing = false;
let bossRageMode = false;   // fase C: HP <= 20%
let bossLaserActive = false;
let bossLaserInterval = null;
let bossPhaseClockInterval = null;
let bossSpiralInterval = null;
let bossEnrageInterval = null;
let bossMovementInterval = null;

function triggerBossArena() {
  if (isBossPhase) return;
  isBossPhase = true;

  // Limpar intervalos do modo normal
  if (spawnInterval) clearInterval(spawnInterval);
  if (boxSpawnInterval) clearInterval(boxSpawnInterval);
  spawnInterval = null;
  boxSpawnInterval = null;

  // Limpar elementos na tela
  enemyCon.innerHTML = '';
  itemCon.innerHTML  = '';

  // Mostrar alerta do boss
  bossAlertEl.classList.remove('hidden');
  playSound('snd-boss-arrive', 0.9);

  setTimeout(() => {
    bossAlertEl.classList.add('hidden');
    bossWrap.classList.remove('hidden');
    bossHpWrap.classList.remove('hidden');
    bossWrap.style.bottom = (FLOOR_H + bossY) + 'px';

    // Música do boss
    currentBgmId = null; // força reload
    updateBGMProcedural();

    // Iniciar intervalos do boss
    bossBulletInterval = setInterval(bossShoot, 450);
    spawnInterval = setInterval(() => { if (!isGameOver && !isPaused) spawnEnemy(); }, 3000);
  }, 1800);
}

function hitBoss(dmg, special=false) {
  if (!isBossPhase||isGameOver) return;
  bossHP = Math.max(0, bossHP - dmg);
  bossImgEl.classList.add('hit-flash');
  setTimeout(()=>bossImgEl.classList.remove('hit-flash'),120);
  spawnDmgNumber(bossWrap, `-${dmg}`, special?'dmg-special':'dmg-normal');
  bossHpFill.style.width = bossHP+'%';
  bossHpPct.textContent  = bossHP+'%';

  // ── FASE B: HP <= 50 ──
  if (bossHP <= 50 && bossPhase === 'A') {
    bossPhase = 'B';
    bossImgEl.src = 'assets/imgs/eggman2.gif';
    bossImgEl.classList.add('phase-b');
    bossPhaseLabel.textContent = '⚙️ EGGMAN — FASE B';
    bossHpFill.classList.add('phase-b');
    bossVY = 3.5;
    playSound('snd-phase', 0.8);
    showToast('⚙️ FASE B — O EGGMAN FICOU COM RAIVA!', '#ff4400');

    // Parar tiro simples e iniciar padrões da fase B
    clearInterval(bossBulletInterval);
    bossBulletInterval = setInterval(bossShoot, 280);
    bossSpecialInterval = setInterval(bossSpecialShoot, 5000);

    // Tiro em espiral
    bossSpiralInterval = setInterval(bossSpiralShoot, 3500);

    // Laser a cada 9s
    bossLaserInterval = setInterval(bossFireLaser, 9000);

    // Dash a cada 7s
    bossEnrageInterval = setInterval(bossDash, 7000);

    // Movimento horizontal agressivo
    startBossHorizontalMovement();
  }

  // ── FASE C / RAGE: HP <= 20 ──
  if (bossHP <= 20 && bossPhase === 'B' && !bossRageMode) {
    bossRageMode = true;
    bossPhase = 'C';
    bossPhaseLabel.textContent = '💀 EGGMAN — FÚRIA FINAL!';
    bossHpFill.classList.remove('phase-b');
    bossHpFill.classList.add('phase-c');
    bossWrap.classList.add('boss-rage');
    showToast('💀 FÚRIA FINAL! SEM MISERICÓRDIA!', '#ff0000');
    playSound('snd-phase', 0.9);

    // Velocidade extrema
    bossVY = 5;
    clearInterval(bossBulletInterval);
    bossBulletInterval = setInterval(bossShoot, 180);
    clearInterval(bossSpiralInterval);
    bossSpiralInterval = setInterval(bossSpiralShoot, 2000);
    clearInterval(bossEnrageInterval);
    bossEnrageInterval = setInterval(bossDash, 4000);
    clearInterval(bossLaserInterval);
    bossLaserInterval = setInterval(bossFireLaser, 6000);
  }

  score += dmg * 10; updateHUD();
  if (bossHP <= 0) {
    // Limpar todos os intervalos do boss
    clearInterval(bossBulletInterval);
    clearInterval(bossSpecialInterval);
    clearInterval(bossSpiralInterval);
    clearInterval(bossLaserInterval);
    clearInterval(bossEnrageInterval);
    clearInterval(bossMovementInterval);
    endGame(true);
  }
}

// ── FASE B: HORIZONTAL MOVEMENT ──────────────────────────────
function startBossHorizontalMovement() {
  if (bossMovementInterval) clearInterval(bossMovementInterval);
  // Inicializar posição X do boss baseada na posição atual
  const bRect = bossWrap.getBoundingClientRect();
  const gRect = board.getBoundingClientRect();
  bossX = BOARD_W() - (bRect.right - gRect.left);  // equivale ao 'right' atual
  bossVX = bossRageMode ? 3.5 : 2.2;

  bossMovementInterval = setInterval(() => {
    if (isGameOver || isPaused || !isBossPhase) return;
    bossX += bossVX;
    const maxRight = BOARD_W() - 90;
    const minRight = 20;
    if (bossX >= maxRight) { bossX = maxRight; bossVX = -Math.abs(bossVX); }
    if (bossX <= minRight) { bossX = minRight; bossVX =  Math.abs(bossVX); }
    bossWrap.style.right = bossX + 'px';
    bossWrap.style.left = 'auto';
  }, 16);
}

// ── FASE B: DASH ─────────────────────────────────────────────
function bossDash() {
  if (!isBossPhase || isGameOver || bossDashing) return;
  bossDashing = true;
  bossWrap.classList.add('boss-dash');
  showToast('⚡ DASH!', '#ff8800');
  playSound('snd-boss-special', 0.7);

  // Direção do dash em direção ao jogador
  const bRect = bossWrap.getBoundingClientRect();
  const pRect = playerWrap.getBoundingClientRect();
  const dir = (pRect.left < bRect.left) ? 1 : -1;  // em coordenadas 'right'
  const dashSpeed = bossRageMode ? 22 : 16;
  let dashFrames = bossRageMode ? 18 : 14;

  const dashMv = setInterval(() => {
    if (!isBossPhase || isGameOver) { clearInterval(dashMv); bossDashing = false; return; }
    bossX = Math.max(20, Math.min(BOARD_W() - 90, bossX + dir * dashSpeed));
    bossWrap.style.right = bossX + 'px';

    // Causa dano ao contato durante o dash
    if (checkCollision(bossWrap, playerWrap) && canTakeDmg) {
      handleDamage(bossRageMode ? 2 : 1);
    }

    dashFrames--;
    if (dashFrames <= 0) {
      clearInterval(dashMv);
      bossWrap.classList.remove('boss-dash');
      bossDashing = false;
    }
  }, 16);
}

// ── FASE B: SPIRAL SHOOT ─────────────────────────────────────
function bossSpiralShoot() {
  if (!isBossPhase || isGameOver) return;
  playSound('snd-boss-special', 0.6);
  showToast('🌀 TIRO ESPIRAL!', '#cc00ff');

  const count = bossRageMode ? 10 : 7;
  const bRect = bossWrap.getBoundingClientRect();
  const gRect = board.getBoundingClientRect();
  const cx = bRect.left - gRect.left + bRect.width / 2;
  const cy = bossY + 60;

  for (let i = 0; i < count; i++) {
    const delay = i * (bossRageMode ? 60 : 80);
    setTimeout(() => {
      if (!isBossPhase || isGameOver) return;
      const angle = (360 / count) * i * (Math.PI / 180);
      spawnSpiralBullet(cx, cy, Math.cos(angle), Math.sin(angle));
    }, delay);
  }
}

function spawnSpiralBullet(cx, cy, dx, dy) {
  const b = document.createElement('div');
  b.className = 'boss-bullet boss-spiral-bullet';
  let bx = cx, by = cy;
  b.style.left = bx + 'px';
  b.style.bottom = by + 'px';
  board.appendChild(b);
  const spd = bossRageMode ? 8 : 6;
  const vx = dx * spd, vy = dy * spd;
  const mv = setInterval(() => {
    if (isGameOver || !b.parentElement) { clearInterval(mv); return; }
    bx += vx; by += vy;
    b.style.left = bx + 'px';
    b.style.bottom = by + 'px';
    if (checkCollision(b, playerWrap)) { handleDamage(1); b.remove(); clearInterval(mv); return; }
    if (bx < -60 || bx > BOARD_W() + 60 || by < -60 || by > BOARD_H() + 60) { b.remove(); clearInterval(mv); }
  }, 16);
}

// ── FASE B: LASER ─────────────────────────────────────────────
function bossFireLaser() {
  if (!isBossPhase || isGameOver || bossLaserActive) return;
  bossLaserActive = true;

  // Aviso visual antes do laser
  showToast('⚠️ LASER!', '#ff0000');
  bossWrap.classList.add('boss-charging');

  setTimeout(() => {
    if (!isBossPhase || isGameOver) { bossLaserActive = false; bossWrap.classList.remove('boss-charging'); return; }
    bossWrap.classList.remove('boss-charging');
    playSound('snd-boss-special', 1.0);

    const laser = document.createElement('div');
    laser.className = 'boss-laser boss-laser-b';
    const bRect = bossWrap.getBoundingClientRect();
    const gRect = board.getBoundingClientRect();
    const laserRight = BOARD_W() - (bRect.left - gRect.left);
    laser.style.right = laserRight + 'px';
    laser.style.bottom = (bossY + 40) + 'px';
    laser.style.width = (bRect.left - gRect.left + 30) + 'px';
    board.appendChild(laser);

    // Checar colisão por 1.5s
    const dmgInterval = setInterval(() => {
      if (!laser.parentElement) { clearInterval(dmgInterval); return; }
      if (checkCollision(laser, playerWrap) && canTakeDmg) handleDamage(bossRageMode ? 2 : 1);
    }, 200);

    setTimeout(() => {
      laser.remove();
      clearInterval(dmgInterval);
      bossLaserActive = false;
    }, 1500);
  }, 1200); // tempo de carregamento
}

// ── BOSS PHASE A: mantém right fixo ──────────────────────────

function bossShoot() {
  if (!isBossPhase||isGameOver) return;
  const b = document.createElement('div');
  b.className = 'boss-bullet';
  const bRect = bossWrap.getBoundingClientRect();
  const gRect = board.getBoundingClientRect();
  let cx = bRect.left - gRect.left + bRect.width / 2;
  let cy = bossY + 60;
  b.style.left=cx+'px'; b.style.bottom=cy+'px'; board.appendChild(b);

  let vx, vy;
  if (bossPhase !== 'A') {
    // Fase B/C: mirar no jogador
    const pRect = playerWrap.getBoundingClientRect();
    const px = pRect.left - gRect.left + pRect.width / 2;
    const py = (BOARD_H() - pRect.bottom + gRect.top) + FLOOR_H + marioY + 30;
    const dx = px - cx, dy = (FLOOR_H + marioY + 30) - cy;
    const len = Math.hypot(dx, dy) || 1;
    const spd = bossRageMode ? 13 : 10;
    vx = (dx/len)*spd; vy = (dy/len)*spd;
    // Tiro triplo na fase B
    if (bossPhase === 'B' || bossPhase === 'C') {
      spawnAimedBossBullet(cx, cy, vx * 0.85, vy * 0.85 + 2.5);
      spawnAimedBossBullet(cx, cy, vx * 0.85, vy * 0.85 - 2.5);
    }
  } else {
    const angle = 180+(Math.random()*50-25);
    const rad=angle*Math.PI/180;
    vx=Math.cos(rad)*10; vy=Math.sin(rad)*10;
  }

  const mv=setInterval(()=>{
    if(isGameOver||!b.parentElement){clearInterval(mv);b.remove();return;}
    cx+=vx;cy+=vy; b.style.left=cx+'px'; b.style.bottom=cy+'px';
    if(checkCollision(b,playerWrap)){handleDamage(1);b.remove();clearInterval(mv);return;}
    board.querySelectorAll('.bullet:not(.boss-bullet):not(.boss-bullet-special)').forEach(pb=>{
      if(checkCollision(b,pb)){if(!pb.classList.contains('special-bullet'))pb.remove();b.remove();clearInterval(mv);}
    });
    if(!b.parentElement) return;
    if(cx<-60||cy<-60||cy>BOARD_H()+60||cx>BOARD_W()+60){b.remove();clearInterval(mv);}
  },16);
}

function spawnAimedBossBullet(cx, cy, vx, vy) {
  const b = document.createElement('div');
  b.className = bossRageMode ? 'boss-bullet boss-bullet-fast' : 'boss-bullet';
  let bx = cx, by = cy;
  b.style.left = bx + 'px'; b.style.bottom = by + 'px';
  board.appendChild(b);
  const mv = setInterval(() => {
    if (isGameOver || !b.parentElement) { clearInterval(mv); return; }
    bx += vx; by += vy;
    b.style.left = bx + 'px'; b.style.bottom = by + 'px';
    if (checkCollision(b, playerWrap)) { handleDamage(1); b.remove(); clearInterval(mv); return; }
    if (bx < -60 || bx > BOARD_W()+60 || by < -60 || by > BOARD_H()+60) { b.remove(); clearInterval(mv); }
  }, 16);
}

function bossSpecialShoot() {
  if (!isBossPhase||isGameOver) return;
  playSound('snd-boss-special',0.9);
  const b=document.createElement('div');
  b.className='boss-bullet boss-bullet-special';
  const bRect=bossWrap.getBoundingClientRect();
  const gRect=board.getBoundingClientRect();
  let cx=bRect.left-gRect.left-20,cy=bossY+80;
  b.style.left=cx+'px';b.style.bottom=cy+'px';board.appendChild(b);
  const mv=setInterval(()=>{
    if(isGameOver||!b.parentElement){clearInterval(mv);b.remove();return;}
    cx-=8;b.style.left=cx+'px';
    if(checkCollision(b,playerWrap)){handleDamage(2);b.remove();clearInterval(mv);return;}
    board.querySelectorAll('.special-bullet').forEach(s=>{if(checkCollision(b,s)){b.remove();s.remove();clearInterval(mv);}});
    if(cx<-60){b.remove();clearInterval(mv);}
  },16);
}

// ── ENEMY SPAWN ──────────────────────────────────────────────
function spawnEnemy() {
  if (isGameOver) return;
  Math.random() < 0.4 ? spawnToucan() : spawnNormalEnemy();
}

function spawnNormalEnemy() {
  const eWrap=document.createElement('div');
  eWrap.className='enemy';eWrap.dataset.type='normal';
  const img=document.createElement('img');
  img.src='assets/imgs/inimigo.gif';img.alt='inimigo';
  eWrap.appendChild(img);
  eWrap.style.right='-60px';eWrap.style.bottom=FLOOR_H+'px';
  enemyCon.appendChild(eWrap);
  let pos=-60;
  let eyTimer=isBossPhase?setInterval(()=>{if(!eWrap.parentElement){clearInterval(eyTimer);return;}enemyShoot(eWrap,FLOOR_H+20);},2200+Math.random()*1000):null;
  const mv=setInterval(()=>{
    if(isGameOver||!eWrap.parentElement){clearInterval(mv);clearInterval(eyTimer);return;}
    pos+=(isBossPhase?4.5:5.5);eWrap.style.right=pos+'px';
    if(checkCollision(playerWrap,eWrap)&&canTakeDmg&&marioY<30){handleDamage(1);clearInterval(eyTimer);eWrap.remove();clearInterval(mv);return;}
    if(pos>BOARD_W()+100){clearInterval(mv);clearInterval(eyTimer);eWrap.remove();}
  },16);
}

function spawnToucan() {
  const eWrap=document.createElement('div');
  eWrap.className='enemy enemy-toucan';
  eWrap.dataset.type='toucan';eWrap.dataset.hp='3';
  const img=document.createElement('img');
  img.src='assets/imgs/inimigo3.gif';img.alt='tucano';
  eWrap.appendChild(img);
  const hpBar=document.createElement('div');hpBar.className='toucan-hp-bar';
  const hpFill=document.createElement('div');hpFill.className='toucan-hp-fill';hpFill.style.width='100%';
  hpBar.appendChild(hpFill);eWrap.appendChild(hpBar);
  const startY=80+Math.random()*200;
  eWrap.style.right='-70px';eWrap.style.bottom=(FLOOR_H+startY)+'px';
  enemyCon.appendChild(eWrap);
  let pos=-70,vertY=startY,vertV=(Math.random()<.5?1:-1)*(1.5+Math.random());
  // Shoot every 1.8s (always, not just boss phase)
  const shootTimer=setInterval(()=>{
    if(!eWrap.parentElement){clearInterval(shootTimer);return;}
    toucanShoot(eWrap,vertY);
  },1800);
  const mv=setInterval(()=>{
    if(isGameOver||!eWrap.parentElement){clearInterval(mv);clearInterval(shootTimer);return;}
    pos+=3.5;eWrap.style.right=pos+'px';
    vertY+=vertV;
    if(vertY>280||vertY<40)vertV*=-1;
    eWrap.style.bottom=(FLOOR_H+vertY)+'px';
    if(checkCollision(playerWrap,eWrap)&&canTakeDmg){handleDamage(1);clearInterval(shootTimer);eWrap.remove();clearInterval(mv);return;}
    if(pos>BOARD_W()+120){clearInterval(mv);clearInterval(shootTimer);eWrap.remove();}
  },16);
}

function toucanShoot(eWrap,vertY) {
  if(!eWrap.parentElement||isGameOver)return;
  const b=document.createElement('div');
  b.className='toucan-bullet';
  const eRect=eWrap.getBoundingClientRect();
  const gRect=board.getBoundingClientRect();
  let bx=eRect.left-gRect.left-14;
  let by=FLOOR_H+vertY;
  b.style.left=bx+'px';b.style.bottom=by+'px';board.appendChild(b);
  const pRect=playerWrap.getBoundingClientRect();
  const dx=(pRect.left+pRect.width/2)-(eRect.left+eRect.width/2);
  const dy=(pRect.top+pRect.height/2)-(eRect.top+eRect.height/2);
  const len=Math.hypot(dx,dy)||1,spd=7;
  const vx=(dx/len)*spd,vy=-(dy/len)*spd;
  const mv=setInterval(()=>{
    if(isGameOver||!b.parentElement){clearInterval(mv);return;}
    bx+=vx;by+=vy;b.style.left=bx+'px';b.style.bottom=by+'px';
    if(checkCollision(b,playerWrap)){handleDamage(1);b.remove();clearInterval(mv);return;}
    if(bx<-30||bx>BOARD_W()+30||by<-30||by>BOARD_H()+30){b.remove();clearInterval(mv);}
  },16);
}

function enemyShoot(eWrap,by) {
  if(!eWrap.parentElement||isGameOver)return;
  const b=document.createElement('div');b.className='enemy-bullet';
  const eRect=eWrap.getBoundingClientRect();
  const gRect=board.getBoundingClientRect();
  let bx=eRect.left-gRect.left-14;
  b.style.left=bx+'px';b.style.bottom=by+'px';board.appendChild(b);
  const mv=setInterval(()=>{
    if(isGameOver||!b.parentElement){clearInterval(mv);return;}
    bx-=9;b.style.left=bx+'px';
    if(checkCollision(b,playerWrap)){handleDamage(1);b.remove();clearInterval(mv);return;}
    if(bx<-30){b.remove();clearInterval(mv);}
  },16);
}

// ── SPAWN LOOPS ──────────────────────────────────────────────
spawnInterval = setInterval(() => { if (isGameOver || isPaused || isBossPhase) return; spawnEnemy(); }, 2500);
boxSpawnInterval = setInterval(() => { if (isGameOver || isPaused || isBossPhase) return; spawnMysteryBox(); }, 25000);

// ── PARTICLES / FX ───────────────────────────────────────────
function spawnParticles(refEl,color,count){
  if(!refEl)return;
  const rect=refEl.getBoundingClientRect(),bRect=board.getBoundingClientRect();
  const cx=rect.left-bRect.left+rect.width/2,cy=rect.top-bRect.top+rect.height/2;
  for(let i=0;i<count;i++){
    const p=document.createElement('div');p.className='particle';
    const size=4+Math.random()*8,angle=(Math.PI*2/count)*i,dist=30+Math.random()*40;
    p.style.cssText=`width:${size}px;height:${size}px;background:${color};left:${cx}px;top:${cy}px;--px:${Math.cos(angle)*dist}px;--py:${Math.sin(angle)*dist}px;`;
    particleCon.appendChild(p);p.addEventListener('animationend',()=>p.remove());
  }
}

function spawnDmgNumber(refEl,text,cls='dmg-normal'){
  if(!refEl)return;
  const rect=refEl.getBoundingClientRect(),bRect=board.getBoundingClientRect();
  const n=document.createElement('div');n.className='dmg-number '+cls;n.textContent=text;
  n.style.left=(rect.left-bRect.left+rect.width/2-20)+'px';
  n.style.top=(rect.top-bRect.top-10)+'px';
  dmgNumCon.appendChild(n);n.addEventListener('animationend',()=>n.remove());
}

// ── COLLISION ────────────────────────────────────────────────
function checkCollision(a,b){
  if(!a||!b)return false;
  const r1=a.getBoundingClientRect(),r2=b.getBoundingClientRect();
  return!(r1.right<r2.left||r1.left>r2.right||r1.bottom<r2.top||r1.top>r2.bottom);
}

// ── END GAME ─────────────────────────────────────────────────
function endGame(victory){
  isGameOver=true;
  clearInterval(spawnInterval);clearInterval(bossBulletInterval);
  clearInterval(bossSpecialInterval);clearInterval(shieldTimerCD);
  clearInterval(specialFillInterval);clearInterval(boxSpawnInterval);
  clearInterval(doubleTimerCD);clearInterval(mysteryBoxInterval);
  clearInterval(bossSpiralInterval);clearInterval(bossLaserInterval);
  clearInterval(bossEnrageInterval);clearInterval(bossMovementInterval);
  stopProceduralBGM();
  stopAllBGMs();
  const elapsed=Math.floor((Date.now()-startTime)/1000);
  if(victory){
    bossImgEl.src='assets/imgs/eggmanderrota2.gif';
    bossHpFill.style.width='0%';
    playSound('snd-victory',0.9);
    setTimeout(()=>{showResultScreen(true,elapsed);playBGM('bgm-result-win',0.5);},1800);
  }else{
    playSound('snd-defeat',0.9);
    setTimeout(()=>{showResultScreen(false,elapsed);playBGM('bgm-result-lose',0.5);},1200);
  }
}

function showResultScreen(victory,elapsed){
  resultTitle.textContent=victory?'🏆 VITÓRIA!':'💀 DERROTA!';
  resultTitle.className=victory?'victory':'defeat';
  resultEggImg.src=victory?'assets/imgs/eggmanderrota2.gif':'assets/imgs/eggmanvitoria.gif';
  rsScore.textContent=score;rsKills.textContent=enemiesKilled;
  rsTime.textContent=elapsed+'s';rsDmg.textContent=damageTaken;
  const rank=calcRank(victory,elapsed,damageTaken);
  rankLetter.textContent=rank;rankLetter.className='rank-'+rank;
  resultScreen.classList.remove('hidden');
}

function calcRank(victory,time,dmg){
  if(!victory)return'P';
  if(dmg===0&&time<=90)return'S';
  if(dmg<=1&&time<=120)return'A';
  if(dmg<=3&&time<=180)return'B';
  if(dmg<=5)return'C';
  return'D';
}

// ── BUTTONS ──────────────────────────────────────────────────
btnRestart.addEventListener('click',()=>location.reload());
btnAdvance.addEventListener('click',()=>{localStorage.setItem('boss1_defeated','true');window.location.href='index.html';});

// ── INPUT ────────────────────────────────────────────────────
const keysDown={};

// Função para verificar combinação de tiro
function checkShootCombo() {
  if (keysDown['KeyW'] && keysDown['KeyS']) {
    return 'up'; // S + W = atirar pra cima
  } else if (keysDown['KeyX'] && keysDown['KeyS']) {
    return 'down'; // S + X = atirar pra baixo
  } else if (keysDown['KeyS']) {
    return 'horizontal'; // Só S = atirar horizontal
  }
  return null;
}

document.addEventListener('keydown',e=>{
  if(e.code==='Escape'){e.preventDefault();togglePause();return;}
  if(isPaused||isGameOver)return;
  if(e.code==='ArrowUp'||e.code==='Space'){e.preventDefault();if(!e.repeat)jump();return;}
  if(keysDown[e.code])return;
  keysDown[e.code]=true;

  // Verificar combinações de tiro
  const shootDir = checkShootCombo();
  if (shootDir) {
    e.preventDefault();
    shoot(false, shootDir);
    return;
  }

  switch(e.code){
    case'ArrowDown':e.preventDefault();crouch(true);break;
    case'KeyD':shoot(true);break;
  }
});
document.addEventListener('keyup',e=>{
  keysDown[e.code]=false;
  if(e.code==='ArrowDown')crouch(false);
});

// ── START BGM ────────────────────────────────────────────────
const startBGM=()=>{updateBGMProcedural();document.removeEventListener('keydown',startBGM);document.removeEventListener('click',startBGM);};
document.addEventListener('keydown',startBGM);
document.addEventListener('click',startBGM);

// ── INIT ─────────────────────────────────────────────────────
updateHUD();
physicsLoop();