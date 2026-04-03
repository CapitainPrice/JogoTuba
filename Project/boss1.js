// ════════════════════════════════════════════════════════════
//  BOSS 1 — EGGMAN  |  boss1.js
// ════════════════════════════════════════════════════════════

// ── DOM REFS ────────────────────────────────────────────────
const board          = document.getElementById('game-board');
const marioEl        = document.getElementById('mario');
const playerWrap     = document.getElementById('player-wrap');
const pipeEl         = document.getElementById('pipe');
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
  el.volume = vol;
  el.currentTime = 0;
  el.play().catch(() => {});
}
function stopSound(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.pause(); el.currentTime = 0;
}
function playBGM(id, vol = 0.5) {
  ['bgm-fight','bgm-result-win','bgm-result-lose'].forEach(stopSound);
  const el = document.getElementById(id);
  if (!el) return;
  el.volume = vol;
  el.play().catch(() => {});
}

// ── CONSTANTS ────────────────────────────────────────────────
const FLOOR_H    = 60;
const BOARD_W    = () => window.innerWidth;
const MARIO_W    = 72;
const GRAVITY    = 1.3;
const JUMP_FORCE = 20;
const DOUBLE_JMP = 16;

// ── GAME STATE ───────────────────────────────────────────────
let score         = 0;
let lives         = 5;
let enemiesKilled = 0;
let damageTaken   = 0;
let specialCharges = 0;         // 0–3
let specialFillPct = 0;         // 0–100 (current bar filling)
const SP_FILL_RATE = 100 / 15;  // fills one bar in 15 s
let isGameOver    = false;
let isBossPhase   = false;
let bossHP        = 100;
let bossPhase     = 'A';
let isInvincible  = false;
let canTakeDmg    = true;
let isCrouching   = false;
let shieldKills   = 0;
let startTime     = Date.now();

// Physics
let marioY    = 0;
let vSpeed    = 0;
let jumpCount = 0;

// Boss movement
let bossY  = 0;
let bossVY = 2.5;
const BOSS_MIN_Y = 10;
const BOSS_MAX_Y = 260;

// Intervals
let spawnInterval, bossBulletInterval, bossSpecialInterval;
let shieldTimerCD, emberInterval, specialFillInterval;

// ── HUD — HEARTS ─────────────────────────────────────────────
function renderHearts() {
  for (let i = 1; i <= 5; i++) {
    const h = document.getElementById('heart-' + i);
    if (!h) continue;
    if (i <= lives) {
      h.classList.remove('lost');
    } else {
      if (!h.classList.contains('lost')) {
        h.classList.add('lost');
        h.classList.add('pulse');
        setTimeout(() => h.classList.remove('pulse'), 400);
      }
    }
  }
}

// ── HUD — SPECIAL BARS ───────────────────────────────────────
function renderSpecialBars() {
  for (let i = 1; i <= 3; i++) {
    const bar  = document.getElementById('sp-' + i);
    const fill = document.getElementById('spf-' + i);
    if (!bar || !fill) continue;

    if (i < specialCharges + 1) {
      // fully charged bars
      fill.style.width = '100%';
      bar.classList.add('full');
    } else if (i === specialCharges + 1) {
      // currently filling bar
      fill.style.width = specialFillPct + '%';
      bar.classList.remove('full');
    } else {
      // empty bars
      fill.style.width = '0%';
      bar.classList.remove('full');
    }
  }
}

// Special charge ticker (runs every 200ms for smooth animation)
specialFillInterval = setInterval(() => {
  if (isGameOver || specialCharges >= 3) return;
  specialFillPct += SP_FILL_RATE * 0.2; // 200ms tick
  if (specialFillPct >= 100) {
    specialFillPct = 0;
    specialCharges = Math.min(3, specialCharges + 1);
  }
  renderSpecialBars();
}, 200);

// ── HUD UPDATE ───────────────────────────────────────────────
function updateHUD() {
  scoreVal.textContent = score;
  renderHearts();
  renderSpecialBars();
  updateAtmosphere();
}

// ── ATMOSPHERE ───────────────────────────────────────────────
function updateAtmosphere() {
  board.className = board.className.replace(/atmo-\d/g, '').trim();
  if      (score >= 1000) { board.classList.add('atmo-4'); fireOverlay.classList.add('active'); startEmbers(); }
  else if (score >= 750)  { board.classList.add('atmo-3'); }
  else if (score >= 500)  { board.classList.add('atmo-2'); }
  else if (score >= 250)  { board.classList.add('atmo-1'); }
  if (score < 1000) { fireOverlay.classList.remove('active'); stopEmbers(); }
}

let embersRunning = false;
function startEmbers() {
  if (embersRunning) return;
  embersRunning = true;
  emberInterval = setInterval(() => { for (let i=0;i<3;i++) spawnEmber(); }, 120);
}
function stopEmbers() {
  embersRunning = false;
  clearInterval(emberInterval);
}
function spawnEmber() {
  const e = document.createElement('div');
  e.className = 'ember';
  const size = 4 + Math.random() * 8;
  e.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;bottom:${Math.random()*30}%;--ex:${(Math.random()-.5)*80}px;animation-duration:${1.8+Math.random()*1.5}s;`;
  emberCon.appendChild(e);
  e.addEventListener('animationend', () => e.remove());
}

// ── PHYSICS LOOP ─────────────────────────────────────────────
function physicsLoop() {
  if (isGameOver) return;

  vSpeed -= GRAVITY;
  marioY += vSpeed;

  if (marioY <= 0) {
    marioY = 0; vSpeed = 0; jumpCount = 0;
  }
  playerWrap.style.bottom = (FLOOR_H + marioY) + 'px';

  // Boss float
  if (isBossPhase) {
    bossY += bossVY;
    if (bossY >= BOSS_MAX_Y) bossVY = -Math.abs(bossVY);
    if (bossY <= BOSS_MIN_Y) bossVY =  Math.abs(bossVY);
    bossWrap.style.bottom = (FLOOR_H + bossY) + 'px';
  }

  // Pipe collision
  if (!isBossPhase && pipeEl && !pipeEl.classList.contains('hidden')) {
    if (checkCollision(playerWrap, pipeEl) && marioY < 60) handleDamage(1);
  }

  checkStompEnemies();
  requestAnimationFrame(physicsLoop);
}
requestAnimationFrame(physicsLoop);

// ── JUMP ─────────────────────────────────────────────────────
function jump() {
  if (isGameOver) return;
  if (jumpCount === 0) {
    vSpeed = JUMP_FORCE; jumpCount = 1;
    playSound('snd-jump', 0.7);
  } else if (jumpCount === 1) {
    vSpeed = DOUBLE_JMP; jumpCount = 2;
    playSound('snd-jump', 0.5);
  }
}

// ── CROUCH ───────────────────────────────────────────────────
function crouch(on) {
  isCrouching = on;
  marioEl.classList.toggle('crouching', on);
}

// ── STOMP ENEMIES ────────────────────────────────────────────
function checkStompEnemies() {
  if (vSpeed >= 0) return;
  const enemies = enemyCon.querySelectorAll('.enemy');
  enemies.forEach(eEl => {
    const mRect = playerWrap.getBoundingClientRect();
    const eRect = eEl.getBoundingClientRect();
    const overlapX = !(mRect.right < eRect.left || mRect.left > eRect.right);
    const overlapY = mRect.bottom >= eRect.top && mRect.bottom <= eRect.top + 24;
    if (overlapX && overlapY) {
      // Tucanos precisam de 3 hits — stomp tira 1 HP
      if (eEl.dataset.type === 'toucan') {
        damageToucan(eEl, 1);
      } else {
        killEnemy(eEl, true);
      }
      vSpeed = JUMP_FORCE * 0.6;
    }
  });
}

// ── SHOOT ────────────────────────────────────────────────────
function shoot(special = false) {
  if (isGameOver) return;
  if (special) {
    if (specialCharges <= 0) return;
    specialCharges--;
    specialFillPct = 0;
    renderSpecialBars();
    playSound('snd-shoot-special', 0.8);
  } else {
    playSound('snd-shoot', 0.5);
  }

  const b = document.createElement('div');
  b.className = special ? 'bullet special-bullet' : 'bullet';
  const startX = 80 + MARIO_W;
  const startY = FLOOR_H + marioY + (isCrouching ? 18 : 38);
  b.style.left   = startX + 'px';
  b.style.bottom = startY + 'px';
  bulletCon.appendChild(b);

  let bx = startX;
  const spd = special ? 22 : 15;
  const dmg = special ? 10 : 2;

  const mv = setInterval(() => {
    if (isGameOver || !b.parentElement) { clearInterval(mv); return; }
    bx += spd;
    b.style.left = bx + 'px';

    // Hit boss
    if (isBossPhase && checkCollision(b, bossWrap)) {
      clearInterval(mv); b.remove(); hitBoss(dmg, special); return;
    }

    // Bullet vs boss bullets
    board.querySelectorAll('.boss-bullet,.boss-bullet-special').forEach(bb => {
      if (checkCollision(b, bb)) {
        bb.remove();
        if (!special) { b.remove(); clearInterval(mv); }
      }
    });
    if (!b.parentElement) return;

    // Hit enemy
    const enemies = enemyCon.querySelectorAll('.enemy');
    for (const e of enemies) {
      if (checkCollision(b, e)) {
        if (e.dataset.type === 'toucan') {
          const killed = damageToucan(e, special ? 3 : 1);
          if (!special) { b.remove(); clearInterval(mv); return; }
          if (killed)   { if (!special) { b.remove(); clearInterval(mv); return; } }
        } else {
          killEnemy(e, false);
          if (!special) { b.remove(); clearInterval(mv); return; }
        }
      }
    }

    if (bx > BOARD_W() + 60) { b.remove(); clearInterval(mv); }
  }, 16);
}

// ── KILL ENEMY (inimigo normal — 1 hit) ─────────────────────
function killEnemy(eEl, stomp = false) {
  if (!eEl || !eEl.parentElement) return;
  addScore(25, eEl);
  enemiesKilled++;
  shieldKills++;
  spawnParticles(eEl, '#ff8800', 8);
  spawnDmgNumber(eEl, '+25');
  playSound('snd-enemy-die', 0.7);
  eEl.remove();
  updateHUD();

  if (shieldKills >= 12) { shieldKills = 0; dropShield(eEl); }
  if (!isBossPhase && score >= 1000) triggerBossArena();
}

// ── TOUCAN (inimigo3 — 3 hits, +50 pts) ─────────────────────
function damageToucan(eEl, dmg) {
  if (!eEl || !eEl.parentElement) return false;
  let hp = parseInt(eEl.dataset.hp || 3);
  hp -= dmg;
  eEl.dataset.hp = hp;

  // Flash
  const img = eEl.querySelector('img');
  if (img) { img.style.filter = 'brightness(3)'; setTimeout(() => { if(img) img.style.filter=''; }, 120); }

  // Update mini HP bar
  const fill = eEl.querySelector('.toucan-hp-fill');
  if (fill) fill.style.width = Math.max(0, (hp / 3) * 100) + '%';

  spawnDmgNumber(eEl, '-' + dmg, 'dmg-boss');

  if (hp <= 0) {
    addScore(50, eEl);
    enemiesKilled++;
    shieldKills++;
    spawnParticles(eEl, '#44ff44', 10);
    spawnDmgNumber(eEl, '+50');
    playSound('snd-enemy-die', 0.7);
    eEl.remove();
    updateHUD();
    if (shieldKills >= 12) { shieldKills = 0; dropShield(eEl); }
    if (!isBossPhase && score >= 1000) triggerBossArena();
    return true;
  }
  return false;
}

function addScore(pts, refEl) {
  score += pts;
}

// ── DROP SHIELD ──────────────────────────────────────────────
function dropShield(refEl) {
  const item = document.createElement('div');
  item.className = 'shield-item';
  item.textContent = '🛡️';
  const rect = refEl ? refEl.getBoundingClientRect() : { left: 400 };
  const bRect = board.getBoundingClientRect();
  item.style.left   = (rect.left - bRect.left + 10) + 'px';
  item.style.bottom = (FLOOR_H + 10) + 'px';
  itemCon.appendChild(item);

  const col = setInterval(() => {
    if (!item.parentElement) { clearInterval(col); return; }
    if (checkCollision(item, playerWrap)) { clearInterval(col); item.remove(); activateShield(); }
  }, 100);
  setTimeout(() => { if(item.parentElement) item.remove(); clearInterval(col); }, 8000);
}

// ── SHIELD ───────────────────────────────────────────────────
function activateShield() {
  if (isInvincible) return;
  isInvincible = true; canTakeDmg = false;
  playSound('snd-shield', 0.8);
  marioEl.classList.add('invincible-effect');
  hudShieldBlock.classList.remove('hidden');
  hudInvBlock.classList.remove('hidden');

  let sec = 7;
  shieldVal.textContent = sec + 's';
  shieldTimerCD = setInterval(() => {
    sec--;
    shieldVal.textContent = sec + 's';
    if (sec <= 0) {
      clearInterval(shieldTimerCD);
      isInvincible = false; canTakeDmg = true;
      marioEl.classList.remove('invincible-effect');
      hudShieldBlock.classList.add('hidden');
      hudInvBlock.classList.add('hidden');
    }
  }, 1000);
}

// ── DAMAGE ───────────────────────────────────────────────────
function handleDamage(amount = 1) {
  if (isInvincible || !canTakeDmg) return;
  lives = Math.max(0, lives - amount);
  damageTaken += amount;
  canTakeDmg = false;
  marioEl.classList.add('damage-effect');
  renderHearts();
  playSound(lives <= 0 ? 'snd-mario-die' : 'snd-mario-hurt', 0.8);

  if (lives <= 0) {
    marioEl.classList.remove('damage-effect');
    endGame(false);
  } else {
    setTimeout(() => {
      marioEl.classList.remove('damage-effect');
      canTakeDmg = true;
    }, 1200);
  }
}

// ── BOSS ─────────────────────────────────────────────────────
function triggerBossArena() {
  if (isBossPhase) return;
  isBossPhase = true;
  pipeEl.classList.add('hidden');
  clearInterval(spawnInterval);
  enemyCon.innerHTML = '';
  bossAlertEl.classList.remove('hidden');
  playSound('snd-boss-arrive', 0.9);

  setTimeout(() => {
    bossAlertEl.classList.add('hidden');
    bossWrap.classList.remove('hidden');
    bossHpWrap.classList.remove('hidden');
    bossWrap.style.bottom = (FLOOR_H + bossY) + 'px';
    bossBulletInterval = setInterval(bossShoot, 450);
    spawnInterval = setInterval(() => {
      if (!isBossPhase || isGameOver) return;
      spawnEnemy();
    }, 3000);
  }, 1800);
}

function hitBoss(dmg, special = false) {
  if (!isBossPhase || isGameOver) return;
  bossHP = Math.max(0, bossHP - dmg);
  bossImgEl.classList.add('hit-flash');
  setTimeout(() => bossImgEl.classList.remove('hit-flash'), 120);
  spawnDmgNumber(bossWrap, `-${dmg}`, special ? 'dmg-special' : 'dmg-normal');
  bossHpFill.style.width = bossHP + '%';
  bossHpPct.textContent  = bossHP + '%';

  if (bossHP <= 50 && bossPhase === 'A') {
    bossPhase = 'B';
    bossImgEl.src = 'assets/imgs/eggman2.gif';
    bossPhaseLabel.textContent = '⚙️ EGGMAN — FASE B';
    bossHpFill.classList.add('phase-b');
    bossVY = 3.5;
    clearInterval(bossBulletInterval);
    bossBulletInterval = setInterval(bossShoot, 320);
    bossSpecialInterval = setInterval(bossSpecialShoot, 6000);
    playSound('snd-phase', 0.8);
  }

  score += dmg * 10;
  updateHUD();
  if (bossHP <= 0) endGame(true);
}

function bossShoot() {
  if (!isBossPhase || isGameOver) return;
  const b = document.createElement('div');
  b.className = 'boss-bullet';
  const bRect = bossWrap.getBoundingClientRect();
  const gRect = board.getBoundingClientRect();
  let cx = bRect.left - gRect.left;
  let cy = bossY + 60;
  b.style.left   = cx + 'px';
  b.style.bottom = cy + 'px';
  board.appendChild(b);

  const angle = 180 + (Math.random() * 50 - 25);
  const rad = angle * Math.PI / 180;
  const vx = Math.cos(rad) * 10, vy = Math.sin(rad) * 10;

  const mv = setInterval(() => {
    if (isGameOver || !b.parentElement) { clearInterval(mv); b.remove(); return; }
    cx += vx; cy += vy;
    b.style.left   = cx + 'px';
    b.style.bottom = cy + 'px';

    if (checkCollision(b, playerWrap)) { handleDamage(1); b.remove(); clearInterval(mv); return; }

    board.querySelectorAll('.bullet:not(.boss-bullet):not(.boss-bullet-special)').forEach(pb => {
      if (checkCollision(b, pb)) {
        if (!pb.classList.contains('special-bullet')) pb.remove();
        b.remove(); clearInterval(mv);
      }
    });

    if (cx < -60 || cy < -60 || cy > window.innerHeight + 60) { b.remove(); clearInterval(mv); }
  }, 16);
}

function bossSpecialShoot() {
  if (!isBossPhase || isGameOver) return;
  playSound('snd-boss-special', 0.9);
  const b = document.createElement('div');
  b.className = 'boss-bullet boss-bullet-special';
  const bRect = bossWrap.getBoundingClientRect();
  const gRect = board.getBoundingClientRect();
  let cx = bRect.left - gRect.left - 20;
  let cy = bossY + 80;
  b.style.left   = cx + 'px';
  b.style.bottom = cy + 'px';
  board.appendChild(b);

  const mv = setInterval(() => {
    if (isGameOver || !b.parentElement) { clearInterval(mv); b.remove(); return; }
    cx -= 8;
    b.style.left = cx + 'px';
    if (checkCollision(b, playerWrap)) { handleDamage(2); b.remove(); clearInterval(mv); return; }
    board.querySelectorAll('.special-bullet').forEach(s => {
      if (checkCollision(b, s)) { b.remove(); s.remove(); clearInterval(mv); }
    });
    if (cx < -60) { b.remove(); clearInterval(mv); }
  }, 16);
}

// ── ENEMY SPAWN ──────────────────────────────────────────────
function spawnEnemy() {
  if (isGameOver) return;
  // 40% chance of spawning a toucan
  if (Math.random() < 0.4) {
    spawnToucan();
  } else {
    spawnNormalEnemy();
  }
}

function spawnNormalEnemy() {
  const eWrap = document.createElement('div');
  eWrap.className = 'enemy';
  eWrap.dataset.type = 'normal';
  const img = document.createElement('img');
  img.src = 'assets/imgs/inimigo.gif'; img.alt = 'inimigo';
  eWrap.appendChild(img);
  eWrap.style.right  = '-60px';
  eWrap.style.bottom = FLOOR_H + 'px';
  enemyCon.appendChild(eWrap);

  let pos = -60;
  let eyTimer = null;
  if (isBossPhase) {
    eyTimer = setInterval(() => {
      if (!eWrap.parentElement) { clearInterval(eyTimer); return; }
      enemyShoot(eWrap, FLOOR_H + 20);
    }, 2200 + Math.random() * 1000);
  }

  const mv = setInterval(() => {
    if (isGameOver || !eWrap.parentElement) { clearInterval(mv); clearInterval(eyTimer); return; }
    pos += (isBossPhase ? 4.5 : 5.5);
    eWrap.style.right = pos + 'px';
    if (checkCollision(playerWrap, eWrap) && canTakeDmg && marioY < 30) {
      handleDamage(1); clearInterval(eyTimer); eWrap.remove(); clearInterval(mv); return;
    }
    if (pos > BOARD_W() + 100) { clearInterval(mv); clearInterval(eyTimer); eWrap.remove(); }
  }, 16);
}

// ── TOUCAN (inimigo3) ────────────────────────────────────────
function spawnToucan() {
  const eWrap = document.createElement('div');
  eWrap.className = 'enemy enemy-toucan';
  eWrap.dataset.type = 'toucan';
  eWrap.dataset.hp   = '3';

  const img = document.createElement('img');
  img.src = 'assets/imgs/inimigo3.gif'; img.alt = 'tucano';
  eWrap.appendChild(img);

  // Mini HP bar
  const hpBar  = document.createElement('div'); hpBar.className = 'toucan-hp-bar';
  const hpFill = document.createElement('div'); hpFill.className = 'toucan-hp-fill';
  hpFill.style.width = '100%';
  hpBar.appendChild(hpFill); eWrap.appendChild(hpBar);

  // Start position: right side, random height (flying)
  const startY = 80 + Math.random() * 200;
  eWrap.style.right  = '-70px';
  eWrap.style.bottom = (FLOOR_H + startY) + 'px';
  enemyCon.appendChild(eWrap);

  let pos   = -70;
  let vertY = startY;
  let vertV = (Math.random() < 0.5 ? 1 : -1) * (1.5 + Math.random());

  // Shoots every 1.8s
  const shootTimer = setInterval(() => {
    if (!eWrap.parentElement) { clearInterval(shootTimer); return; }
    toucanShoot(eWrap, vertY);
  }, 1800);

  const mv = setInterval(() => {
    if (isGameOver || !eWrap.parentElement) { clearInterval(mv); clearInterval(shootTimer); return; }

    // Horizontal movement
    pos += 3.5;
    eWrap.style.right = pos + 'px';

    // Vertical sine-wave movement
    vertY += vertV;
    if (vertY > 280 || vertY < 40) vertV *= -1;
    eWrap.style.bottom = (FLOOR_H + vertY) + 'px';

    if (checkCollision(playerWrap, eWrap) && canTakeDmg) {
      handleDamage(1); clearInterval(shootTimer); eWrap.remove(); clearInterval(mv); return;
    }
    if (pos > BOARD_W() + 120) { clearInterval(mv); clearInterval(shootTimer); eWrap.remove(); }
  }, 16);
}

function toucanShoot(eWrap, vertY) {
  if (!eWrap.parentElement || isGameOver) return;
  const b = document.createElement('div');
  b.className = 'toucan-bullet';
  const eRect = eWrap.getBoundingClientRect();
  const gRect = board.getBoundingClientRect();
  let bx = eRect.left - gRect.left - 14;
  let by = FLOOR_H + vertY;
  b.style.left   = bx + 'px';
  b.style.bottom = by + 'px';
  board.appendChild(b);

  // Aim toward player
  const pRect = playerWrap.getBoundingClientRect();
  const dx = (pRect.left + pRect.width/2) - (eRect.left + eRect.width/2);
  const dy = (pRect.top  + pRect.height/2) - (eRect.top  + eRect.height/2);
  const len = Math.hypot(dx, dy) || 1;
  const spd = 7;
  const vx = (dx / len) * spd;
  const vy = -(dy / len) * spd; // invert Y (bottom-based)

  const mv = setInterval(() => {
    if (isGameOver || !b.parentElement) { clearInterval(mv); return; }
    bx += vx; by += vy;
    b.style.left   = bx + 'px';
    b.style.bottom = by + 'px';
    if (checkCollision(b, playerWrap)) {
      handleDamage(1); b.remove(); clearInterval(mv); return;
    }
    if (bx < -30 || bx > BOARD_W()+30 || by < -30 || by > window.innerHeight+30) {
      b.remove(); clearInterval(mv);
    }
  }, 16);
}

function enemyShoot(eWrap, by) {
  if (!eWrap.parentElement || isGameOver) return;
  const b = document.createElement('div');
  b.className = 'enemy-bullet';
  const eRect = eWrap.getBoundingClientRect();
  const gRect = board.getBoundingClientRect();
  let bx = eRect.left - gRect.left - 14;
  b.style.left   = bx + 'px';
  b.style.bottom = by + 'px';
  board.appendChild(b);
  const mv = setInterval(() => {
    if (isGameOver || !b.parentElement) { clearInterval(mv); return; }
    bx -= 9; b.style.left = bx + 'px';
    if (checkCollision(b, playerWrap)) { handleDamage(1); b.remove(); clearInterval(mv); return; }
    if (bx < -30) { b.remove(); clearInterval(mv); }
  }, 16);
}

// ── SPAWN LOOP ────────────────────────────────────────────────
spawnInterval = setInterval(() => {
  if (isGameOver || isBossPhase) return;
  spawnEnemy();
}, 2500);

// ── PARTICLES & FX ───────────────────────────────────────────
function spawnParticles(refEl, color, count) {
  if (!refEl) return;
  const rect  = refEl.getBoundingClientRect();
  const bRect = board.getBoundingClientRect();
  const cx = rect.left - bRect.left + rect.width / 2;
  const cy = rect.top  - bRect.top  + rect.height / 2;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size  = 4 + Math.random() * 8;
    const angle = (Math.PI * 2 / count) * i;
    const dist  = 30 + Math.random() * 40;
    p.style.cssText = `width:${size}px;height:${size}px;background:${color};left:${cx}px;top:${cy}px;--px:${Math.cos(angle)*dist}px;--py:${Math.sin(angle)*dist}px;`;
    particleCon.appendChild(p);
    p.addEventListener('animationend', () => p.remove());
  }
}

function spawnDmgNumber(refEl, text, cls = 'dmg-normal') {
  if (!refEl) return;
  const rect  = refEl.getBoundingClientRect();
  const bRect = board.getBoundingClientRect();
  const n = document.createElement('div');
  n.className = 'dmg-number ' + cls;
  n.textContent = text;
  n.style.left = (rect.left - bRect.left + rect.width/2 - 20) + 'px';
  n.style.top  = (rect.top  - bRect.top  - 10) + 'px';
  dmgNumCon.appendChild(n);
  n.addEventListener('animationend', () => n.remove());
}

// ── COLLISION ────────────────────────────────────────────────
function checkCollision(a, b) {
  if (!a || !b) return false;
  const r1 = a.getBoundingClientRect();
  const r2 = b.getBoundingClientRect();
  return !(r1.right < r2.left || r1.left > r2.right || r1.bottom < r2.top || r1.top > r2.bottom);
}

// ── END GAME ─────────────────────────────────────────────────
function endGame(victory) {
  isGameOver = true;
  clearInterval(spawnInterval);
  clearInterval(bossBulletInterval);
  clearInterval(bossSpecialInterval);
  clearInterval(shieldTimerCD);
  clearInterval(specialFillInterval);
  stopSound('bgm-fight');

  const elapsed = Math.floor((Date.now() - startTime) / 1000);

  if (victory) {
    bossImgEl.src = 'assets/imgs/eggmanderrota.gif';
    bossHpFill.style.width = '0%';
    playSound('snd-victory', 0.9);
    setTimeout(() => { showResultScreen(true, elapsed); playBGM('bgm-result-win', 0.5); }, 1800);
  } else {
    playSound('snd-defeat', 0.9);
    setTimeout(() => { showResultScreen(false, elapsed); playBGM('bgm-result-lose', 0.5); }, 1200);
  }
}

function showResultScreen(victory, elapsed) {
  resultTitle.textContent = victory ? '🏆 VITÓRIA!' : '💀 DERROTA!';
  resultTitle.className   = victory ? 'victory' : 'defeat';
  resultEggImg.src        = victory ? 'assets/imgs/eggmanderrota.gif' : 'assets/imgs/eggmanvitoria.gif';
  rsScore.textContent = score;
  rsKills.textContent = enemiesKilled;
  rsTime.textContent  = elapsed + 's';
  rsDmg.textContent   = damageTaken;
  const rank = calcRank(victory, elapsed, damageTaken);
  rankLetter.textContent = rank;
  rankLetter.className   = 'rank-' + rank;
  resultScreen.classList.remove('hidden');
}

function calcRank(victory, time, dmg) {
  if (!victory)            return 'P';
  if (dmg === 0 && time <= 90)  return 'S';
  if (dmg <= 1 && time <= 120)  return 'A';
  if (dmg <= 3 && time <= 180)  return 'B';
  if (dmg <= 5)                  return 'C';
  return 'D';
}

// ── BUTTONS ──────────────────────────────────────────────────
btnRestart.addEventListener('click', () => location.reload());
btnAdvance.addEventListener('click', () => {
  localStorage.setItem('boss1_defeated', 'true');
  window.location.href = 'index.html';
});

// ── INPUT ────────────────────────────────────────────────────
const keysDown = {};

document.addEventListener('keydown', e => {
  if (isGameOver) return;

  if (e.code === 'ArrowUp' || e.code === 'Space') {
    e.preventDefault();
    if (!e.repeat) jump();
    return;
  }

  if (keysDown[e.code]) return;
  keysDown[e.code] = true;

  switch (e.code) {
    case 'ArrowDown': e.preventDefault(); crouch(true);    break;
    case 'KeyS':      shoot(false);                        break;
    case 'KeyD':      shoot(true);                         break;
  }
});

document.addEventListener('keyup', e => {
  keysDown[e.code] = false;
  if (e.code === 'ArrowDown') crouch(false);
});

// ── START BGM ────────────────────────────────────────────────
const startBGM = () => {
  playBGM('bgm-fight', 0.45);
  document.removeEventListener('keydown', startBGM);
  document.removeEventListener('click',   startBGM);
};
document.addEventListener('keydown', startBGM);
document.addEventListener('click',   startBGM);

// ── INIT ─────────────────────────────────────────────────────
updateHUD();