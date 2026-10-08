const canvas = document.getElementById("gameCanvas");
const context = canvas.getContext("2d");
const scoreLabel = document.getElementById("score");
const livesLabel = document.getElementById("lives");
const startScreen = document.getElementById("startScreen");
const screenKicker = document.getElementById("screenKicker");
const screenTitle = document.getElementById("screenTitle");
const screenCopy = document.getElementById("screenCopy");
const buttonLabel = document.getElementById("buttonLabel");
const playButton = document.getElementById("playButton");

const state = {
    active: false,
    score: 0,
    lives: 3,
    playerX: 0.5,
    starX: 0.5,
    starY: 0,
    lastFrame: 0,
    keys: new Set()
};

let width = 0;
let height = 0;
let pixelRatio = 1;

const backgroundStars = Array.from({ length: 90 }, () => ({
    x: Math.random(),
    y: Math.random(),
    radius: Math.random() * 1.5 + 0.35,
    phase: Math.random() * Math.PI * 2
}));

function resizeCanvas() {
    const bounds = canvas.getBoundingClientRect();
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    width = bounds.width;
    height = bounds.height;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    draw(0);
}

function updateHud() {
    scoreLabel.textContent = String(state.score).padStart(2, "0");
    livesLabel.replaceChildren();

    for (let index = 0; index < 3; index++) {
        const dot = document.createElement("span");
        dot.className = `life-dot${index >= state.lives ? " is-lost" : ""}`;
        dot.setAttribute("aria-hidden", "true");
        livesLabel.appendChild(dot);
    }
    livesLabel.setAttribute("aria-label", `${state.lives} of 3 lives remaining`);
}

function resetStar() {
    state.starX = Math.random() * 0.9 + 0.05;
    state.starY = -0.04;
}

function startGame() {
    state.score = 0;
    state.lives = 3;
    state.playerX = 0.5;
    state.active = true;
    state.lastFrame = 0;
    resetStar();
    updateHud();
    startScreen.classList.add("is-hidden");
}

function endGame() {
    state.active = false;
    screenKicker.textContent = "THAT WAS A GOOD RUN";
    screenTitle.innerHTML = "Night,\n<span>night.</span>";
    screenCopy.innerHTML = `You caught ${state.score} ${state.score === 1 ? "star" : "stars"}. The sky will keep a place for you.`;
    buttonLabel.textContent = "Play again";
    startScreen.classList.remove("is-hidden");
}

function update(deltaTime) {
    if (!state.active) return;

    const direction = Number(state.keys.has("ArrowRight") || state.keys.has("d")) -
        Number(state.keys.has("ArrowLeft") || state.keys.has("a"));
    state.playerX = Math.max(0.08, Math.min(0.92, state.playerX + direction * deltaTime * 0.9));
    state.starY += (0.4 + state.score * 0.0167) * deltaTime;

    if (state.starY >= 0.88) {
        if (Math.abs(state.starX - state.playerX) < 0.15) {
            state.score++;
            updateHud();
        } else {
            state.lives--;
            updateHud();

            if (state.lives === 0) {
                endGame();
                return;
            }
        }
        resetStar();
    }
}

function drawStar(x, y, radius, rotation, glow = true) {
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    if (glow) {
        context.shadowColor = "rgba(255, 193, 112, 0.9)";
        context.shadowBlur = 25;
    }
    context.beginPath();
    for (let point = 0; point < 10; point++) {
        const angle = point * Math.PI / 5 - Math.PI / 2;
        const pointRadius = point % 2 === 0 ? radius : radius * 0.43;
        const pointX = Math.cos(angle) * pointRadius;
        const pointY = Math.sin(angle) * pointRadius;
        if (point === 0) context.moveTo(pointX, pointY);
        else context.lineTo(pointX, pointY);
    }
    context.closePath();
    context.fillStyle = "#ffd08d";
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = "#fff5dc";
    context.beginPath();
    context.arc(0, 0, radius * 0.19, 0, Math.PI * 2);
    context.fill();
    context.restore();
}

function drawBasket() {
    const centerX = state.playerX * width;
    const top = height * 0.88;
    const basketWidth = Math.min(96, width * 0.25);

    context.save();
    context.shadowColor = "rgba(94, 213, 205, 0.32)";
    context.shadowBlur = 24;
    context.beginPath();
    context.moveTo(centerX - basketWidth / 2, top);
    context.lineTo(centerX + basketWidth / 2, top);
    context.lineTo(centerX + basketWidth * 0.37, top + 27);
    context.quadraticCurveTo(centerX, top + 35, centerX - basketWidth * 0.37, top + 27);
    context.closePath();
    const fill = context.createLinearGradient(0, top, 0, top + 34);
    fill.addColorStop(0, "rgba(90, 192, 183, 0.8)");
    fill.addColorStop(1, "rgba(40, 105, 109, 0.88)");
    context.fillStyle = fill;
    context.fill();
    context.shadowBlur = 0;
    context.strokeStyle = "#a2ede0";
    context.lineWidth = 2;
    context.stroke();

    context.beginPath();
    context.moveTo(centerX - basketWidth / 2 - 4, top);
    context.quadraticCurveTo(centerX, top + 8, centerX + basketWidth / 2 + 4, top);
    context.strokeStyle = "#d0fff0";
    context.lineWidth = 3;
    context.stroke();
    context.restore();
}

function draw(time) {
    if (!width || !height) return;
    context.clearRect(0, 0, width, height);

    backgroundStars.forEach((star) => {
        const twinkle = 0.35 + (Math.sin(time * 0.001 + star.phase) + 1) * 0.24;
        context.globalAlpha = twinkle;
        context.fillStyle = "#dce9d8";
        context.beginPath();
        context.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2);
        context.fill();
    });
    context.globalAlpha = 1;

    if (state.active) {
        const starX = state.starX * width;
        const starY = state.starY * height;
        context.globalAlpha = 0.2;
        drawStar(starX, starY - 24, 10, time * 0.001, false);
        context.globalAlpha = 1;
        drawStar(starX, starY, 17, time * 0.00045);
        drawBasket();
    }
}

function frame(time) {
    const deltaTime = state.lastFrame ? Math.min((time - state.lastFrame) / 1000, 0.05) : 0;
    state.lastFrame = time;
    update(deltaTime);
    draw(time);
    window.requestAnimationFrame(frame);
}

canvas.addEventListener("pointerdown", (event) => {
    if (!state.active) return;
    canvas.setPointerCapture(event.pointerId);
    moveBasket(event);
});

canvas.addEventListener("pointermove", (event) => {
    if (state.active && event.buttons) moveBasket(event);
});

function moveBasket(event) {
    const bounds = canvas.getBoundingClientRect();
    state.playerX = Math.max(0.08, Math.min(0.92, (event.clientX - bounds.left) / bounds.width));
}

window.addEventListener("keydown", (event) => {
    if (["ArrowLeft", "ArrowRight", " "].includes(event.key)) event.preventDefault();
    state.keys.add(event.key.length === 1 ? event.key.toLowerCase() : event.key);
});

window.addEventListener("keyup", (event) => {
    state.keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key);
});

window.addEventListener("blur", () => state.keys.clear());
window.addEventListener("resize", resizeCanvas);
playButton.addEventListener("click", startGame);

updateHud();
resizeCanvas();
window.requestAnimationFrame(frame);