function wrapLinesAndChars(pre) {
  const text = pre.textContent.replace(/\r\n/g, "\n");
  pre.textContent = "";

  const lines = text.split("\n");
  const lineEls = [];

  const frag = document.createDocumentFragment();
  for (let li = 0; li < lines.length; li++) {
    const line = document.createElement("span");
    line.className = "line";
    line.style.display = "block";

    const s = lines[li] === "" ? " " : lines[li];
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      const ch = document.createElement("span");
      ch.className = "ch";
      ch.textContent = c === " " ? "\u00A0" : c;
      line.appendChild(ch);
    }

    frag.appendChild(line);
    if (li !== lines.length - 1) frag.appendChild(document.createTextNode("\n"));

    lineEls.push(line);
  }

  pre.appendChild(frag);
  return lineEls;
}

const leftLines  = wrapLinesAndChars(document.getElementById("left"));
const rightLines = wrapLinesAndChars(document.getElementById("right"));

function randInt(n) { return (Math.random() * n) | 0; }
function randBetween(a, b) { return a + Math.random() * (b - a); }

// HELLE WELLE (hot)
function sparkWave(lines, opts) {
  const L = lines.length;
  if (!L) return;

  const {
    bandMinLines, bandMaxLines,
    perLineMin, perLineMax,
    holdMin, holdMax,
    radiusMin, radiusMax
  } = opts;

  const band = bandMinLines + randInt(bandMaxLines - bandMinLines + 1);
  const start = randInt(Math.max(1, L - band + 1));

  const holdMinLocal = randBetween(holdMin * 0.9, holdMin * 1.1);
  const holdMaxLocal = randBetween(holdMax * 0.9, holdMax * 1.1);

  for (let li = start; li < Math.min(L, start + band); li++) {
    const line = lines[li];
    const chars = line.querySelectorAll(".ch");
    const N = chars.length;
    if (!N) continue;

    const count = perLineMin + randInt(perLineMax - perLineMin + 1);
    const center = randInt(N);
    const radius = randBetween(radiusMin, radiusMax);

    for (let k = 0; k < count; k++) {
      const offset = Math.round(
        randBetween(-radius, radius) + randBetween(-radius, radius) * 0.35
      );
      let idx = center + offset;
      if (idx < 0) idx = (idx % N + N) % N;
      if (idx >= N) idx = idx % N;

      const el = chars[idx];
      if (!el || el.classList.contains("hot")) continue;

      el.classList.add("hot");
      const hold = randBetween(holdMinLocal, holdMaxLocal);
      setTimeout(() => el.classList.remove("hot"), hold);
    }
  }
}

// DUNKLE WELLE (dim)
function dimWave(lines, opts) {
  const L = lines.length;
  if (!L) return;

  const {
    bandMinLines, bandMaxLines,
    perLineMin, perLineMax,
    holdMin, holdMax,
    radiusMin, radiusMax
  } = opts;

  const band = bandMinLines + randInt(bandMaxLines - bandMinLines + 1);
  const start = randInt(Math.max(1, L - band + 1));

  const holdMinLocal = randBetween(holdMin * 0.9, holdMin * 1.1);
  const holdMaxLocal = randBetween(holdMax * 0.9, holdMax * 1.1);

  for (let li = start; li < Math.min(L, start + band); li++) {
    const line = lines[li];
    const chars = line.querySelectorAll(".ch");
    const N = chars.length;
    if (!N) continue;

    const count = perLineMin + randInt(perLineMax - perLineMin + 1);
    const center = randInt(N);
    const radius = randBetween(radiusMin, radiusMax);

    for (let k = 0; k < count; k++) {
      const offset = Math.round(
        randBetween(-radius, radius) + randBetween(-radius, radius) * 0.35
      );
      let idx = center + offset;
      if (idx < 0) idx = (idx % N + N) % N;
      if (idx >= N) idx = idx % N;

      const el = chars[idx];
      if (!el || el.classList.contains("dim") || el.classList.contains("hot")) continue;

      el.classList.add("dim");
      const hold = randBetween(holdMinLocal, holdMaxLocal);
      setTimeout(() => el.classList.remove("dim"), hold);
    }
  }
}

function scheduleWaves(fn, lines, opts, intervalMin, intervalMax) {
  let timer = null;
  let running = false;

  function tick() {
    if (!running) return;
    fn(lines, opts);
    timer = setTimeout(tick, randBetween(intervalMin, intervalMax));
  }

  return {
    start() {
      if (running) return;
      running = true;
      tick();
    },
    stop() {
      running = false;
      if (timer) { clearTimeout(timer); timer = null; }
    },
    get running() { return running; }
  };
}

// === Parameter ===
const leftHot = {
  bandMinLines: 4, bandMaxLines: 10,
  perLineMin: 6,  perLineMax: 16,
  holdMin: 520,   holdMax: 1250,
  radiusMin: 10,  radiusMax: 28
};
const rightHot = {
  bandMinLines: 3, bandMaxLines: 9,
  perLineMin: 5,  perLineMax: 14,
  holdMin: 600,   holdMax: 1450,
  radiusMin: 12,  radiusMax: 32
};

const leftDim = {
  bandMinLines: 5, bandMaxLines: 12,
  perLineMin: 8,  perLineMax: 22,
  holdMin: 800,   holdMax: 2200,
  radiusMin: 14,  radiusMax: 40
};
const rightDim = {
  bandMinLines: 4, bandMaxLines: 11,
  perLineMin: 7,  perLineMax: 20,
  holdMin: 900,   holdMax: 2400,
  radiusMin: 16,  radiusMax: 44
};

const schedLeftHot  = scheduleWaves(sparkWave, leftLines,  leftHot,  420,  920);
const schedRightHot = scheduleWaves(sparkWave, rightLines, rightHot, 520, 1200);
const schedLeftDim  = scheduleWaves(dimWave,   leftLines,  leftDim,  650, 1500);
const schedRightDim = scheduleWaves(dimWave,   rightLines, rightDim, 780, 1800);

// === Container / Overlays ===
const container = document.getElementById("container");
const glitchOverlay = document.getElementById("glitchOverlay");
const staticOverlay = document.getElementById("staticOverlay");

// === Default OFF ===
let fxOn = false;

function clearAllFX(root) {
  const els = root.querySelectorAll(".ch.hot, .ch.dim");
  els.forEach(el => { el.classList.remove("hot", "dim"); });
}

// ===== Static Flicker (stoppbar, keine Mehrfach-Timer) =====
const STATIC_OPACITY = 0.05;
let staticFlickerTimer = null;

function stopStaticFlicker(){
  if (staticFlickerTimer) {
    clearTimeout(staticFlickerTimer);
    staticFlickerTimer = null;
  }
}

function startStaticFlicker(){
  stopStaticFlicker();

  function tick(){
    if (!fxOn) return;

    const nextIn = randBetween(6000, 18000);
    staticFlickerTimer = setTimeout(() => {
      if (!fxOn) return;

      if (Math.random() < 0.22) {
        const offFor = randBetween(70, 120);
        staticOverlay.style.opacity = "0";
        setTimeout(() => {
          if (fxOn) staticOverlay.style.opacity = String(STATIC_OPACITY);
        }, offFor);
      } else {
        staticOverlay.style.opacity = String(STATIC_OPACITY);
      }

      tick();
    }, nextIn);
  }

  staticOverlay.style.opacity = String(STATIC_OPACITY);
  tick();
}

// ===== FX Toggle: Static + Glitch immer gemeinsam =====
function setFX(on) {
  if (on === fxOn) return;
  fxOn = on;

  // VHS + Float
  document.body.classList.toggle("vhs-on", fxOn);
  container.classList.toggle("float-on", fxOn);

  // Glitch + Static gleichzeitig
  glitchOverlay.style.display = fxOn ? "block" : "none";
  staticOverlay.style.display = fxOn ? "block" : "none";

  if (fxOn) {
    // reset falls flicker gerade "aus" war
    staticOverlay.style.opacity = String(STATIC_OPACITY);

    // Waves
    schedLeftHot.start();  schedRightHot.start();
    schedLeftDim.start();  schedRightDim.start();

    // Flicker
    startStaticFlicker();
  } else {
    // Waves aus
    schedLeftHot.stop();   schedRightHot.stop();
    schedLeftDim.stop();   schedRightDim.stop();
    clearAllFX(document.getElementById("left"));
    clearAllFX(document.getElementById("right"));

    // Flicker aus + reset
    stopStaticFlicker();
    staticOverlay.style.opacity = String(STATIC_OPACITY);
  }
}

function toggleFX(){ setFX(!fxOn); }

// EIN einziger Keydown-Listener
document.addEventListener("keydown", (e) => {
  const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
  if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;

  const k = e.key.toLowerCase();
  if (k === " " || k === "enter" || k === "a") {
    e.preventDefault();
    toggleFX();
  }
});

// Mausclick toggelt ebenfalls FX
document.addEventListener("mousedown", (e) => {
  // optional: keine UI-Elemente triggern
  const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
  if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;

  toggleFX();
});

setFX(true);
