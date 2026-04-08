// ============================================================
//  MUNDO DOS DESAFIOS — script.js
//  Overworld Cuphead-style
// ============================================================

// ── WORLD DIMENSIONS ──────────────────────────────────────
const WORLD_W = 1400;
const WORLD_H = 950;

// ── PLAYER CONFIG ─────────────────────────────────────────
const SPEED = 3.2;
const INTERACT_DIST = 90; // pixels

// ── WALKABLE ZONES ────────────────────────────────────────
// Cada zona é um círculo {cx,cy,r} ou retângulo {x,y,w,h}
// Cobre: ilhas grandes, ilhas pequenas, e a faixa da estrada
const WALK_CIRCLES = [
  // ── ILHAS GRANDES ──
  { cx: 310,  cy: 680, r: 145 },   // ilha inferior esquerda
  { cx: 580,  cy: 470, r: 175 },   // ilha central
  { cx: 860,  cy: 295, r: 155 },   // ilha superior direita
  { cx: 860,  cy: 670, r: 135 },   // ilha inferior direita
  // ── ILHAS PEQUENAS ──
  { cx: 160,  cy: 340, r:  70 },   // ilha mini esquerda
  { cx: 1030, cy: 455, r:  60 },   // ilha mini direita
  // ── ESTRADA PRINCIPAL (segmentos como cápsulas = dois círculos por ponto) ──
  { cx: 300,  cy: 700, r: 55 },
  { cx: 360,  cy: 640, r: 55 },
  { cx: 420,  cy: 580, r: 55 },
  { cx: 470,  cy: 530, r: 55 },
  { cx: 500,  cy: 500, r: 55 },
  { cx: 540,  cy: 465, r: 55 },
  { cx: 580,  cy: 440, r: 55 },
  { cx: 630,  cy: 415, r: 55 },
  { cx: 670,  cy: 400, r: 55 },
  { cx: 700,  cy: 390, r: 55 },
  { cx: 740,  cy: 375, r: 55 },
  { cx: 780,  cy: 360, r: 55 },
  { cx: 820,  cy: 345, r: 55 },
  { cx: 860,  cy: 318, r: 55 },
  { cx: 900,  cy: 280, r: 55 },
  { cx: 940,  cy: 248, r: 55 },
  { cx: 980,  cy: 218, r: 55 },
  { cx: 1020, cy: 188, r: 55 },
  { cx: 1050, cy: 168, r: 55 },
  // ── RAMAL PARA BOSS 3 ──
  { cx: 720,  cy: 430, r: 52 },
  { cx: 745,  cy: 468, r: 52 },
  { cx: 768,  cy: 508, r: 52 },
  { cx: 790,  cy: 548, r: 52 },
  { cx: 812,  cy: 590, r: 52 },
  { cx: 832,  cy: 630, r: 52 },
  { cx: 850,  cy: 668, r: 52 },
  { cx: 860,  cy: 700, r: 52 },
];

function isWalkable(px, py) {
  // px,py = centro do jogador
  for (const z of WALK_CIRCLES) {
    const dx = px - z.cx, dy = py - z.cy;
    if (dx*dx + dy*dy <= z.r*z.r) return true;
  }
  return false;
}


// ── DOM REFS ──────────────────────────────────────────────
const camera        = document.getElementById('camera');
const world         = document.getElementById('world');
const playerEl      = document.getElementById('player');
const playerImg     = document.getElementById('player-img');
const dialogueOverlay = document.getElementById('dialogue-overlay');
const dialogueText  = document.getElementById('dialogue-text');
const dialogueName  = document.getElementById('dialogue-name');
const dialogueClose = document.getElementById('dialogue-close');
const dialoguePortraitImg = document.getElementById('dialogue-portrait-img');
const transitionEl  = document.getElementById('transition-overlay');
const transitionText = document.getElementById('transition-text');
const coinRain      = document.getElementById('coin-rain');
const cutsceneOverlay = document.getElementById('cutscene-overlay');
const cutsceneVideo   = document.getElementById('cutscene-video');

// HUD status spans
const hb1Status = document.getElementById('hb1-status');
const hb2Status = document.getElementById('hb2-status');
const hb3Status = document.getElementById('hb3-status');
const hb1       = document.getElementById('hb1');
const hb2       = document.getElementById('hb2');
const hb3       = document.getElementById('hb3');

// ── STATE ─────────────────────────────────────────────────
let player = { x: 290, y: 680 };
let keys   = {};
let dialogueOpen = false;
let inTransition = false;
let pendingCutscene = false;

// Boss defeat state (from localStorage)
let defeated = {
  1: localStorage.getItem('boss1_defeated') === 'true',
  2: localStorage.getItem('boss2_defeated') === 'true',
  3: localStorage.getItem('boss3_defeated') === 'true',
};

// Entity definitions
const entities = [
  {
    id: 'npc-tuba',
    el: document.getElementById('npc-tuba'),
    hintEl: document.getElementById('hint-tuba'),
    type: 'npc',
    cx: 342, cy: 690,   // center of entity
  },
  {
    id: 'boss-1',
    el: document.getElementById('boss-1'),
    hintEl: document.getElementById('hint-1'),
    type: 'boss',
    bossNum: 1,
    cx: 530, cy: 440,
  },
  {
    id: 'boss-2',
    el: document.getElementById('boss-2'),
    hintEl: document.getElementById('hint-2'),
    type: 'boss',
    bossNum: 2,
    cx: 830, cy: 270,
  },
  {
    id: 'boss-3',
    el: document.getElementById('boss-3'),
    hintEl: document.getElementById('hint-3'),
    type: 'boss',
    bossNum: 3,
    cx: 890, cy: 660,
  },
];

// ── INPUT ──────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  keys[e.key] = true;

  if (e.key === 'f' || e.key === 'F') {
    if (dialogueOpen) {
      closeDialogue();
      return;
    }
    if (!inTransition) tryInteract();
  }
});
document.addEventListener('keyup', e => { keys[e.key] = false; });

dialogueClose.addEventListener('click', closeDialogue);

// ── UTILITY: distance ──────────────────────────────────────
function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

// ── PLAYER CENTER ─────────────────────────────────────────
function playerCenter() {
  return { x: player.x + 26, y: player.y + 48 };
}

// ── MOVE PLAYER ───────────────────────────────────────────
let waterSplashCooldown = 0;

function movePlayer() {
  if (dialogueOpen || inTransition) return;

  let dx = 0, dy = 0;
  if (keys['ArrowLeft']  || keys['a']) dx -= SPEED;
  if (keys['ArrowRight'] || keys['d']) dx += SPEED;
  if (keys['ArrowUp']    || keys['w']) dy -= SPEED;
  if (keys['ArrowDown']  || keys['s']) dy += SPEED;

  // Diagonal normalisation
  if (dx !== 0 && dy !== 0) {
    dx *= 0.707;
    dy *= 0.707;
  }

  if (dx === 0 && dy === 0) { waterSplashCooldown = 0; return; }

  // Centro atual do jogador
  const cx = player.x + 26;
  const cy = player.y + 48;

  // Tentar movimento completo
  const nx = Math.max(0, Math.min(WORLD_W - 52, player.x + dx));
  const ny = Math.max(0, Math.min(WORLD_H - 60, player.y + dy));
  const ncx = nx + 26, ncy = ny + 48;

  if (isWalkable(ncx, ncy)) {
    player.x = nx;
    player.y = ny;
    waterSplashCooldown = 0;
    return;
  }

  // Slide horizontal
  const nxOnly = Math.max(0, Math.min(WORLD_W - 52, player.x + dx));
  if (isWalkable(nxOnly + 26, cy)) {
    player.x = nxOnly;
    waterSplashCooldown = 0;
    return;
  }

  // Slide vertical
  const nyOnly = Math.max(0, Math.min(WORLD_H - 60, player.y + dy));
  if (isWalkable(cx, nyOnly + 48)) {
    player.y = nyOnly;
    waterSplashCooldown = 0;
    return;
  }

  // Bloqueado pela água — efeito de splash
  if (waterSplashCooldown <= 0) {
    spawnWaterSplash(ncx, ncy);
    waterSplashCooldown = 28;
  } else {
    waterSplashCooldown--;
  }
}

function spawnWaterSplash(wx, wy) {
  for (let i = 0; i < 5; i++) {
    const drop = document.createElement('div');
    drop.className = 'water-splash';
    const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
    const dist  = 10 + Math.random() * 14;
    drop.style.left = (wx + Math.cos(angle) * dist) + 'px';
    drop.style.top  = (wy + Math.sin(angle) * dist) + 'px';
    world.appendChild(drop);
    drop.addEventListener('animationend', () => drop.remove());
  }
}

// ── UPDATE CAMERA (follows player) ────────────────────────
function updateCamera() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pc = playerCenter();

  let cx = pc.x - vw / 2;
  let cy = pc.y - vh / 2;

  // Clamp camera to world
  cx = Math.max(0, Math.min(WORLD_W - vw, cx));
  cy = Math.max(0, Math.min(WORLD_H - vh, cy));

  world.style.transform = `translate(${-cx}px, ${-cy}px)`;
}

// ── DEPTH Z-INDEX ─────────────────────────────────────────
function updateDepth() {
  const pc = playerCenter();
  // Player z-index based on Y position
  playerEl.style.zIndex = Math.floor(pc.y) + 10;

  entities.forEach(ent => {
    ent.el.style.zIndex = Math.floor(ent.cy);
  });
}

// ── RENDER PLAYER POSITION ────────────────────────────────
function renderPlayer() {
  playerEl.style.left = player.x + 'px';
  playerEl.style.top  = player.y + 'px';
}

// ── INTERACTION HINTS ─────────────────────────────────────
function updateHints() {
  const pc = playerCenter();
  entities.forEach(ent => {
    const d = dist(pc.x, pc.y, ent.cx, ent.cy);
    if (d < INTERACT_DIST) {
      ent.hintEl.classList.add('visible');
    } else {
      ent.hintEl.classList.remove('visible');
    }
  });
}

// ── TRY INTERACT ──────────────────────────────────────────
function tryInteract() {
  const pc = playerCenter();
  let nearest = null;
  let nearestDist = Infinity;

  entities.forEach(ent => {
    const d = dist(pc.x, pc.y, ent.cx, ent.cy);
    if (d < INTERACT_DIST && d < nearestDist) {
      nearest = ent;
      nearestDist = d;
    }
  });

  if (!nearest) return;

  if (nearest.type === 'npc') {
    openTubaDialogue();
  } else if (nearest.type === 'boss') {
    const bossNum = nearest.bossNum;
    if (defeated[bossNum]) {
      // Already defeated — show short message
      showInfoDialogue(`Boss ${bossNum} já foi derrotado por você!`, 'Boss');
      return;
    }
    startBattleTransition(bossNum);
  }
}

// ── TUBA DIALOGUE ─────────────────────────────────────────
function openTubaDialogue() {
  const allDefeated = defeated[1] && defeated[2] && defeated[3];

  dialoguePortraitImg.src = 'assets/imgs/tuba.png';
  dialogueName.textContent = 'Tuba';

  if (allDefeated) {
    dialogueText.textContent =
      '🎉 Parabéns, herói! Você venceu todos os três desafios! ' +
      'Como prometido, aqui está o seu prêmio: 1.000.000 de dólares! 💰💰💰 ' +
      'Você é realmente incrível!';
    triggerCoinRain();
    // Ao fechar o diálogo, exibe a cutscene de vitória
    pendingCutscene = true;
  } else {
    dialogueText.textContent =
      'Olá, eu sou o Tuba! 👋 ' +
      'Se você quer ganhar muito dinheiro, terá que passar nesses três desafios. ' +
      'São adversários poderosos — boa sorte, jovem aventureiro!';
    pendingCutscene = false;
  }

  openDialogue();
}

function showInfoDialogue(text, name) {
  dialogueName.textContent = name;
  dialogueText.textContent = text;
  dialoguePortraitImg.src = 'assets/imgs/tuba.png';
  openDialogue();
}

function openDialogue() {
  dialogueOverlay.classList.remove('hidden');
  dialogueOpen = true;
}

function closeDialogue() {
  dialogueOverlay.classList.add('hidden');
  dialogueOpen = false;
  if (pendingCutscene) {
    pendingCutscene = false;
    setTimeout(playCutscene, 400);
  }
}

// ── CUTSCENE ──────────────────────────────────────────────
function playCutscene() {
  cutsceneOverlay.classList.remove('hidden');
  requestAnimationFrame(() => cutsceneOverlay.classList.add('active'));
  cutsceneVideo.currentTime = 0;
  cutsceneVideo.play().catch(() => {});

  // Fecha ao terminar o vídeo
  cutsceneVideo.addEventListener('ended', closeCutscene, { once: true });

  // Fecha ao pressionar qualquer tecla
  const skipHandler = () => { closeCutscene(); document.removeEventListener('keydown', skipHandler); };
  document.addEventListener('keydown', skipHandler);

  // Fecha ao clicar na tela
  cutsceneOverlay.addEventListener('click', function handler() {
    closeCutscene();
    cutsceneOverlay.removeEventListener('click', handler);
  });
}

function closeCutscene() {
  cutsceneVideo.pause();
  cutsceneOverlay.classList.remove('active');
  setTimeout(() => cutsceneOverlay.classList.add('hidden'), 500);
}

// ── BATTLE TRANSITION ─────────────────────────────────────
function startBattleTransition(bossNum) {
  inTransition = true;
  transitionEl.classList.remove('hidden');
  transitionText.textContent = `⚔️  Entrando na batalha contra o Boss ${bossNum}...`;
  // Fade in
  requestAnimationFrame(() => {
    transitionEl.classList.add('active');
  });

  setTimeout(() => {
    window.location.href = `boss${bossNum}.html`;
  }, 1400);
}

// ── COIN RAIN ─────────────────────────────────────────────
function triggerCoinRain() {
  coinRain.innerHTML = '';
  for (let i = 0; i < 28; i++) {
    const coin = document.createElement('div');
    coin.className = 'coin-drop';
    coin.style.left = (Math.random() * 98) + 'vw';
    const duration = (1.8 + Math.random() * 1.8).toFixed(2) + 's';
    const delay    = (Math.random() * 1.2).toFixed(2) + 's';
    coin.style.animationDuration = duration;
    coin.style.animationDelay = delay;
    coinRain.appendChild(coin);
    coin.addEventListener('animationend', () => coin.remove());
  }
}

// ── UPDATE HUD ────────────────────────────────────────────
function updateHUD() {
  function setStatus(statusEl, hudEl, done) {
    if (done) {
      statusEl.textContent = '✔ Derrotado';
      hudEl.classList.add('done');
    } else {
      statusEl.textContent = 'Vivo';
      hudEl.classList.remove('done');
    }
  }
  setStatus(hb1Status, hb1, defeated[1]);
  setStatus(hb2Status, hb2, defeated[2]);
  setStatus(hb3Status, hb3, defeated[3]);
}

// ── UPDATE BOSS VISUALS ───────────────────────────────────
function updateBossVisuals() {
  [1, 2, 3].forEach(n => {
    const bossEl = document.getElementById(`boss-${n}`);
    if (defeated[n]) {
      bossEl.classList.add('defeated');
    }
  });
}

// ── MAIN GAME LOOP ────────────────────────────────────────
function gameLoop() {
  movePlayer();
  renderPlayer();
  updateCamera();
  updateDepth();
  updateHints();
  requestAnimationFrame(gameLoop);
}

// ── INIT ──────────────────────────────────────────────────
function init() {
  updateHUD();
  updateBossVisuals();

  // If all bosses defeated and returning to map, show coin rain
  if (defeated[1] && defeated[2] && defeated[3]) {
    // Check if just returned (flag set by boss pages)
    if (sessionStorage.getItem('just_won_all')) {
      sessionStorage.removeItem('just_won_all');
      setTimeout(openTubaDialogue, 800);
    }
  }

  renderPlayer();
  gameLoop();
}

init();