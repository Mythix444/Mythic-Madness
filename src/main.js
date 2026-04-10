const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const healthEl = document.getElementById("health");
const waveEl = document.getElementById("wave");
const overlayEl = document.getElementById("overlay");
const overlayTitleEl = document.getElementById("overlay-title");
const overlayTextEl = document.getElementById("overlay-text");

const keys = new Set();

const state = {
  running: false,
  score: 0,
  wave: 1,
  waveTimer: 0,
  beamSpawnCooldown: 2,
  enemySpawnCooldown: 0,
  runeSpawnCooldown: 1.5,
  flash: 0,
  player: {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 15,
    speed: 250,
    health: 100,
    facing: 0,
    dashCooldown: 0,
    blastCooldown: 0,
    dashTimer: 0,
    dashDirX: 0,
    dashDirY: 0,
    invulnTimer: 0
  },
  enemies: [],
  runes: [],
  blasts: [],
  beams: [],
  particles: []
};

function resetGame() {
  state.running = true;
  state.score = 0;
  state.wave = 1;
  state.waveTimer = 0;
  state.beamSpawnCooldown = 2;
  state.enemySpawnCooldown = 0;
  state.runeSpawnCooldown = 1.3;
  state.flash = 0;

  state.player.x = canvas.width / 2;
  state.player.y = canvas.height / 2;
  state.player.health = 100;
  state.player.dashCooldown = 0;
  state.player.blastCooldown = 0;
  state.player.dashTimer = 0;
  state.player.dashDirX = 0;
  state.player.dashDirY = 0;
  state.player.invulnTimer = 0;

  state.enemies.length = 0;
  state.runes.length = 0;
  state.blasts.length = 0;
  state.beams.length = 0;
  state.particles.length = 0;

  overlayEl.classList.add("hidden");
  updateHud();
}

function updateHud() {
  scoreEl.textContent = String(Math.floor(state.score));
  healthEl.textContent = String(Math.max(0, Math.round(state.player.health)));
  waveEl.textContent = String(state.wave);
}

function randomEdgeSpawn() {
  const edge = Math.floor(Math.random() * 4);
  if (edge === 0) return { x: Math.random() * canvas.width, y: -20 };
  if (edge === 1) return { x: canvas.width + 20, y: Math.random() * canvas.height };
  if (edge === 2) return { x: Math.random() * canvas.width, y: canvas.height + 20 };
  return { x: -20, y: Math.random() * canvas.height };
}

function spawnEnemy() {
  const pos = randomEdgeSpawn();
  const size = 9 + Math.random() * 10;
  const speed = 75 + Math.random() * 55 + (state.wave - 1) * 0.8;

  state.enemies.push({
    x: pos.x,
    y: pos.y,
    r: size,
    speed,
    hp: 1 + Math.floor(state.wave / 3),
    wobble: Math.random() * Math.PI * 2
  });
}

function spawnRune() {
  state.runes.push({
    x: 20 + Math.random() * (canvas.width - 40),
    y: 20 + Math.random() * (canvas.height - 40),
    r: 8,
    t: 0,
    vx: 0,
    vy: 0,
    value: 18 + Math.floor(Math.random() * 8)
  });
}

function spawnBeamWarning() {
  const angle = Math.random() * Math.PI * 2;
  state.beams.push({
    angle,
    cx: Math.random() * canvas.width,
    cy: Math.random() * canvas.height,
    phase: "warning",
    timer: 1,
    activeDuration: 4,
    width: 68
  });
}

function emitExplosion(x, y, color, count = 10) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const v = 35 + Math.random() * 120;
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: 0.5 + Math.random() * 0.6,
      color
    });
  }
}

function length2d(x, y) {
  return Math.hypot(x, y);
}

function updatePlayer(dt) {
  const p = state.player;
  let dx = 0;
  let dy = 0;

  if (keys.has("w") || keys.has("arrowup")) dy -= 1;
  if (keys.has("s") || keys.has("arrowdown")) dy += 1;
  if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
  if (keys.has("d") || keys.has("arrowright")) dx += 1;

  const len = length2d(dx, dy);
  if (len > 0) {
    dx /= len;
    dy /= len;
    p.facing = Math.atan2(dy, dx);
  }

  if ((keys.has("shift") || keys.has("shiftleft") || keys.has("shiftright")) && p.dashCooldown <= 0) {
    const dashDx = len > 0 ? dx : Math.cos(p.facing);
    const dashDy = len > 0 ? dy : Math.sin(p.facing);

    p.dashTimer = 0.18;
    p.dashDirX = dashDx;
    p.dashDirY = dashDy;
    p.dashCooldown = 1.8;
    p.invulnTimer = 0.22;
    state.flash = 0.28;
  }

  if (p.dashTimer > 0) {
    if (len > 0) {
      p.dashDirX = dx;
      p.dashDirY = dy;
      p.facing = Math.atan2(dy, dx);
    }

    const dashSpeed = 1100;
    p.x += p.dashDirX * dashSpeed * dt;
    p.y += p.dashDirY * dashSpeed * dt;
  } else {
    p.x += dx * p.speed * dt;
    p.y += dy * p.speed * dt;
  }

  p.x = Math.max(p.radius, Math.min(canvas.width - p.radius, p.x));
  p.y = Math.max(p.radius, Math.min(canvas.height - p.radius, p.y));

  p.dashCooldown -= dt;
  p.blastCooldown -= dt;
  p.dashTimer -= dt;
  p.invulnTimer -= dt;

  if (keys.has(" ") && p.blastCooldown <= 0) {
    p.blastCooldown = 0.28;
    state.blasts.push({
      x: p.x,
      y: p.y,
      r: 8,
      life: 0.45,
      maxLife: 0.45
    });

    for (const rune of state.runes) {
      const rx = rune.x - p.x;
      const ry = rune.y - p.y;
      const dist = Math.max(1, length2d(rx, ry));
      const pushRadius = 280;
      if (dist < pushRadius) {
        const force = (1 - dist / pushRadius) * 900;
        rune.vx += (rx / dist) * force;
        rune.vy += (ry / dist) * force;
      }
    }
  }
}

function updateRunes(dt) {
  for (const rune of state.runes) {
    rune.t += dt;
    rune.x += rune.vx * dt;
    rune.y += rune.vy * dt;
    rune.vx *= 0.9;
    rune.vy *= 0.9;

    if (rune.x < rune.r) {
      rune.x = rune.r;
      rune.vx *= -0.35;
    } else if (rune.x > canvas.width - rune.r) {
      rune.x = canvas.width - rune.r;
      rune.vx *= -0.35;
    }

    if (rune.y < rune.r) {
      rune.y = rune.r;
      rune.vy *= -0.35;
    } else if (rune.y > canvas.height - rune.r) {
      rune.y = canvas.height - rune.r;
      rune.vy *= -0.35;
    }
  }

  for (let i = state.runes.length - 1; i >= 0; i -= 1) {
    const rune = state.runes[i];
    const d = length2d(rune.x - state.player.x, rune.y - state.player.y);
    if (d < rune.r + state.player.radius) {
      state.score += rune.value;
      state.player.health = Math.min(100, state.player.health + 10);
      state.runes.splice(i, 1);
      emitExplosion(rune.x, rune.y, "#ffd166", 14);
    }
  }

  state.runeSpawnCooldown -= dt;
  if (state.runeSpawnCooldown <= 0 && state.runes.length < 5) {
    spawnRune();
    state.runeSpawnCooldown = 2.3 + Math.random() * 2.2;
  }
}

function updateBlasts(dt) {
  for (let i = state.blasts.length - 1; i >= 0; i -= 1) {
    const b = state.blasts[i];
    b.life -= dt;
    b.r += dt * 360;

    if (b.life <= 0) {
      state.blasts.splice(i, 1);
      continue;
    }

    for (let j = state.enemies.length - 1; j >= 0; j -= 1) {
      const e = state.enemies[j];
      const d = length2d(e.x - b.x, e.y - b.y);
      if (d < b.r + e.r) {
        e.hp -= 1;
        e.speed *= 0.9;
        if (e.hp <= 0) {
          state.score += 14;
          emitExplosion(e.x, e.y, "#8bd3ff", 10);
          state.enemies.splice(j, 1);
        }
      }
    }
  }
}

function updateEnemies(dt) {
  const p = state.player;

  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const e = state.enemies[i];
    const vx = p.x - e.x;
    const vy = p.y - e.y;
    const d = Math.max(1, length2d(vx, vy));
    const nx = vx / d;
    const ny = vy / d;
    e.wobble += dt * 6;

    e.x += (nx + Math.cos(e.wobble) * 0.1) * e.speed * dt;
    e.y += (ny + Math.sin(e.wobble) * 0.1) * e.speed * dt;

    if (d < e.r + p.radius) {
      if (p.invulnTimer <= 0) {
        p.health = 0;
      }
      state.flash = Math.min(0.4, state.flash + dt * 3);
    }
  }

  state.enemySpawnCooldown -= dt;
  if (state.enemySpawnCooldown <= 0) {
    spawnEnemy();
    const intensity = Math.max(0.26, 0.95 - state.wave * 0.06);
    state.enemySpawnCooldown = intensity + Math.random() * 0.38;
  }
}

function updateBeams(dt) {
  state.beamSpawnCooldown -= dt;
  if (state.beamSpawnCooldown <= 0) {
    spawnBeamWarning();
    state.beamSpawnCooldown += 2;
  }

  for (let i = state.beams.length - 1; i >= 0; i -= 1) {
    const beam = state.beams[i];
    beam.timer -= dt;

    if (beam.phase === "warning" && beam.timer <= 0) {
      beam.phase = "active";
      beam.timer = beam.activeDuration;
      state.flash = Math.max(state.flash, 0.15);
    }

    if (beam.phase === "active") {
      const nx = -Math.sin(beam.angle);
      const ny = Math.cos(beam.angle);
      const dx = state.player.x - beam.cx;
      const dy = state.player.y - beam.cy;
      const distance = Math.abs(dx * nx + dy * ny);

      if (distance < beam.width * 0.5 + state.player.radius && state.player.invulnTimer <= 0) {
        state.player.health = 0;
      }

      if (beam.timer <= 0) {
        state.beams.splice(i, 1);
      }
    }
  }
}

function updateWave(dt) {
  state.waveTimer += dt;
  if (state.waveTimer >= 16) {
    state.wave += 1;
    state.waveTimer = 0;
    state.score += 20;
    emitExplosion(state.player.x, state.player.y, "#61d095", 20);
  }
}

function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

function drawBackground(t) {
  ctx.fillStyle = "#0c1d34";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 20; i += 1) {
    const x = ((i * 87 + t * 18) % (canvas.width + 80)) - 40;
    const y = ((i * 59 + t * 10) % (canvas.height + 80)) - 40;
    ctx.strokeStyle = i % 2 ? "#2c5f83" : "#355f4a";
    ctx.beginPath();
    ctx.arc(x, y, 20 + (i % 4) * 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer() {
  const p = state.player;

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.facing);

  ctx.fillStyle = "#f7efe1";
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-10, -11);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-10, 11);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#d9a441";
  ctx.beginPath();
  ctx.arc(-2, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawRunes() {
  for (const rune of state.runes) {
    const pulse = 1 + Math.sin(rune.t * 5) * 0.2;
    ctx.save();
    ctx.translate(rune.x, rune.y);
    ctx.rotate(rune.t * 1.5);
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-rune.r * pulse, -rune.r * pulse, rune.r * 2 * pulse, rune.r * 2 * pulse);
    ctx.stroke();
    ctx.restore();
  }
}

function drawEnemies() {
  for (const e of state.enemies) {
    ctx.fillStyle = e.hp > 1 ? "#ff7a8a" : "#f2646a";
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#25040e";
    ctx.beginPath();
    ctx.arc(e.x - e.r * 0.25, e.y - e.r * 0.15, e.r * 0.16, 0, Math.PI * 2);
    ctx.arc(e.x + e.r * 0.25, e.y - e.r * 0.15, e.r * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBlasts() {
  for (const b of state.blasts) {
    const a = Math.max(0, b.life / b.maxLife);
    ctx.strokeStyle = `rgba(139, 211, 255, ${a})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawBeams() {
  for (const beam of state.beams) {
    const dirX = Math.cos(beam.angle);
    const dirY = Math.sin(beam.angle);
    const span = Math.hypot(canvas.width, canvas.height) * 1.6;
    const x1 = beam.cx - dirX * span;
    const y1 = beam.cy - dirY * span;
    const x2 = beam.cx + dirX * span;
    const y2 = beam.cy + dirY * span;

    if (beam.phase === "warning") {
      const pulse = 0.35 + 0.25 * (Math.sin(elapsed * 18) * 0.5 + 0.5);
      ctx.save();
      ctx.strokeStyle = `rgba(242, 100, 106, ${pulse})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    ctx.save();
    ctx.strokeStyle = "rgba(255, 95, 102, 0.28)";
    ctx.lineWidth = beam.width;
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 160, 165, 0.8)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawParticles() {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 3, 3);
  }
  ctx.globalAlpha = 1;
}

let elapsed = 0;
let previousTime = performance.now();

function tick(now) {
  const dt = Math.min((now - previousTime) / 1000, 0.033);
  previousTime = now;
  elapsed += dt;

  if (state.running) {
    updatePlayer(dt);
    updateRunes(dt);
    updateBlasts(dt);
    updateEnemies(dt);
    updateBeams(dt);
    updateWave(dt);
    updateParticles(dt);
    const healthDrainPerSecond = 1 + (state.wave - 1) * 0.2;
    state.player.health -= healthDrainPerSecond * dt;

    if (state.player.health <= 0) {
      state.running = false;
      overlayTitleEl.textContent = "Defeated";
      overlayTextEl.textContent = `Final Score: ${Math.floor(state.score)} | Reached Wave ${state.wave}. Press Enter to restart.`;
      overlayEl.classList.remove("hidden");
    }

    state.score += dt * 2.2;
    state.flash = Math.max(0, state.flash - dt * 2);
    updateHud();
  }

  drawBackground(elapsed);
  drawRunes();
  drawEnemies();
  drawBlasts();
  drawBeams();
  drawPlayer();
  drawParticles();

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(242, 100, 106, ${state.flash * 0.35})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  requestAnimationFrame(tick);
}

window.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());

  if (event.key === "Enter" && !state.running) {
    resetGame();
  }

  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(event.key)) {
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.key.toLowerCase());
});

overlayTitleEl.textContent = "Rune Drift";
overlayTextEl.textContent = "Survive escalating waves, collect runes, and blast cursed spirits. Press Enter to begin.";
requestAnimationFrame(tick);
