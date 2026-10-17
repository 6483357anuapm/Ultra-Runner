
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const coinsEl = document.getElementById("coins");
const bestEl = document.getElementById("best");
const speedEl = document.getElementById("speed");

const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");

const W = canvas.width;
const H = canvas.height;
const laneWidth = W / 3;

let running = false;
let lastTime = 0;
let elapsed = 0;
let spawnTimer = 0;
let coinTimer = 0;
let roadOffset = 0;
let score = 0;
let coins = 0;
let speed = 1;
let best = 0;
let objects = [];
let particles = [];

const player = {
  lane: 1,
  x: laneWidth * 1.5,
  y: H - 105,
  width: 28,
  height: 38,
  jump: 0,
  jumpVelocity: 0
};

try {
  best = Number(localStorage.getItem("neonRunnerBest")) || 0;
} catch (_) {}

bestEl.textContent = formatScore(best);

function formatScore(n) {
  return String(Math.floor(n)).padStart(5, "0");
}

function laneX(lane) {
  return laneWidth * lane + laneWidth / 2;
}

function startGame() {
  score = 0;
  coins = 0;
  speed = 1;
  elapsed = 0;
  spawnTimer = 0.4;
  coinTimer = 0.8;
  roadOffset = 0;
  objects = [];
  particles = [];

  player.lane = 1;
  player.x = laneX(1);
  player.jump = 0;
  player.jumpVelocity = 0;

  running = true;
  lastTime = performance.now();
  overlay.classList.add("hidden");
  requestAnimationFrame(loop);
}

function endGame() {
  running = false;

  if (score > best) {
    best = score;
    try {
      localStorage.setItem("neonRunnerBest", best);
    } catch (_) {}
  }

  bestEl.textContent = formatScore(best);
  overlayTitle.innerHTML = "GAME<br><span>OVER</span>";
  overlayText.innerHTML =
    `SCORE: ${formatScore(score)}<br>` +
    `COINS: ${coins}<br>` +
    "TRY AGAIN, LEGEND!";
  startBtn.textContent = "↻ PLAY AGAIN";
  overlay.classList.remove("hidden");
  draw();
}

function move(direction) {
  if (!running) return;
  player.lane = Math.max(0, Math.min(2, player.lane + direction));
}

function jump() {
  if (!running || player.jump > 0) return;
  player.jumpVelocity = 390;
}

function spawnObstacle() {
  const lane = Math.floor(Math.random() * 3);

  // Every lane has its own obstacle style.
  const types = ["block", "spikes", "barrier"];

  objects.push({
    kind: "obstacle",
    type: types[lane],
    lane,
    y: -50,
    size: 30
  });
}

function spawnCoin() {
  const lane = Math.floor(Math.random() * 3);

  objects.push({
    kind: "coin",
    lane,
    x: laneX(lane),
    y: -25,
    size: 13,
    phase: Math.random() * Math.PI * 2
  });
}

function addParticles(x, y, color) {
  for (let i = 0; i < 9; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 180,
      vy: (Math.random() - 0.7) * 180,
      life: 0.5,
      color
    });
  }
}

function update(dt) {
  elapsed += dt;
  score += dt * 12;
  speed = Math.min(2.6, 1 + elapsed * 0.018);
  roadOffset = (roadOffset + 180 * speed * dt) % 70;

  player.x += (laneX(player.lane) - player.x) *
    Math.min(1, dt * 14);

  if (player.jump > 0 || player.jumpVelocity > 0) {
    player.jump += player.jumpVelocity * dt;
    player.jumpVelocity -= 950 * dt;

    if (player.jump <= 0) {
      player.jump = 0;
      player.jumpVelocity = 0;
    }
  }

  spawnTimer -= dt;
  coinTimer -= dt;

  if (spawnTimer <= 0) {
    spawnObstacle();
    spawnTimer = Math.max(0.48, 1.05 / speed) +
      Math.random() * 0.35;
  }

  if (coinTimer <= 0) {
    spawnCoin();
    coinTimer = 0.65 + Math.random() * 0.65;
  }

  const playerY = player.y - player.jump;
  const playerBox = {
    left: player.x - 11,
    right: player.x + 11,
    top: playerY - 15,
    bottom: playerY + 15
  };

  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];
    obj.y += 210 * speed * dt;

    if (obj.kind === "coin") {
      obj.phase += dt * 8;

      const dx = Math.abs(player.x - obj.x);
      const dy = Math.abs(playerY - obj.y);

      if (dx < 27 && dy < 30) {
        coins++;
        score += 50;
        addParticles(obj.x, obj.y, "#ffe66d");
        objects.splice(i, 1);
        continue;
      }
    } else if (
      obj.lane === player.lane &&
      obj.y + 15 > playerBox.top &&
      obj.y - 15 < playerBox.bottom
    ) {
      // Jumping clears spikes and barriers.
      const jumpedOver = player.jump > 27;

      if (!jumpedOver) {
        endGame();
        return;
      }
    }

    if (obj.y > H + 60) {
      objects.splice(i, 1);
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;

    if (p.life <= 0) particles.splice(i, 1);
  }

  scoreEl.textContent = formatScore(score);
  coinsEl.textContent = coins;
  speedEl.textContent = speed.toFixed(1) + "x";
}

function drawBackground() {
  ctx.fillStyle = "#09091a";
  ctx.fillRect(0, 0, W, H);

  // Retro starfield.
  for (let i = 0; i < 45; i++) {
    const x = (i * 83 + 17) % W;
    const y = (i * 137 + roadOffset * 0.3) % H;

    ctx.fillStyle = i % 3 === 0 ? "#ff2e93" : "#48416d";
    ctx.fillRect(x, y, 2, 2);
  }

  // Three neon lanes.
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i === 1 ? "#100e26" : "#0c0b20";
    ctx.fillRect(i * laneWidth, 0, laneWidth, H);

    ctx.strokeStyle = "#30244f";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      i * laneWidth + 1,
      0,
      laneWidth - 2,
      H
    );
  }

  // Moving lane markings.
  for (let i = 1; i < 3; i++) {
    for (let y = -70 + roadOffset; y < H; y += 70) {
      ctx.fillStyle = "#554477";
      ctx.fillRect(i * laneWidth - 1, y, 2, 34);
    }
  }

  // Neon side rails.
  ctx.fillStyle = "#00f5ff";
  ctx.fillRect(0, 0, 3, H);
  ctx.fillRect(W - 3, 0, 3, H);
}

function drawPlayer() {
  const x = player.x;
  const y = player.y - player.jump;

  ctx.save();
  ctx.translate(x, y);

  // Glow.
  ctx.shadowColor = "#00f5ff";
  ctx.shadowBlur = 18;

  // Shadow underneath player.
  ctx.fillStyle = "#00000088";
  ctx.fillRect(-16, 22 + player.jump, 32, 5);

  // Pixel character.
  ctx.fillStyle = "#00f5ff";
  ctx.fillRect(-10, -16, 20, 23);
  ctx.fillRect(-14, -10, 4, 12);
  ctx.fillRect(10, -10, 4, 12);

  ctx.fillStyle = "#ff2e93";
  ctx.fillRect(-9, -23, 18, 9);
  ctx.fillRect(-7, -27, 14, 4);

  // Eyes.
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-6, -19, 4, 4);
  ctx.fillRect(2, -19, 4, 4);

  // Shoes.
  ctx.fillStyle = "#ffe66d";
  ctx.fillRect(-11, 8, 8, 6);
  ctx.fillRect(3, 8, 8, 6);

  ctx.restore();
}

function drawObstacle(obj) {
  const x = laneX(obj.lane);
  const y = obj.y;

  ctx.save();
  ctx.translate(x, y);

  if (obj.type === "block") {
    ctx.shadowColor = "#ff2e93";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#ff2e93";
    ctx.fillRect(-16, -16, 32, 32);

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#ffd2eb";
    ctx.lineWidth = 2;
    ctx.strokeRect(-11, -11, 22, 22);

    ctx.fillStyle = "#6b124e";
    ctx.fillRect(-7, -7, 14, 14);
  }

  if (obj.type === "spikes") {
    ctx.shadowColor = "#ff604f";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#ff604f";

    ctx.beginPath();
    ctx.moveTo(-19, 15);
    ctx.lineTo(-10, -17);
    ctx.lineTo(0, 15);
    ctx.lineTo(10, -17);
    ctx.lineTo(19, 15);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffe6a6";
    ctx.fillRect(-14, 9, 7, 3);
    ctx.fillRect(7, 9, 7, 3);
  }

  if (obj.type === "barrier") {
    ctx.shadowColor = "#a66cff";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#a66cff";
    ctx.fillRect(-20, -13, 40, 26);

    ctx.shadowBlur = 0;
    ctx.fillStyle = "#ffe66d";
    ctx.fillRect(-14, -8, 7, 16);
    ctx.fillRect(7, -8, 7, 16);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-20, -13, 40, 3);
  }

  ctx.restore();
}

function drawCoin(obj) {
  const pulse = Math.sin(obj.phase) * 2;
  const x = obj.x;
  const y = obj.y;

  ctx.save();
  ctx.translate(x, y);
  ctx.shadowColor = "#ffe66d";
  ctx.shadowBlur = 15;

  ctx.fillStyle = "#ffe66d";
  ctx.fillRect(-9, -12 - pulse, 18, 24 + pulse * 2);

  ctx.shadowBlur = 0;
  ctx.fillStyle = "#b77b18";
  ctx.fillRect(-5, -7, 10, 14);
  ctx.fillStyle = "#fff4a6";
  ctx.fillRect(-2, -5, 4, 10);

  ctx.restore();
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 4, 4);
  }

  ctx.globalAlpha = 1;
}

function draw() {
  drawBackground();

  for (const obj of objects) {
    if (obj.kind === "coin") {
      drawCoin(obj);
    } else {
      drawObstacle(obj);
    }
  }

  drawParticles();
  drawPlayer();

  // Lane indicators.
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i === player.lane ? "#00f5ff" : "#49405f";
    ctx.fillRect(i * laneWidth + laneWidth / 2 - 9, H - 28, 18, 3);
  }
}

function loop(timestamp) {
  if (!running) return;

  const dt = Math.min((timestamp - lastTime) / 1000, 0.04);
  lastTime = timestamp;

  update(dt);

  if (!running) return;

  draw();
  requestAnimationFrame(loop);
}

startBtn.addEventListener("click", startGame);

document.getElementById("leftBtn").addEventListener("click", () => {
  move(-1);
});

document.getElementById("rightBtn").addEventListener("click", () => {
  move(1);
});

document.getElementById("jumpBtn").addEventListener("click", jump);

document.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", " "].includes(e.key)) {
    e.preventDefault();
  }

  if (e.repeat) return;

  if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") {
    move(-1);
  }

  if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") {
    move(1);
  }

  if (e.key === "ArrowUp" || e.key === " ") {
    jump();
  }

  if (e.key === "Enter" && !running) {
    startGame();
  }
});

draw();
