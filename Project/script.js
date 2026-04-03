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

  // Clamp to world bounds (player is ~52×60)
  player.x = Math.max(0, Math.min(WORLD_W - 52, player.x + dx));
  player.y = Math.max(0, Math.min(WORLD_H - 60, player.y + dy));
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
  } else {
    dialogueText.textContent =
      'Olá, eu sou o Tuba! 👋 ' +
      'Se você quer ganhar muito dinheiro, terá que passar nesses três desafios. ' +
      'São adversários poderosos — boa sorte, jovem aventureiro!';
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
