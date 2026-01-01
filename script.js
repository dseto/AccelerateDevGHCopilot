const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const speedInput = document.getElementById("speed");
const toggleBtn = document.getElementById("toggle");
const speedValue = document.getElementById("speedValue");

// Configurações de Física
const GRAVITY = 0.5;
const FRICTION = 0.98;
const ROPE_SEGMENTS = 25;
const ROPE_LENGTH = 320;
const SEGMENT_LENGTH = ROPE_LENGTH / ROPE_SEGMENTS;

class Point {
    constructor(x, y, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.oldX = x;
        this.oldY = y;
        this.oldZ = z;
    }
}

class Stick {
    constructor(p1, p2, length) {
        this.p1 = p1;
        this.p2 = p2;
        this.length = length;
    }
}

const state = {
    running: true,
    lastTime: 0,
    time: 0,
    ropeSpeed: parseFloat(speedInput.value),
    ropeAngle: 0,
    groundY: 0,
    child: {
        x: 0,
        y: 0,
        baseY: 0,
        vy: 0,
        isJumping: false,
        jumpForce: -11.5,
    },
    rope: {
        points: [],
        sticks: []
    }
};

function initRope() {
    state.rope.points = [];
    state.rope.sticks = [];
    for (let i = 0; i <= ROPE_SEGMENTS; i++) {
        state.rope.points.push(new Point(state.child.x, state.child.y, 0));
    }
    for (let i = 0; i < ROPE_SEGMENTS; i++) {
        state.rope.sticks.push(new Stick(state.rope.points[i], state.rope.points[i+1], SEGMENT_LENGTH));
    }
}

function updatePhysics() {
    if (!state.running) return;

    state.ropeAngle += state.ropeSpeed * 0.12;

    // IA de Pulo - Sincronizada com a posição da corda no eixo Y e Z
    const zPos = Math.cos(state.ropeAngle);
    const yPos = Math.sin(state.ropeAngle);
    if (zPos > 0.8 && yPos > 0 && !state.child.isJumping) {
        state.child.vy = state.child.jumpForce;
        state.child.isJumping = true;
    }

    state.child.vy += GRAVITY;
    state.child.y += state.child.vy;

    if (state.child.y > state.child.baseY) {
        state.child.y = state.child.baseY;
        state.child.vy = 0;
        state.child.isJumping = false;
    }

    const handYBase = state.child.y - 35;
    const handOffset = 25;
    const rotationRadius = 10;
    
    // Mãos giram em um plano 3D (X e Y, com Z implícito para a corda)
    const leftHand = { 
        x: state.child.x - handOffset + Math.cos(state.ropeAngle) * rotationRadius, 
        y: handYBase + Math.sin(state.ropeAngle) * rotationRadius,
        z: Math.cos(state.ropeAngle) * rotationRadius
    };
    const rightHand = { 
        x: state.child.x + handOffset + Math.cos(state.ropeAngle) * rotationRadius, 
        y: handYBase + Math.sin(state.ropeAngle) * rotationRadius,
        z: Math.cos(state.ropeAngle) * rotationRadius
    };

    state.rope.points.forEach((p, i) => {
        if (i === 0) {
            p.x = leftHand.x; p.y = leftHand.y; p.z = leftHand.z;
        } else if (i === ROPE_SEGMENTS) {
            p.x = rightHand.x; p.y = rightHand.y; p.z = rightHand.z;
        } else {
            const vx = (p.x - p.oldX) * FRICTION;
            const vy = (p.y - p.oldY) * FRICTION;
            const vz = (p.z - p.oldZ) * FRICTION;
            p.oldX = p.x; p.oldY = p.y; p.oldZ = p.z;
            p.x += vx; p.y += vy; p.z += vz;
            p.y += GRAVITY * 0.4;

            // Força centrífuga baseada no ângulo de rotação para criar o arco 3D
            const mid = ROPE_SEGMENTS / 2;
            const distFromMid = 1 - Math.abs(i - mid) / mid;
            const arcStrength = 180;
            
            // A corda segue uma trajetória circular no plano Y-Z
            const targetY = handYBase + Math.sin(state.ropeAngle) * arcStrength * distFromMid;
            const targetZ = Math.cos(state.ropeAngle) * arcStrength * distFromMid;
            
            p.y += (targetY - p.y) * 0.1;
            p.z += (targetZ - p.z) * 0.1;
        }
    });

    for (let i = 0; i < 10; i++) {
        state.rope.sticks.forEach(s => {
            const dx = s.p2.x - s.p1.x;
            const dy = s.p2.y - s.p1.y;
            const dz = s.p2.z - s.p1.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const difference = s.length - distance;
            const percent = difference / distance / 2;
            const offsetX = dx * percent;
            const offsetY = dy * percent;
            const offsetZ = dz * percent;

            if (s.p1 !== state.rope.points[0] && s.p1 !== state.rope.points[ROPE_SEGMENTS]) {
                s.p1.x -= offsetX; s.p1.y -= offsetY; s.p1.z -= offsetZ;
            }
            if (s.p2 !== state.rope.points[0] && s.p2 !== state.rope.points[ROPE_SEGMENTS]) {
                s.p2.x += offsetX; s.p2.y += offsetY; s.p2.z += offsetZ;
            }
        });
    }

    state.rope.points.forEach(p => {
        if (p.y > state.groundY) {
            p.y = state.groundY;
            p.oldY = p.y + (p.y - p.oldY) * 0.1;
        }
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    // Background
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, "#87CEEB");
    skyGrad.addColorStop(1, "#E0F6FF");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#91c788";
    ctx.fillRect(0, state.groundY, width, height - state.groundY);

    // Sombra
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath();
    ctx.ellipse(state.child.x, state.groundY, 35, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    const c = state.child;

    // Função para desenhar a corda
    const drawRopePart = (points) => {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.lineWidth = 8;
        ctx.stroke();
    };

    // Divide a corda em partes: atrás (z < 0) e frente (z >= 0)
    const backPoints = state.rope.points.filter(p => p.z < 0);
    const frontPoints = state.rope.points.filter(p => p.z >= 0);

    // 1. Desenha parte de TRÁS da corda
    if (backPoints.length > 1) {
        ctx.globalAlpha = 0.6;
        drawRopePart(state.rope.points); // Simplificado para manter continuidade, mas com alpha
        ctx.globalAlpha = 1.0;
    }

    // 2. Desenha Personagem
    // Pernas
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(c.x - 10, c.y - 20); ctx.lineTo(c.x - 10, c.y);
    ctx.moveTo(c.x + 10, c.y - 20); ctx.lineTo(c.x + 10, c.y);
    ctx.stroke();

    // Corpo
    ctx.fillStyle = "#ff6b6b";
    ctx.beginPath();
    ctx.roundRect(c.x - 15, c.y - 60, 30, 45, 10);
    ctx.fill();

    // Braços e Mãos
    const handYBase = c.y - 35;
    const handOffset = 25;
    const rotationRadius = 10;
    const shoulderY = c.y - 55;
    const handLX = c.x - handOffset + Math.cos(state.ropeAngle) * rotationRadius;
    const handLY = handYBase + Math.sin(state.ropeAngle) * rotationRadius;
    const handRX = c.x + handOffset + Math.cos(state.ropeAngle) * rotationRadius;
    const handRY = handYBase + Math.sin(state.ropeAngle) * rotationRadius;

    ctx.strokeStyle = "#ffe0bd";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(c.x - 15, shoulderY); ctx.lineTo(handLX, handLY);
    ctx.moveTo(c.x + 15, shoulderY); ctx.lineTo(handRX, handRY);
    ctx.stroke();
    ctx.fillStyle = "#ffe0bd";
    ctx.beginPath();
    ctx.arc(handLX, handLY, 5, 0, Math.PI * 2);
    ctx.arc(handRX, handRY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Cabeça
    ctx.beginPath();
    ctx.arc(c.x, c.y - 75, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(c.x - 5, c.y - 77, 2, 0, Math.PI * 2);
    ctx.arc(c.x + 5, c.y - 77, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#4a3728";
    ctx.beginPath();
    ctx.arc(c.x, c.y - 82, 16, Math.PI, 0);
    ctx.fill();

    // 3. Desenha parte da FRENTE da corda (apenas quando Z é positivo)
    // Para um efeito visual perfeito, desenhamos a corda inteira novamente se a maioria dos pontos estiver na frente
    const midPointZ = state.rope.points[Math.floor(ROPE_SEGMENTS/2)].z;
    if (midPointZ > 0) {
        drawRopePart(state.rope.points);
    }
}

function loop(timestamp) {
    updatePhysics();
    draw();
    requestAnimationFrame(loop);
}

function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    state.groundY = rect.height - 50;
    state.child.x = rect.width / 2;
    state.child.baseY = state.groundY - 10;
    state.child.y = state.child.baseY;
    initRope();
}

speedInput.addEventListener("input", (e) => {
    state.ropeSpeed = parseFloat(e.target.value);
    speedValue.textContent = `${state.ropeSpeed.toFixed(1)}x`;
});

toggleBtn.addEventListener("click", () => {
    state.running = !state.running;
    toggleBtn.textContent = state.running ? "Pausar" : "Retomar";
});

window.addEventListener("resize", resize);
resize();
requestAnimationFrame(loop);
