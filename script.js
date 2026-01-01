const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const speedInput = document.getElementById("speed");
const toggleBtn = document.getElementById("toggle");
const speedValue = document.getElementById("speedValue");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const state = {
  running: true,
  lastTime: 0,
  ropeSpeed: parseFloat(speedInput.value),
  ropeAngle: Math.PI / 2,
  ropeRadius: 120,
  groundY: canvas.height - 80,
  child: {
    x: canvas.width / 2,
    y: canvas.height - 120,
    vy: 0,
    onGround: true,
    jumpImpulse: -12,
  },
};

function drawBackground() {
  ctx.fillStyle = "#c9defa";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#d6c199";
  ctx.fillRect(0, state.groundY, canvas.width, canvas.height - state.groundY);

  // ground shading
  ctx.fillStyle = "rgba(0,0,0,0.05)";
  ctx.beginPath();
  ctx.ellipse(canvas.width / 2, state.groundY + 18, 360, 30, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawChild() {
  const { x, y, vy } = state.child;

  // shadow
  const squash = Math.min(1.2, 1 + Math.abs(vy) * 0.05);
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.beginPath();
  ctx.ellipse(x, state.groundY + 12, 50 * squash, 12 * squash, 0, 0, Math.PI * 2);
  ctx.fill();

  // legs
  const legSpread = 10 + Math.abs(Math.sin(state.ropeAngle)) * 12;
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#2d3e6f";
  ctx.beginPath();
  ctx.moveTo(x - legSpread, y + 40);
  ctx.lineTo(x - legSpread, y + 80);
  ctx.moveTo(x + legSpread, y + 40);
  ctx.lineTo(x + legSpread, y + 80);
  ctx.stroke();

  // shorts
  ctx.fillStyle = "#2d3e6f";
  ctx.fillRect(x - 24, y + 12, 48, 30);

  // torso
  ctx.fillStyle = "#5c8ef2";
  ctx.beginPath();
  ctx.roundRect(x - 26, y - 30, 52, 50, 12);
  ctx.fill();

  // arms following rope angle
  const armLength = 50;
  const offset = 24;
  const angleLeft = state.ropeAngle + Math.PI * 0.05;
  const angleRight = state.ropeAngle - Math.PI * 0.05;

  ctx.strokeStyle = "#f1c27d";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(x - offset, y - 10);
  ctx.lineTo(x - offset + Math.cos(angleLeft) * armLength, y - 10 + Math.sin(angleLeft) * armLength);
  ctx.moveTo(x + offset, y - 10);
  ctx.lineTo(x + offset + Math.cos(angleRight) * armLength, y - 10 + Math.sin(angleRight) * armLength);
  ctx.stroke();

  // head
  ctx.fillStyle = "#f1c27d";
  ctx.beginPath();
  ctx.arc(x, y - 56, 24, 0, Math.PI * 2);
  ctx.fill();

  // hair
  ctx.fillStyle = "#2c1b10";
  ctx.beginPath();
  ctx.arc(x, y - 62, 22, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 6, y - 66, 8, 0, Math.PI * 2);
  ctx.fill();

  // eyes
  ctx.fillStyle = "#152235";
  ctx.beginPath();
  ctx.arc(x - 7, y - 56, 3, 0, Math.PI * 2);
  ctx.arc(x + 7, y - 56, 3, 0, Math.PI * 2);
  ctx.fill();

  // smile
  ctx.strokeStyle = "#b5722d";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y - 48, 8, 0, Math.PI);
  ctx.stroke();
}

function drawRope() {
  const { x, y } = state.child;
  const radius = state.ropeRadius;
  const angle = state.ropeAngle;
  const ropeThickness = 6;

  const leftHandle = { x: x - 26, y: y - 10 };
  const rightHandle = { x: x + 26, y: y - 10 };

  const ropeCenterX = x + Math.cos(angle) * radius * 0.1;
  const ropeCenterY = y + Math.sin(angle) * radius * 0.1;
  const ropeBottomX = x + Math.cos(angle + Math.PI / 2) * radius;
  const ropeBottomY = y + Math.sin(angle + Math.PI / 2) * radius;

  ctx.lineWidth = ropeThickness;
  ctx.strokeStyle = "#f96d5b";
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(leftHandle.x, leftHandle.y);
  ctx.quadraticCurveTo(ropeCenterX - 10, ropeCenterY, ropeBottomX, ropeBottomY);
  ctx.quadraticCurveTo(ropeCenterX + 10, ropeCenterY, rightHandle.x, rightHandle.y);
  ctx.stroke();
}

function updateRope(dt) {
  state.ropeAngle += dt * state.ropeSpeed * 2.8;
}

function updateChild(dt) {
  const child = state.child;
  const gravity = 26;

  // Auto-jump when rope is about to pass under feet
  const normalizedAngle = (state.ropeAngle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  const nearingFeet = normalizedAngle > Math.PI * 0.8 && normalizedAngle < Math.PI * 1.2;

  if (nearingFeet && child.onGround) {
    child.vy = child.jumpImpulse;
    child.onGround = false;
  }

  child.vy += gravity * dt;
  child.y += child.vy;

  if (child.y > state.groundY - 40) {
    child.y = state.groundY - 40;
    child.vy = 0;
    child.onGround = true;
  }
}

function render(timestamp) {
  if (!state.running) return;
  const dt = Math.min((timestamp - state.lastTime) / 1000, 0.04);
  state.lastTime = timestamp;

  updateRope(dt);
  updateChild(dt);

  drawBackground();
  drawRope();
  drawChild();

  requestAnimationFrame(render);
}

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  ctx.scale(ratio, ratio);
  state.groundY = rect.height - 80;
  state.child.x = rect.width / 2;
  state.child.y = rect.height - 120;
}

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
