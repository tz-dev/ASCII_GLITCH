/* =========================
   ASCII_GLITCH — Script
   Controls (default: ACTIVE)
   1 = Glitch overlay on/off
   2 = Static overlay on/off
   3 = Scanlines + moving row FX on/off
   4 = Character hot/dim waves on/off
   5 = Floating blocks on/off
   +/- = Cycle text color profiles (gray -> red -> green -> blue)
   A / Space / Enter / Mouse click = Master toggle (all ON/OFF)
   ========================= */

/* =========================
   CONFIG (move all tunables here)
   - Adjust frequencies, ranges, intensities in one place.
   - All times are in milliseconds unless noted.
   ========================= */

// ---- Color profiles ----
const PROFILES = ["gray", "red", "green", "blue"];

// ---- Initial ON/OFF state ----
const DEFAULT_STATE = {
  master: true,        // Master ON/OFF (A/Space/Enter/Click)
  glitch: true,        // 1
  statik: true,        // 2
  scan: true,          // 3 (scanlines + moving row overlay)
  chfx: true,          // 4 (hot/dim waves)
  float: true,         // 5 (floating blocks)
  profileIndex: 0      // +/- cycles [gray, red, green, blue]
};

// ---- Character waves (hot/dim) ----
// Line band selection + per-line highlight parameters.
const WAVE_TUNABLES = {
  leftHot: {
    bandMinLines: 4, bandMaxLines: 10,
    perLineMin: 6,  perLineMax: 16,
    holdMin: 520,   holdMax: 1250,
    radiusMin: 10,  radiusMax: 28
  },
  rightHot: {
    bandMinLines: 3, bandMaxLines: 9,
    perLineMin: 5,  perLineMax: 14,
    holdMin: 600,   holdMax: 1450,
    radiusMin: 12,  radiusMax: 32
  },
  leftDim: {
    bandMinLines: 5, bandMaxLines: 12,
    perLineMin: 8,  perLineMax: 22,
    holdMin: 800,   holdMax: 2200,
    radiusMin: 14,  radiusMax: 40
  },
  rightDim: {
    bandMinLines: 4, bandMaxLines: 11,
    perLineMin: 7,  perLineMax: 20,
    holdMin: 900,   holdMax: 2400,
    radiusMin: 16,  radiusMax: 44
  }
};

// How often new waves are emitted (min/max interval between ticks).
const WAVE_SCHEDULE = {
  leftHot:  { intervalMin: 420, intervalMax: 920  },
  rightHot: { intervalMin: 520, intervalMax: 1200 },
  leftDim:  { intervalMin: 650, intervalMax: 1500 },
  rightDim: { intervalMin: 780, intervalMax: 1800 }
};

// ---- Static overlay flicker ----
const STATIC_TUNABLES = {
  opacity: 0.05,            // Baseline static opacity while enabled
  nextTickMin: 6000,        // How often we consider flicker events
  nextTickMax: 18000,
  flickerChance: 0.22,      // Probability to briefly drop static to 0
  offForMin: 70,            // How long static stays off during a flicker
  offForMax: 120
};

// ---- Scanline "Sync-Loss" row shift + 1–2 frame freeze ----
const SCAN_TUNABLES = {
  nextTickMin: 900,         // Time between scan FX "ticks"
  nextTickMax: 2600,
  initialDelayMin: 1200,    // First tick delay (prevents immediate effect)
  initialDelayMax: 3200,
  freezeChance: 0.08,       // Probability to freeze the container for 1–2 frames
  shiftChance: 0.35,        // Probability to shift random lines on a tick
  shiftLineCountMin: 1,     // Number of lines shifted per event
  shiftLineCountMax: 5,
  shiftDurationMin: 50,     // How long shifted lines stay shifted
  shiftDurationMax: 110,
  shiftMaxPxMin: 10,        // Max horizontal shift range (randomized per event)
  shiftMaxPxMax: 28,
  shiftMinPx: 3             // Minimum horizontal shift magnitude
};

// =========================
// Core
// =========================

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

const leftPre  = document.getElementById("left");
const rightPre = document.getElementById("right");
const leftLines  = wrapLinesAndChars(leftPre);
const rightLines = wrapLinesAndChars(rightPre);

function randInt(n) { return (Math.random() * n) | 0; }
function randBetween(a, b) { return a + Math.random() * (b - a); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// =========================
// Character waves (hot/dim)
// =========================

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

const schedLeftHot  = scheduleWaves(
  sparkWave, leftLines,  WAVE_TUNABLES.leftHot,
  WAVE_SCHEDULE.leftHot.intervalMin,  WAVE_SCHEDULE.leftHot.intervalMax
);
const schedRightHot = scheduleWaves(
  sparkWave, rightLines, WAVE_TUNABLES.rightHot,
  WAVE_SCHEDULE.rightHot.intervalMin, WAVE_SCHEDULE.rightHot.intervalMax
);
const schedLeftDim  = scheduleWaves(
  dimWave,   leftLines,  WAVE_TUNABLES.leftDim,
  WAVE_SCHEDULE.leftDim.intervalMin,  WAVE_SCHEDULE.leftDim.intervalMax
);
const schedRightDim = scheduleWaves(
  dimWave,   rightLines, WAVE_TUNABLES.rightDim,
  WAVE_SCHEDULE.rightDim.intervalMin, WAVE_SCHEDULE.rightDim.intervalMax
);

// =========================
// DOM refs
// =========================

const container     = document.getElementById("container");
const glitchOverlay = document.getElementById("glitchOverlay");
const staticOverlay = document.getElementById("staticOverlay");

// =========================
// State
// =========================

const state = {
  master: DEFAULT_STATE.master,
  glitch: DEFAULT_STATE.glitch,
  statik: DEFAULT_STATE.statik,
  scan: DEFAULT_STATE.scan,
  chfx: DEFAULT_STATE.chfx,
  float: DEFAULT_STATE.float,
  profileIndex: DEFAULT_STATE.profileIndex
};

// =========================
// Helpers
// =========================

function clearAllFX(root) {
  const els = root.querySelectorAll(".ch.hot, .ch.dim");
  els.forEach(el => el.classList.remove("hot", "dim"));
}

function applyColorProfile() {
  const b = document.body;
  b.classList.remove("profile-gray", "profile-red", "profile-green", "profile-blue");
  const name = PROFILES[state.profileIndex] || "gray";
  b.classList.add(`profile-${name}`);
}

// =========================
// Static flicker (only while static is ON and master is ON)
// =========================

const STATIC_OPACITY = STATIC_TUNABLES.opacity;
let staticFlickerTimer = null;

function stopStaticFlicker() {
  if (staticFlickerTimer) {
    clearTimeout(staticFlickerTimer);
    staticFlickerTimer = null;
  }
}

function startStaticFlicker() {
  stopStaticFlicker();

  function tick() {
    if (!state.master || !state.statik) return;

    const nextIn = randBetween(STATIC_TUNABLES.nextTickMin, STATIC_TUNABLES.nextTickMax);
    staticFlickerTimer = setTimeout(() => {
      if (!state.master || !state.statik) return;

      if (Math.random() < STATIC_TUNABLES.flickerChance) {
        const offFor = randBetween(STATIC_TUNABLES.offForMin, STATIC_TUNABLES.offForMax);
        staticOverlay.style.opacity = "0";
        setTimeout(() => {
          if (state.master && state.statik) staticOverlay.style.opacity = String(STATIC_OPACITY);
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

// =========================
// Scanline "Sync-Loss" row shift + 1–2 frame freeze
// - Runs only when scan is ON + master is ON
// - Shifts random full lines horizontally for a very short time
// - Occasionally freezes the whole container for 1–2 frames
// =========================

let scanFxTimer = null;
let scanFxActive = false;

function stopScanFX() {
  scanFxActive = false;
  if (scanFxTimer) {
    clearTimeout(scanFxTimer);
    scanFxTimer = null;
  }

  // Reset any shifted lines
  [...leftLines, ...rightLines].forEach(line => {
    line.style.transform = "";
    line.style.filter = "";
    line.style.opacity = "";
  });

  // Reset container freeze
  container.style.transform = "";
  container.style.filter = "";
}

async function doFreezeFrames() {
  // Freeze for 1–2 frames by forcing the container to a stable state
  const frames = 1 + randInt(2);

  const oldTransform = container.style.transform;
  const oldFilter = container.style.filter;

  container.style.transform = "translate3d(0,0,0)";
  container.style.filter = "contrast(1.03)";

  // Wait N animation frames
  for (let i = 0; i < frames; i++) {
    await new Promise(r => requestAnimationFrame(() => r()));
  }

  container.style.transform = oldTransform;
  container.style.filter = oldFilter;
}

function shiftRandomLines() {
  // Choose how many lines to shift (rare + small)
  const count = SCAN_TUNABLES.shiftLineCountMin
    + randInt(SCAN_TUNABLES.shiftLineCountMax - SCAN_TUNABLES.shiftLineCountMin + 1);

  const duration = randBetween(SCAN_TUNABLES.shiftDurationMin, SCAN_TUNABLES.shiftDurationMax);
  const maxShift = randBetween(SCAN_TUNABLES.shiftMaxPxMin, SCAN_TUNABLES.shiftMaxPxMax);

  const all = [...leftLines, ...rightLines];
  const picked = [];

  for (let i = 0; i < count; i++) {
    const line = all[randInt(all.length)];
    if (!line || picked.includes(line)) continue;
    picked.push(line);

    const dx = (Math.random() < 0.5 ? -1 : 1) * randBetween(SCAN_TUNABLES.shiftMinPx, maxShift);
    line.style.transform = `translate3d(${dx}px, 0, 0)`;
    line.style.filter = "blur(0.2px)";
    line.style.opacity = "0.98";
  }

  setTimeout(() => {
    picked.forEach(line => {
      line.style.transform = "";
      line.style.filter = "";
      line.style.opacity = "";
    });
  }, duration);
}

function startScanFX() {
  stopScanFX();
  scanFxActive = true;

  function tick() {
    if (!scanFxActive || !state.master || !state.scan) return;

    // Decide what happens this tick
    const r = Math.random();

    // Very rare freeze (1–2 frames)
    if (r < SCAN_TUNABLES.freezeChance) {
      doFreezeFrames().catch(() => {});
    }

    // Rare line shifts (sync-loss)
    if (r < SCAN_TUNABLES.shiftChance) {
      shiftRandomLines();
    }

    // Schedule next tick (rare)
    const nextIn = randBetween(SCAN_TUNABLES.nextTickMin, SCAN_TUNABLES.nextTickMax);
    scanFxTimer = setTimeout(tick, nextIn);
  }

  // Initial delay to avoid immediate effect
  scanFxTimer = setTimeout(
    tick,
    randBetween(SCAN_TUNABLES.initialDelayMin, SCAN_TUNABLES.initialDelayMax)
  );
}

// =========================
// Master apply
// =========================

function applyAll() {
  // Scanlines overlay (CSS uses body.scan-on)
  document.body.classList.toggle("scan-on", state.master && state.scan);

  // Float animation (CSS uses .float-on on container)
  container.classList.toggle("float-on", state.master && state.float);

  // Character FX class gate (CSS uses body.chfx-off)
  document.body.classList.toggle("chfx-off", !(state.master && state.chfx));

  // Glitch/static visibility (still use inline display for simplicity)
  glitchOverlay.style.display = (state.master && state.glitch) ? "block" : "none";
  staticOverlay.style.display = (state.master && state.statik) ? "block" : "none";

  // Keep static opacity in a sane state
  staticOverlay.style.opacity = String(STATIC_OPACITY);

  // Start/stop character waves
  if (state.master && state.chfx) {
    schedLeftHot.start();  schedRightHot.start();
    schedLeftDim.start();  schedRightDim.start();
  } else {
    schedLeftHot.stop();   schedRightHot.stop();
    schedLeftDim.stop();   schedRightDim.stop();
    clearAllFX(leftPre);
    clearAllFX(rightPre);
  }

  // Start/stop static flicker
  if (state.master && state.statik) startStaticFlicker();
  else stopStaticFlicker();

  // Start/stop scan FX (sync-loss + freeze)
  if (state.master && state.scan) startScanFX();
  else stopScanFX();

  // Ensure profile class exists
  applyColorProfile();
}

// =========================
// Toggles
// =========================

function toggleMaster() {
  state.master = !state.master;
  applyAll();
}

function toggleGlitch() { state.glitch = !state.glitch; applyAll(); }
function toggleStatic() { state.statik = !state.statik; applyAll(); }
function toggleScan()   { state.scan = !state.scan;     applyAll(); }
function toggleChFX()   { state.chfx = !state.chfx;     applyAll(); }
function toggleFloat()  { state.float = !state.float;   applyAll(); }

function cycleProfile(dir) {
  const n = PROFILES.length;
  state.profileIndex = (state.profileIndex + dir + n) % n;
  applyColorProfile();
}

// =========================
// Input handling
// =========================

function isTypingTarget(e) {
  const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
  return (tag === "input" || tag === "textarea" || e.target.isContentEditable);
}

document.addEventListener("keydown", (e) => {
  if (isTypingTarget(e)) return;

  const k = e.key.toLowerCase();

  // Master toggle
  if (k === " " || k === "enter" || k === "a") {
    e.preventDefault();
    toggleMaster();
    return;
  }

  // Numeric feature toggles
  if (k === "1") { toggleGlitch(); return; }
  if (k === "2") { toggleStatic(); return; }
  if (k === "3") { toggleScan();   return; }
  if (k === "4") { toggleChFX();   return; }
  if (k === "5") { toggleFloat();  return; }

  // Profile cycle
  if (k === "+" || e.key === "=") { cycleProfile(+1); return; }
  if (k === "-" || e.key === "_") { cycleProfile(-1); return; }
});

// Mouse click toggles master
document.addEventListener("mousedown", (e) => {
  if (isTypingTarget(e)) return;
  toggleMaster();
});

// Also prevent drag selection as an extra guard
document.addEventListener("dragstart", (e) => e.preventDefault());

// =========================
// Init (default ACTIVE)
// =========================

// Apply deterministic startup state from DEFAULT_STATE
applyAll();
