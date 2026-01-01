// Referências de elementos do DOM usados pela simulação
const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const speedInput = document.getElementById("speed");
const toggleBtn = document.getElementById("toggle");
const speedValue = document.getElementById("speedValue");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Elementos visuais auxiliares do ambiente (nuvens) com posições/speeds iniciais
const environment = {
  clouds: Array.from({ length: 5 }, (_, i) => ({
    x: 120 + i * 180,
    y: 60 + Math.random() * 80,
    size: 80 + Math.random() * 40,
    speed: 12 + Math.random() * 8,
  })),
};

// Estado central da simulação: controla tempo, física e parâmetros da corda/criança
const state = {
  running: true,
  lastTime: 0,
  time: 0,
  ropeSpeed: parseFloat(speedInput.value),
  ropeAngle: Math.PI / 2,
  ropeRadius: 120,
  groundY: canvas.height - 80,
  crouch: 0,
  headBob: 0,
  child: {
    x: canvas.width / 2,
    y: canvas.height - 120,
    vy: 0,
    onGround: true,
    jumpImpulse: -12.5,
  },
};

// Interpolação linear segura (clampa t) para suavizar transições
function lerp(a, b, t) {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

// Desenha céu, sol, nuvens, pista e vinheta de ambiente
function drawBackground(dt) {
  const width = canvas.width / (window.devicePixelRatio || 1);
  const height = canvas.height / (window.devicePixelRatio || 1);

  // sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, "#e7f1ff");
  grad.addColorStop(0.6, "#c9defa");
  grad.addColorStop(1, "#d6c199");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // sun
  ctx.save();
  ctx.translate(width * 0.82, height * 0.18);
  const sunRadius = 36;
  const radial = ctx.createRadialGradient(0, 0, 0, 0, 0, sunRadius * 2.2);
  radial.addColorStop(0, "rgba(255, 214, 130, 0.9)");
  radial.addColorStop(1, "rgba(255, 214, 130, 0)");
  ctx.fillStyle = radial;
  ctx.beginPath();
  ctx.arc(0, 0, sunRadius * 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd686";
  ctx.beginPath();
  ctx.arc(0, 0, sunRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // moving clouds
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  environment.clouds.forEach((cloud) => {
    cloud.x += cloud.speed * dt * 0.5;
    if (cloud.x - cloud.size * 0.8 > width + 60) cloud.x = -60;
    drawCloud(cloud.x, cloud.y, cloud.size);
  });

  // ground shading and track
  const groundTop = state.groundY;
  ctx.fillStyle = "#d6c199";
  ctx.fillRect(0, groundTop, width, height - groundTop);

  const groundGrad = ctx.createLinearGradient(0, groundTop, 0, height);
  groundGrad.addColorStop(0, "rgba(0,0,0,0.05)");
  groundGrad.addColorStop(1, "rgba(0,0,0,0.12)");
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, groundTop, width, height - groundTop);

  // track lines
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 2;
  [0.72, 0.8, 0.88].forEach((p) => {
    ctx.beginPath();
    ctx.moveTo(0, groundTop + (height - groundTop) * (p - 0.7));
    ctx.lineTo(width, groundTop + (height - groundTop) * (p - 0.7));
    ctx.stroke();
  });

  // ambient vignette
  const vignette = ctx.createRadialGradient(
    width / 2,
    height * 0.55,
    Math.min(width, height) * 0.25,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.75
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(17,30,60,0.07)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

// Forma básica de nuvem composta por arcos sobrepostos
function drawCloud(x, y, size) {
  ctx.beginPath();
  const radius = size * 0.3;
  ctx.arc(x, y, radius, Math.PI * 0.5, Math.PI * 1.5);
  ctx.arc(x + radius, y - radius, radius, Math.PI, 0);
  ctx.arc(x + radius * 2, y - radius, radius, Math.PI, 0);
  ctx.arc(x + radius * 3, y, radius, Math.PI * 1.5, Math.PI * 0.5);
  ctx.closePath();
  ctx.fill();
}

// Desenha a criança com sombras, deformações e elementos dependentes do estado
function drawChild() {
  const { x, y, vy, onGround } = state.child;
  const crouch = state.crouch;
  const lean = Math.sin(state.ropeAngle) * 6;
  const bob = state.headBob;

  // shadow
  const squash = Math.min(1.3, 1 + Math.abs(vy) * 0.05 + crouch * 0.6);
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.beginPath();
  ctx.ellipse(x, state.groundY + 14, 52 * squash, 14 * squash, 0, 0, Math.PI * 2);
  ctx.fill();

  // legs
  const legSpread = 12 + Math.abs(Math.sin(state.ropeAngle)) * 10 + crouch * 8;
  const legBend = 18 * crouch;
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#2d3e6f";
  ctx.beginPath();
  ctx.moveTo(x - legSpread, y + 44 - legBend * 0.2);
  ctx.lineTo(x - legSpread, y + 86 - legBend);
  ctx.moveTo(x + legSpread, y + 44 - legBend * 0.2);
  ctx.lineTo(x + legSpread, y + 86 - legBend);
  ctx.stroke();

  // shorts
  ctx.fillStyle = "#2d3e6f";
  ctx.fillRect(x - 25, y + 12 - legBend * 0.3, 50, 32);

  // torso
  const torsoHeight = 52 - crouch * 10;
  ctx.save();
  ctx.translate(x, y - 32 - crouch * 8);
  ctx.rotate((lean * Math.PI) / 360);
  ctx.fillStyle = "#5c8ef2";
  ctx.beginPath();
  ctx.roundRect(-27, -10, 54, torsoHeight, 12);
  ctx.fill();

  // arms
  const armLength = 54 - crouch * 8;
  const offset = 26;
  const swing = Math.PI * 0.07;
  const angleLeft = state.ropeAngle + swing;
  const angleRight = state.ropeAngle - swing;

  ctx.strokeStyle = "#f1c27d";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(-offset, -6);
  ctx.lineTo(-offset + Math.cos(angleLeft) * armLength, -6 + Math.sin(angleLeft) * armLength);
  ctx.moveTo(offset, -6);
  ctx.lineTo(offset + Math.cos(angleRight) * armLength, -6 + Math.sin(angleRight) * armLength);
  ctx.stroke();

  // head
  ctx.fillStyle = "#f1c27d";
  ctx.beginPath();
  ctx.arc(0, -32 - torsoHeight + bob, 24, 0, Math.PI * 2);
  ctx.fill();

  // hair
  ctx.fillStyle = "#2c1b10";
  ctx.beginPath();
  ctx.arc(0, -38 - torsoHeight + bob, 23, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(8, -43 - torsoHeight + bob, 8, 0, Math.PI * 2);
  ctx.fill();

  // eyes blink
  ctx.fillStyle = "#152235";
  const blink = (Math.sin(state.time * 2.2) + 1) * 0.5 < 0.08 ? 0.2 : 1;
  ctx.beginPath();
  ctx.arc(-7, -35 - torsoHeight + bob, 3 * blink, 0, Math.PI * 2);
  ctx.arc(7, -35 - torsoHeight + bob, 3 * blink, 0, Math.PI * 2);
  ctx.fill();

  // smile
  ctx.strokeStyle = "#b5722d";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -25 - torsoHeight + bob, 8, 0, Math.PI);
  ctx.stroke();
  ctx.restore();

  // subtle dust when landing
  if (onGround && Math.abs(vy) < 0.01 && crouch < 0.1) {
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.ellipse(x - 26, state.groundY + 6, 14, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 26, state.groundY + 6, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Renderiza a corda com glow/trail e curvatura ajustada pelo ângulo
function drawRope() {
  const { x, y } = state.child;
  const radius = state.ropeRadius;
  const angle = state.ropeAngle;
  const ropeThickness = 7;

  const leftHandle = { x: x - 26, y: y - 12 };
  const rightHandle = { x: x + 26, y: y - 12 };

  const ropeCenterX = x + Math.cos(angle) * radius * 0.08;
  const ropeCenterY = y + Math.sin(angle) * radius * 0.08;
  const ropeBottomX = x + Math.cos(angle + Math.PI / 2) * radius;
  const ropeBottomY = y + Math.sin(angle + Math.PI / 2) * radius;

  ctx.lineCap = "round";

  // rope glow/trail
  ctx.strokeStyle = "var(--rope-glow)";
  ctx.lineWidth = ropeThickness * 2.1;
  ctx.beginPath();
  ctx.moveTo(leftHandle.x, leftHandle.y);
  ctx.quadraticCurveTo(ropeCenterX - 12, ropeCenterY, ropeBottomX, ropeBottomY);
  ctx.quadraticCurveTo(ropeCenterX + 12, ropeCenterY, rightHandle.x, rightHandle.y);
  ctx.stroke();

  // rope body
  ctx.strokeStyle = "var(--rope)";
  ctx.lineWidth = ropeThickness;
  ctx.beginPath();
  ctx.moveTo(leftHandle.x, leftHandle.y);
  ctx.quadraticCurveTo(ropeCenterX - 10, ropeCenterY, ropeBottomX, ropeBottomY);
  ctx.quadraticCurveTo(ropeCenterX + 10, ropeCenterY, rightHandle.x, rightHandle.y);
  ctx.stroke();

  // handles
  ctx.strokeStyle = "#1f3b75";
  ctx.lineWidth = ropeThickness;
  ctx.beginPath();
  ctx.moveTo(leftHandle.x, leftHandle.y);
  ctx.lineTo(leftHandle.x, leftHandle.y + 12);
  ctx.moveTo(rightHandle.x, rightHandle.y);
  ctx.lineTo(rightHandle.x, rightHandle.y + 12);
  ctx.stroke();
}

// Atualiza o ângulo da corda baseado na velocidade atual
function updateRope(dt) {
  state.ropeAngle += dt * state.ropeSpeed * 3.1;
}

// Física simplificada do personagem: agachar, impulso, gravidade e aterrissagem
function updateChild(dt) {
  const child = state.child;
  const gravity = 26;

  const normalizedAngle = ((state.ropeAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const nearingFeet = normalizedAngle > Math.PI * 0.82 && normalizedAngle < Math.PI * 1.18;
  const crouchTarget = child.onGround && nearingFeet ? 0.42 : 0;
  state.crouch = lerp(state.crouch, crouchTarget, 6 * dt);

  if (nearingFeet && child.onGround) {
    child.vy = child.jumpImpulse * (0.95 + state.ropeSpeed * 0.06);
    child.onGround = false;
  }

  child.vy += gravity * dt;
  child.y += child.vy;

  // head bob follows vertical speed
  state.headBob = lerp(state.headBob, -child.vy * 0.8, 8 * dt);

  if (child.y > state.groundY - 40) {
    child.y = state.groundY - 40;
    child.vy = 0;
    child.onGround = true;
  }
}

// Loop principal da animação: atualiza estado, redesenha cena e agenda próximo frame
function render(timestamp) {
  if (!state.running) return;
  const dt = Math.min((timestamp - state.lastTime) / 1000, 0.04);
  state.lastTime = timestamp;
  state.time += dt;

  updateRope(dt);
  updateChild(dt);

  drawBackground(dt);
  drawRope();
  drawChild();

  requestAnimationFrame(render);
}

// Ajusta resolução do canvas ao tamanho do contêiner e recalibra posições base
function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  ctx.scale(ratio, ratio);
  state.groundY = rect.height - 90;
  state.child.x = rect.width / 2;
  state.child.y = rect.height - 130;
}

// Mantém o texto do output alinhado com o valor do slider
function updateSpeedDisplay(value) {
  speedValue.textContent = `${value.toFixed(1)}x`;
}

speedInput.addEventListener("input", (e) => {
  state.ropeSpeed = parseFloat(e.target.value);
  updateSpeedDisplay(state.ropeSpeed);
});

toggleBtn.addEventListener("click", () => {
  state.running = !state.running;
  toggleBtn.textContent = state.running ? "Pausar" : "Retomar";
  if (state.running) {
    state.lastTime = performance.now();
    requestAnimationFrame(render);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    toggleBtn.click();
  }
});

window.addEventListener("resize", resizeCanvas);

if (prefersReducedMotion) {
  speedInput.value = Math.max(parseFloat(speedInput.min), parseFloat(speedInput.value) - 0.4).toString();
  state.ropeSpeed = parseFloat(speedInput.value);
}

resizeCanvas();
updateSpeedDisplay(state.ropeSpeed);
state.lastTime = performance.now();
requestAnimationFrame(render);
