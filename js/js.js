/* =========================
   ASCII_GLITCH — Canvas Core (Stable 1–3 + +/-) + HUD/FPS
   - Canvas text renderer (left/right)
   - Keeps existing GIF overlays (glitch.gif / static.gif) + VHS overlay div
   - Toggle controls (default: ACTIVE)
     0 = FPS counter on/off
     1 = Glitch overlay on/off
     2 = Static overlay on/off (with flicker)
     3 = Scanlines + sync-loss row shift + 1–2 frame freeze on/off
     4 = (placeholder) Effect 4 on/off
     5 = FX5 Segment Hot/Dim overlay (atlas-blit; fast/stable)
     6 = (placeholder) Effect 6 on/off
     +/- = Cycle text color profiles (gray -> red -> green -> blue)
     A / Space / Enter / Mouse click = Master toggle (all ON/OFF)
   - HUD: shows controls + current state for 2s, then fades out (1s)
   ========================= */

/* =========================
   CONFIG
   ========================= */

// ---- Color profiles ----
const PROFILES = ["gray", "red", "green", "blue"];

// ---- Initial ON/OFF state ----
const DEFAULT_STATE = {
  master: true,
  glitch: true,        // 1  (ON)
  statik: true,        // 2  (ON)
  scan: true,          // 3  (ON)
  fx4: true,           // 4  (ON)
  fx5: true,           // 5  (ON)
  fx6: false,          // 6  (OFF)
  fps: false,          // 0
  profileIndex: 0
};

// ---- Canvas metrics (match your vibe) ----
const METRICS = {
  fontSizePx: 9,         // fixed for now; can be auto-fit later
  lineHeight: 1.2,       // from your CSS
  paddingPx: 0,          // inner padding
  splitGapPx: 0          // optional gap between columns
};

// ---- Static overlay flicker ----
const STATIC_TUNABLES = {
  opacity: 0.05,
  nextTickMin: 6000,
  nextTickMax: 18000,
  flickerChance: 0.22,
  offForMin: 70,
  offForMax: 120
};

// ---- Scan sync-loss row shift + 1–2 frame freeze ----
const SCAN_TUNABLES = {
  nextTickMin: 280,
  nextTickMax: 900,
  initialDelayMin: 250,
  initialDelayMax: 850,
  freezeChance: 0.14,
  shiftChance: 0.78,
  shiftLineCountMin: 2,
  shiftLineCountMax: 10,
  shiftDurationMin: 70,
  shiftDurationMax: 190,
  shiftMaxPxMin: 14,
  shiftMaxPxMax: 46,
  shiftMinPx: 5
};

// ---- FX5: Segment Hot/Dim overlay (atlas-blit; fast) ----
const FX5_TUNABLES = {
  maxActivePerSide: 40,
  segLenMin: 5,
  segLenMax: 20,
  spawnPerSecLeft: 40,
  spawnPerSecRight: 40,
  hotChance: 0.48,
  lifeMin: 1.5,
  lifeMax: 2.50,
  fadeIn: 0.5,
  fadeOut: 0.5,
  skipSpaceProb: 0.65
};

// ---- FX6: Block Orbit Motion ----
const FX6_TUNABLES = {
  radiusMin: 6,
  radiusMax: 24,
  speedMin: 0.03,
  speedMax: 0.12,
  driftPerSec: 10,
  driftSmooth: 0.08,
  microJitter: 0.6,
  yScale: 0.75
};

// FX5 atlas row padding (prevents half-line cropping)
const FX5_ROW_PAD_TOP = 2;     // CSS px
const FX5_ROW_PAD_BOTTOM = 2;  // CSS px

/* =========================
   DOM refs
   ========================= */

const container     = document.getElementById("container");
const glitchOverlay = document.getElementById("glitchOverlay");
const staticOverlay = document.getElementById("staticOverlay");
const vhsOverlay    = document.querySelector(".vhs-overlay");
const canvas        = document.getElementById("term");
const ctx           = canvas.getContext("2d", { alpha: true });

// NEW: hidden <pre> sources
const preLeft       = document.getElementById("left");
const preRight      = document.getElementById("right");
// optional helper (falls du es nutzt)
const preSourceText = document.getElementById("sourceText");

/* =========================
   State
   ========================= */

const state = { ...DEFAULT_STATE };

/* =========================
   Text sources
   ========================= */

// NEW: read from <pre id="left/right">
function readPreText(el, fallback = "") {
  if (!el) return fallback;
  // textContent keeps whitespace reliably for <pre>
  return String(el.textContent ?? fallback);
}

let leftText  = readPreText(preLeft, "");
let rightText = readPreText(preRight, "");

// optional helper: keep #sourceText in sync for copy/paste
function syncSourceText() {
  if (!preSourceText) return;
  preSourceText.textContent =
    `--- LEFT ---\n${leftText}\n\n--- RIGHT ---\n${rightText}\n`;
}
syncSourceText();

/* =========================
   Utilities
   ========================= */

function randInt(n) { return (Math.random() * n) | 0; }
function randBetween(a, b) { return a + Math.random() * (b - a); }

function isTypingTarget(e) {
  const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
  return (tag === "input" || tag === "textarea" || e.target.isContentEditable);
}

function splitLines(s) {
  return String(s ?? "").replace(/\r\n/g, "\n").split("\n");
}

function getCSSVar(name, fallback) {
  const v = getComputedStyle(document.body).getPropertyValue(name).trim();
  return v || fallback;
}

function applyColorProfile() {
  const b = document.body;
  b.classList.remove("profile-gray", "profile-red", "profile-green", "profile-blue");

  // IMPORTANT: trim() prevents "red " / accidental whitespace bugs
  const name = String(PROFILES[state.profileIndex] || "gray").trim().toLowerCase();
  b.classList.add(`profile-${name}`);
}

function cycleProfile(dir) {
  const n = PROFILES.length;
  state.profileIndex = (state.profileIndex + dir + n) % n;

  applyColorProfile();
  rebuildFx5Atlases(); // keep FX5 atlas colors in sync with profile vars
  requestRender();
  showHUD();
}

/* =========================
   HUD + FPS
   ========================= */

const hud = (() => {
  const el = document.createElement("div");
  el.id = "asciiHud";
  el.setAttribute("aria-hidden", "true");
  el.style.position = "fixed";
  el.style.left = "12px";
  el.style.bottom = "12px";
  el.style.zIndex = "10000";
  el.style.pointerEvents = "none";
  el.style.whiteSpace = "pre";
  el.style.fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';
  el.style.fontSize = "12px";
  el.style.lineHeight = "1.2";
  el.style.color = "#e6e6e6";
  el.style.background = "rgba(0,0,0,0.55)";
  el.style.border = "1px solid rgba(255,255,255,0.12)";
  el.style.borderRadius = "8px";
  el.style.padding = "10px 12px";
  el.style.boxShadow = "0 10px 22px rgba(0,0,0,0.35)";
  el.style.opacity = "0";
  el.style.transform = "translateY(4px)";
  el.style.transition = "opacity 1000ms linear, transform 1000ms ease";
  el.style.display = "none";

  const fpsEl = document.createElement("div");
  fpsEl.id = "asciiFps";
  fpsEl.setAttribute("aria-hidden", "true");
  fpsEl.style.position = "fixed";
  fpsEl.style.right = "12px";
  fpsEl.style.top = "12px";
  fpsEl.style.zIndex = "10001";
  fpsEl.style.pointerEvents = "none";
  fpsEl.style.whiteSpace = "pre";
  fpsEl.style.fontFamily = el.style.fontFamily;
  fpsEl.style.fontSize = "12px";
  fpsEl.style.lineHeight = "1.2";
  fpsEl.style.color = "#e6e6e6";
  fpsEl.style.background = "rgba(0,0,0,0.55)";
  fpsEl.style.border = "1px solid rgba(255,255,255,0.12)";
  fpsEl.style.borderRadius = "8px";
  fpsEl.style.padding = "6px 10px";
  fpsEl.style.boxShadow = "0 10px 22px rgba(0,0,0,0.35)";
  fpsEl.style.display = "none";

  document.body.appendChild(el);
  document.body.appendChild(fpsEl);

  let hideTimer = null;
  let fadeTimer = null;

  function stateText() {
    const prof = String(PROFILES[state.profileIndex] || "gray").trim();
    const onOff = (v) => (v ? "ON " : "OFF");

    return [
  `MASTER     : ${onOff(state.master)}   PROFILE   : ${prof.toUpperCase()}  FPS    : ${onOff(state.fps)}`,
  ``,
  `1 Glitch   : ${onOff(state.glitch)}   2 Static  : ${onOff(state.statik)}   3 Scan : ${onOff(state.scan)}`,
  `4 LineDist : ${onOff(state.fx4)}   5 Hot/Dim : ${onOff(state.fx5)}   6 Move : ${onOff(state.fx6)}`,
  ``,
  `Controls`,
  ` 0        FPS counter`,
  ` 1..6     Toggle effects`,
  ` +/-      Color profile`,
  ` A/Space  Master toggle`,
  ` Click    Master toggle`
    ].join("\n");
  }

  function show() {
    el.textContent = stateText();

    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    if (fadeTimer) { clearTimeout(fadeTimer); fadeTimer = null; }

    el.style.display = "block";
    // eslint-disable-next-line no-unused-expressions
    el.offsetHeight;

    el.style.opacity = "1";
    el.style.transform = "translateY(0px)";

    fadeTimer = setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(4px)";
    }, 2000);

    hideTimer = setTimeout(() => {
      el.style.display = "none";
    }, 3000);
  }

  function setFpsVisible(v) { fpsEl.style.display = v ? "block" : "none"; }
  function setFpsValue(value) { fpsEl.textContent = `FPS: ${value}`; }

  return { show, setFpsVisible, setFpsValue };
})();

function showHUD() { hud.show(); }

/* =========================
   FX4 — Row Swell Band
   ========================= */

const FX4 = (() => {
  let running = false;

  const T = {
    nextMin: 150,
    nextMax: 300,
    bandMin: 4,
    bandMax: 14,
    ampMin: 0.2,
    ampMax: 0.5,
    holdMin: 125,
    holdMax: 250,
    relaxPerSec: 3.2
  };

  let nextAt = 0;
  let rowScale = new Float32Array(0);

  function onGridChanged(lineCount) {
    rowScale = new Float32Array(lineCount);
    rowScale.fill(1);
  }

  function start() {
    if (running) return;
    running = true;

    const lines = model.left.grid?.lines ?? 0;
    if (!rowScale.length && lines) onGridChanged(lines);

    nextAt = performance.now() + randBetween(T.nextMin, T.nextMax);
  }

  function stop() {
    running = false;
    if (rowScale.length) rowScale.fill(1);
    requestRender();
  }

  function emit(now) {
    const lines = rowScale.length;
    if (!lines) return;

    const band = T.bandMin + randInt(T.bandMax - T.bandMin + 1);

    // FIX: allow start at row 0
    const maxStart = Math.max(0, lines - band);
    const startRow = randInt(maxStart + 1);

    const amp = randBetween(T.ampMin, T.ampMax);

    for (let i = 0; i < band; i++) {
      const y = startRow + i;
      if (y < 0 || y >= lines) continue;

      const t = (band <= 1) ? 0 : (i / (band - 1));
      const w = Math.sin(t * Math.PI);
      const s = 1 + amp * w;
      if (s > rowScale[y]) rowScale[y] = s;
    }

    requestRender();
  }

  function update(now, dt) {
    if (!running) return;

    if (now >= nextAt) {
      emit(now);
      nextAt = now + randBetween(T.nextMin, T.nextMax);
    }

    const k = Math.min(1, T.relaxPerSec * dt);
    let changed = false;

    for (let y = 0; y < rowScale.length; y++) {
      const s = rowScale[y];
      if (s !== 1) {
        const ns = s + (1 - s) * k;
        const fin = (Math.abs(ns - 1) < 0.001) ? 1 : ns;
        if (fin !== s) {
          rowScale[y] = fin;
          changed = true;
        }
      }
    }

    if (changed) requestRender();
  }

  function getRowScale(y) {
    if (!running) return 1;
    const v = rowScale[y] ?? 1;
    return (v > 0 ? v : 1);
  }

  function render() {}

  return {
    start, stop, update, render,
    getRowScale,
    onGridChanged,
    get running() { return running; }
  };
})();

/* =========================
   FX5 — Segment Hot/Dim overlay (atlas-blit)
   ========================= */

const fx5Atlas = {
  dpr: 1,
  left:  { hot: null, dim: null, w: 0, h: 0 },
  right: { hot: null, dim: null, w: 0, h: 0 }
};

function createOffscreenCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  return c;
}

function rebuildFx5Atlases() {
  if (!model.left.grid || !layout.charW || !layout.linePx) return;

  const hotColor = getCSSVar("--text-hot", "#eaf6ff");
  const dimColor = getCSSVar("--text-dim", "#5e6670");

  const lines = model.left.grid.lines;
  const cols = model.left.grid.cols;

  const dpr = layout.dpr || 1;
  fx5Atlas.dpr = dpr;

  // Extra vertical padding so row crops include full glyph height
  const padTop = FX5_ROW_PAD_TOP;
  const padBottom = FX5_ROW_PAD_BOTTOM;

  const wCss = Math.ceil(cols * layout.charW + 2);
  const hCss = Math.ceil(lines * layout.linePx + padTop + padBottom + 2);

  fx5Atlas.left.w = wCss;
  fx5Atlas.left.h = hCss;
  fx5Atlas.right.w = wCss;
  fx5Atlas.right.h = hCss;

  fx5Atlas.left.hot  = createOffscreenCanvas(Math.floor(wCss * dpr), Math.floor(hCss * dpr));
  fx5Atlas.left.dim  = createOffscreenCanvas(Math.floor(wCss * dpr), Math.floor(hCss * dpr));
  fx5Atlas.right.hot = createOffscreenCanvas(Math.floor(wCss * dpr), Math.floor(hCss * dpr));
  fx5Atlas.right.dim = createOffscreenCanvas(Math.floor(wCss * dpr), Math.floor(hCss * dpr));

  const font = `${METRICS.fontSizePx}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;

  function paint(sideKey, targetCanvas, color) {
    const cctx = targetCanvas.getContext("2d", { alpha: true });
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cctx.clearRect(0, 0, wCss, hCss);
    cctx.textBaseline = "top";
    cctx.font = font;
    cctx.fillStyle = color;
    cctx.imageSmoothingEnabled = false;

    const rows = rowCache[sideKey].rows;

    // draw rows with top padding
    for (let y = 0; y < lines; y++) {
      const s = rows[y] ?? "";
      cctx.fillText(s, 0, padTop + y * layout.linePx);
    }
  }

  paint("left",  fx5Atlas.left.hot,  hotColor);
  paint("left",  fx5Atlas.left.dim,  dimColor);
  paint("right", fx5Atlas.right.hot, hotColor);
  paint("right", fx5Atlas.right.dim, dimColor);
}

const FX5 = (() => {
  let running = false;

  const segs = { left: [], right: [] };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function clearAll() {
    segs.left.length = 0;
    segs.right.length = 0;
    requestRender();
  }

  function start() {
    if (running) return;
    running = true;
    clearAll();
  }

  function stop() {
    running = false;
    clearAll();
  }

  function onGridChanged() {
    clearAll();
    rebuildFx5Atlases();
  }

  function maybeSpawnForSide(sideKey, dt) {
    const grid = model[sideKey]?.grid;
    if (!grid) return;

    const lines = grid.lines;
    const cols  = grid.cols;
    if (!lines || !cols) return;

    const rows = rowCache[sideKey].rows;
    if (!rows || !rows.length) return;

    const perSec = (sideKey === "left") ? FX5_TUNABLES.spawnPerSecLeft : FX5_TUNABLES.spawnPerSecRight;

    const expected = perSec * dt;
    let n = (expected | 0);
    if (Math.random() < (expected - n)) n++;

    const list = segs[sideKey];
    const cap = FX5_TUNABLES.maxActivePerSide;
    if (list.length >= cap) return;

    const now = performance.now() / 1000;

    for (let i = 0; i < n && list.length < cap; i++) {
      const y = randInt(lines);
      const rowStr = rows[y] ?? "";
      if (!rowStr) continue;

      const len = FX5_TUNABLES.segLenMin + randInt(FX5_TUNABLES.segLenMax - FX5_TUNABLES.segLenMin + 1);
      const maxStart = Math.max(0, cols - len);
      const x0 = randInt(maxStart + 1);

      if (FX5_TUNABLES.skipSpaceProb > 0) {
        let spaceHits = 0;
        const samples = 4;
        for (let s = 0; s < samples; s++) {
          const x = x0 + randInt(Math.max(1, len));
          const ch = rowStr[x] ?? " ";
          if (ch === " ") spaceHits++;
        }
        if (spaceHits >= 3 && Math.random() < FX5_TUNABLES.skipSpaceProb) continue;
      }

      const hot = (Math.random() < FX5_TUNABLES.hotChance);
      const life = randBetween(FX5_TUNABLES.lifeMin, FX5_TUNABLES.lifeMax);

      list.push({ y, x0, len, hot, t0: now, t1: now + life });
    }

    if (n > 0) requestRender();
  }

  function update(nowMs, dt) {
    if (!running) return;

    maybeSpawnForSide("left", dt);
    maybeSpawnForSide("right", dt);

    const now = nowMs / 1000;
    let changed = false;

    for (const sideKey of ["left", "right"]) {
      const list = segs[sideKey];
      for (let i = list.length - 1; i >= 0; i--) {
        if (now >= list[i].t1) {
          list.splice(i, 1);
          changed = true;
        }
      }
    }

    if (changed) requestRender();
  }

  function alphaFor(seg, nowSec) {
    const fadeIn = FX5_TUNABLES.fadeIn;
    const fadeOut = FX5_TUNABLES.fadeOut;

    const age = nowSec - seg.t0;
    const left = seg.t1 - nowSec;

    let aIn = 1;
    if (fadeIn > 0) aIn = clamp(age / fadeIn, 0, 1);

    let aOut = 1;
    if (fadeOut > 0) aOut = clamp(left / fadeOut, 0, 1);

    const a = aIn * aOut;
    return a * a;
  }

  function render(ctx, { xLeft, xRight, yTop, yLeftDy = 0, yRightDy = 0 } = {}) {
    if (!running) return;
    if (!fx5Atlas.left.hot || !fx5Atlas.right.hot) return;

    const leftOrigin  = (xLeft  ?? layout.inset);
    const rightOrigin = (xRight ?? (layout.colW + METRICS.splitGapPx + layout.inset));

    const nowSec = performance.now() / 1000;

    const padTop = FX5_ROW_PAD_TOP;
    const padBottom = FX5_ROW_PAD_BOTTOM;
    const rowBandH = layout.linePx + padTop + padBottom;

    // How hard "dim" should push down (tweak if desired)
    const dimDarkenAlpha = 0.75; // dark rect alpha under dim segments

    ctx.save();
    ctx.textBaseline = "top";
    ctx.imageSmoothingEnabled = false;

    for (const sideKey of ["left", "right"]) {
      const grid = model[sideKey].grid;
      if (!grid) continue;

      const lines = grid.lines;
      const cols  = grid.cols;

      const originX = (sideKey === "left") ? leftOrigin : rightOrigin;
      const list = segs[sideKey];
      if (!list.length) continue;

      const atlasHot = (sideKey === "left") ? fx5Atlas.left.hot : fx5Atlas.right.hot;
      const atlasDim = (sideKey === "left") ? fx5Atlas.left.dim : fx5Atlas.right.dim;

      for (let i = 0; i < list.length; i++) {
        const seg = list[i];
        const y = seg.y;
        if (y < 0 || y >= lines) continue;

        const a = alphaFor(seg, nowSec);
        if (a <= 0.001) continue;

        const x0 = clamp(seg.x0, 0, cols);
        const len = clamp(seg.len, 0, cols - x0);
        if (len <= 0) continue;

        const shift = (state.scan && scanFx.active)
          ? (sideKey === "left" ? scanFx.leftShiftX[y] : scanFx.rightShiftX[y])
          : 0;

        // Source rect in CSS pixels (note: atlas has padTop)
        const sxCss = x0 * layout.charW;
        const syCss = y * layout.linePx;          // band starts at row top (before pad)
        const swCss = len * layout.charW;
        const shCss = rowBandH;

        // Convert to atlas pixel coords (DPR)
        const dpr = fx5Atlas.dpr || 1;
        const sx = Math.floor(sxCss * dpr);
        const sy = Math.floor(syCss * dpr);
        const sw = Math.max(1, Math.floor(swCss * dpr));
        const sh = Math.max(1, Math.floor(shCss * dpr));

        // Destination: shift up by padTop so glyph aligns exactly with base text
        const dx = originX + shift + sxCss;
        const sideDy = (sideKey === "left") ? yLeftDy : yRightDy;
        const dy = yTop + sideDy + y * layout.linePx - padTop;

        ctx.globalAlpha = a;

        if (!seg.hot) {
          // Make dim actually visible: darken underneath first
          ctx.save();
          ctx.globalAlpha = a * dimDarkenAlpha;
          ctx.fillStyle = "#000";
          ctx.fillRect(dx, dy, swCss, shCss);
          ctx.restore();
          ctx.globalAlpha = a;
        }

        ctx.drawImage(seg.hot ? atlasHot : atlasDim, sx, sy, sw, sh, dx, dy, swCss, shCss);
      }
    }

    ctx.restore();
  }

  return {
    start, stop, update, render,
    onGridChanged,
    get running() { return running; }
  };
})();

/* =========================
   FX6 — Block Orbit Motion
   ========================= */

const FX6 = (() => {
  let running = false;

  let phase = 0;
  let radius = 14;
  let speed = 0.06;

  let driftTX = 0, driftTY = 0;
  let driftX  = 0, driftY  = 0;

  function reseed() {
    radius = randBetween(FX6_TUNABLES.radiusMin, FX6_TUNABLES.radiusMax);
    speed  = randBetween(FX6_TUNABLES.speedMin,  FX6_TUNABLES.speedMax);
  }

  function start() {
    if (running) return;
    running = true;
    reseed();
    phase = Math.random() * Math.PI * 2;

    driftTX = driftX = 0;
    driftTY = driftY = 0;

    requestRender();
  }

  function stop() {
    running = false;
    driftTX = driftX = 0;
    driftTY = driftY = 0;
    requestRender();
  }

  function update(nowMs, dt) {
    if (!running) return;

    phase += (Math.PI * 2) * speed * dt;
    if (phase > Math.PI * 2) phase -= Math.PI * 2;

    driftTX += randBetween(-1, 1) * FX6_TUNABLES.driftPerSec * dt;
    driftTY += randBetween(-1, 1) * FX6_TUNABLES.driftPerSec * dt;

    const clampMax = radius * 1.25;
    driftTX = Math.max(-clampMax, Math.min(clampMax, driftTX));
    driftTY = Math.max(-clampMax, Math.min(clampMax, driftTY));

    const k = 1 - Math.pow(1 - FX6_TUNABLES.driftSmooth, Math.max(1, dt * 60));
    driftX += (driftTX - driftX) * k;
    driftY += (driftTY - driftY) * k;

    requestRender();
  }

  function getOffset(sideKey) {
    if (!running) return { dx: 0, dy: 0 };

    const dir = (sideKey === "left") ? 1 : -1;

    const ox = Math.cos(phase * dir) * radius;
    const oy = Math.sin(phase * dir) * radius * FX6_TUNABLES.yScale;

    const jx = randBetween(-FX6_TUNABLES.microJitter, FX6_TUNABLES.microJitter);
    const jy = randBetween(-FX6_TUNABLES.microJitter, FX6_TUNABLES.microJitter);

    return { dx: ox + driftX + jx, dy: oy + driftY + jy };
  }

  function render() {}

  return {
    start, stop, update, render,
    getOffset,
    get running() { return running; }
  };
})();

/* =========================
   Renderer model (grids)
   ========================= */

function computeMaxLinesAndCols(leftLines, rightLines) {
  const lines = Math.max(leftLines.length, rightLines.length);
  let maxCols = 0;
  for (const l of leftLines)  maxCols = Math.max(maxCols, l.length);
  for (const r of rightLines) maxCols = Math.max(maxCols, r.length);
  return { lines, maxCols };
}

function buildGrid(linesArr, lines, cols) {
  const size = lines * cols;
  const chars = new Uint16Array(size);
  chars.fill(32);

  for (let y = 0; y < lines; y++) {
    const s = linesArr[y] ?? "";
    const L = Math.min(cols, s.length);
    for (let x = 0; x < L; x++) chars[y * cols + x] = s.charCodeAt(x);
  }
  return { lines, cols, chars };
}

const model = {
  left:  { grid: null },
  right: { grid: null }
};

/* =========================
   Row string cache
   ========================= */

const rowCache = {
  left:  { lines: 0, cols: 0, rows: [] },
  right: { lines: 0, cols: 0, rows: [] }
};

function rebuildRowCacheFor(sideKey) {
  const grid = model[sideKey].grid;
  const lines = grid.lines;
  const cols  = grid.cols;
  const chars = grid.chars;

  const rows = new Array(lines);

  for (let y = 0; y < lines; y++) {
    const off = y * cols;
    let s = "";
    for (let x = 0; x < cols; x++) s += String.fromCharCode(chars[off + x]);
    rows[y] = s;
  }

  rowCache[sideKey].lines = lines;
  rowCache[sideKey].cols  = cols;
  rowCache[sideKey].rows  = rows;
}

/* =========================
   Layout / sizing
   ========================= */

const layout = {
  dpr: 1,
  widthCss: 0,
  heightCss: 0,
  colW: 0,
  inset: 0,
  charW: 0,
  linePx: 0
};

function rebuildModelFromText() {
  const leftLines  = splitLines(leftText);
  const rightLines = splitLines(rightText);
  const { lines, maxCols } = computeMaxLinesAndCols(leftLines, rightLines);

  model.left.grid  = buildGrid(leftLines,  lines, maxCols);
  model.right.grid = buildGrid(rightLines, lines, maxCols);

  rebuildRowCacheFor("left");
  rebuildRowCacheFor("right");

  initScanArrays();

  FX4.onGridChanged?.(lines);
  FX5.onGridChanged?.();

  // FX5 atlas depends on rowCache + layout; will be rebuilt after resizeToFit() too
}

function resizeToFit() {
  const rect = container.getBoundingClientRect();
  layout.widthCss = rect.width;
  layout.colW = rect.width / 2;
  layout.inset = METRICS.paddingPx;

  layout.dpr = Math.max(1, window.devicePixelRatio || 1);

  if (!model.left.grid || !model.right.grid) rebuildModelFromText();

  const lines = model.left.grid.lines;
  layout.linePx = METRICS.fontSizePx * METRICS.lineHeight;
  layout.heightCss = Math.ceil(lines * layout.linePx) + METRICS.paddingPx * 2;

  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${layout.heightCss}px`;

  canvas.width  = Math.floor(rect.width * layout.dpr);
  canvas.height = Math.floor(layout.heightCss * layout.dpr);

  ctx.setTransform(layout.dpr, 0, 0, layout.dpr, 0, 0);
  ctx.textBaseline = "top";
  ctx.imageSmoothingEnabled = false;

  ctx.font = `${METRICS.fontSizePx}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`;
  layout.charW = ctx.measureText("M").width;

  rebuildFx5Atlases();
  requestRender();
}

/* =========================
   Static Flicker
   ========================= */

const staticFx = { nextAt: 0, offUntil: 0 };

function resetStaticFlicker(now) {
  staticFx.nextAt = now + randBetween(STATIC_TUNABLES.nextTickMin, STATIC_TUNABLES.nextTickMax);
  staticFx.offUntil = 0;
}

function updateStaticFlicker(now) {
  if (!state.master || !state.statik) return;

  const target = STATIC_TUNABLES.opacity;

  if (staticFx.offUntil > now) {
    staticOverlay.style.opacity = "0";
    return;
  }

  staticOverlay.style.opacity = String(target);

  if (now >= staticFx.nextAt) {
    staticFx.nextAt = now + randBetween(STATIC_TUNABLES.nextTickMin, STATIC_TUNABLES.nextTickMax);

    if (Math.random() < STATIC_TUNABLES.flickerChance) {
      const offFor = randBetween(STATIC_TUNABLES.offForMin, STATIC_TUNABLES.offForMax);
      staticFx.offUntil = now + offFor;
      requestRender();
    }
  }
}

/* =========================
   ScanFX: row shift + freeze
   ========================= */

const scanFx = {
  active: false,
  nextAt: 0,
  freezeFrames: 0,
  leftShiftX: null,
  rightShiftX: null,
  leftUntil: null,
  rightUntil: null
};

function initScanArrays() {
  if (!model.left.grid) return;
  const lines = model.left.grid.lines;

  scanFx.leftShiftX  = new Float32Array(lines);
  scanFx.rightShiftX = new Float32Array(lines);
  scanFx.leftUntil   = new Float64Array(lines);
  scanFx.rightUntil  = new Float64Array(lines);

  scanFx.leftShiftX.fill(0);
  scanFx.rightShiftX.fill(0);
  scanFx.leftUntil.fill(0);
  scanFx.rightUntil.fill(0);
}

function resetScanFX(now) {
  scanFx.active = true;
  scanFx.freezeFrames = 0;

  if (!scanFx.leftShiftX) initScanArrays();

  scanFx.leftShiftX.fill(0);
  scanFx.rightShiftX.fill(0);
  scanFx.leftUntil.fill(0);
  scanFx.rightUntil.fill(0);

  scanFx.nextAt = now + randBetween(SCAN_TUNABLES.initialDelayMin, SCAN_TUNABLES.initialDelayMax);
}

function stopScanFX() {
  scanFx.active = false;
  scanFx.freezeFrames = 0;

  if (scanFx.leftShiftX) scanFx.leftShiftX.fill(0);
  if (scanFx.rightShiftX) scanFx.rightShiftX.fill(0);
  if (scanFx.leftUntil) scanFx.leftUntil.fill(0);
  if (scanFx.rightUntil) scanFx.rightUntil.fill(0);
}

function updateScanFX(now) {
  if (!scanFx.active || !state.master || !state.scan) return;

  const lines = model.left.grid.lines;

  // expire shifts (slightly less noisy)
  let expired = false;
  for (let i = 0; i < lines; i++) {
    if (scanFx.leftUntil[i] && now >= scanFx.leftUntil[i]) {
      scanFx.leftUntil[i] = 0;
      scanFx.leftShiftX[i] = 0;
      expired = true;
    }
    if (scanFx.rightUntil[i] && now >= scanFx.rightUntil[i]) {
      scanFx.rightUntil[i] = 0;
      scanFx.rightShiftX[i] = 0;
      expired = true;
    }
  }
  if (expired) requestRender();

  if (now < scanFx.nextAt) return;

  scanFx.nextAt = now + randBetween(SCAN_TUNABLES.nextTickMin, SCAN_TUNABLES.nextTickMax);

  const r = Math.random();

  if (r < SCAN_TUNABLES.freezeChance) {
    scanFx.freezeFrames = 1 + randInt(2);
  }

  if (r < SCAN_TUNABLES.shiftChance) {
    const count = SCAN_TUNABLES.shiftLineCountMin
      + randInt(SCAN_TUNABLES.shiftLineCountMax - SCAN_TUNABLES.shiftLineCountMin + 1);

    const duration = randBetween(SCAN_TUNABLES.shiftDurationMin, SCAN_TUNABLES.shiftDurationMax);
    const maxShift = randBetween(SCAN_TUNABLES.shiftMaxPxMin, SCAN_TUNABLES.shiftMaxPxMax);

    for (let n = 0; n < count; n++) {
      const row = randInt(lines);
      const dx = (Math.random() < 0.5 ? -1 : 1) * randBetween(SCAN_TUNABLES.shiftMinPx, maxShift);

      const mode = randInt(3); // 0=left, 1=right, 2=both
      if (mode === 0 || mode === 2) {
        scanFx.leftShiftX[row] = dx;
        scanFx.leftUntil[row] = now + duration;
      }
      if (mode === 1 || mode === 2) {
        scanFx.rightShiftX[row] = -dx;
        scanFx.rightUntil[row] = now + duration;
      }
    }

    requestRender();
  }
}

/* =========================
   Rendering
   ========================= */

let needsRender = true;
function requestRender() { needsRender = true; }

function drawBaseText(sideKey, baseColor, xOrigin, yOrigin) {
  const grid = model[sideKey].grid;
  const lines = grid.lines;
  const rows = rowCache[sideKey].rows;

  ctx.fillStyle = baseColor;

  for (let y = 0; y < lines; y++) {
    const s = rows[y] ?? "";

    const shift = (state.scan && scanFx.active)
      ? (sideKey === "left" ? scanFx.leftShiftX[y] : scanFx.rightShiftX[y])
      : 0;

    const rowScale = (state.fx4 && FX4.getRowScale) ? FX4.getRowScale(y) : 1;

    if (rowScale !== 1) {
      ctx.save();
      ctx.translate(xOrigin + shift, yOrigin + y * layout.linePx);
      ctx.scale(1, rowScale);
      ctx.fillText(s, 0, 0);
      ctx.restore();
    } else {
      ctx.fillText(s, xOrigin + shift, yOrigin + y * layout.linePx);
    }
  }
}

function draw() {
  needsRender = false;

  ctx.clearRect(0, 0, layout.widthCss, layout.heightCss);
  if (!state.master) return;

  const baseColor = getCSSVar("--text-base", "#8f98a1");

  let xLeft  = layout.inset;
  let xRight = layout.colW + METRICS.splitGapPx + layout.inset;
  let yTop   = layout.inset;

  let yLeftDy = 0;
  let yRightDy = 0;

  if (state.fx6 && FX6.getOffset) {
    const oL = FX6.getOffset("left");
    const oR = FX6.getOffset("right");
    xLeft  += oL.dx;
    xRight += oR.dx;
    yLeftDy  = oL.dy;
    yRightDy = oR.dy;
  }

  drawBaseText("left",  baseColor, xLeft,  yTop + yLeftDy);
  drawBaseText("right", baseColor, xRight, yTop + yRightDy);

  if (state.fx5) FX5.render(ctx, {
    xLeft, xRight,
    yTop,
    yLeftDy, yRightDy
  });
}

/* =========================
   Master apply
   ========================= */

function applyAll() {
  document.body.classList.toggle("scan-on", state.master && state.scan);

  document.body.classList.toggle("glitch-on", state.master && state.glitch);
  document.body.classList.toggle("static-on", state.master && state.statik);

  glitchOverlay.style.display = (state.master && state.glitch) ? "block" : "none";
  staticOverlay.style.display = (state.master && state.statik) ? "block" : "none";
  vhsOverlay.style.visibility = (state.master && state.scan) ? "visible" : "hidden";

  if (!state.master || !state.statik) staticOverlay.style.opacity = "0";

  const now = performance.now();
  if (state.master && state.scan) resetScanFX(now);
  else stopScanFX();

  resetStaticFlicker(now);

  hud.setFpsVisible(state.master && state.fps);

  if (state.master && state.fx4) FX4.start(); else FX4.stop();
  if (state.master && state.fx5) FX5.start(); else FX5.stop();
  if (state.master && state.fx6) FX6.start(); else FX6.stop();

  applyColorProfile();
  rebuildFx5Atlases(); // keep atlas colors synced
  requestRender();
  showHUD();
}

/* =========================
   Toggles
   ========================= */

function toggleMaster() { state.master = !state.master; applyAll(); }

function toggleFPS() {
  state.fps = !state.fps;
  hud.setFpsVisible(state.master && state.fps);
  showHUD();
}

function toggleGlitch() { state.glitch = !state.glitch; applyAll(); }
function toggleStatic() { state.statik = !state.statik; applyAll(); }
function toggleScan()   { state.scan   = !state.scan;   applyAll(); }

function toggleFX4() { state.fx4 = !state.fx4; applyAll(); }
function toggleFX5() { state.fx5 = !state.fx5; applyAll(); }
function toggleFX6() { state.fx6 = !state.fx6; applyAll(); }

/* =========================
   Input handling
   ========================= */

document.addEventListener("keydown", (e) => {
  if (isTypingTarget(e)) return;

  const k = e.key.toLowerCase();

  if (k === " " || k === "enter" || k === "a") {
    e.preventDefault();
    toggleMaster();
    return;
  }

  if (k === "0") { toggleFPS(); return; }
  if (k === "1") { toggleGlitch(); return; }
  if (k === "2") { toggleStatic(); return; }
  if (k === "3") { toggleScan();   return; }
  if (k === "4") { toggleFX4(); return; }
  if (k === "5") { toggleFX5(); return; }
  if (k === "6") { toggleFX6(); return; }

  if (k === "+" || e.key === "=") { cycleProfile(+1); return; }
  if (k === "-" || e.key === "_") { cycleProfile(-1); return; }
});

document.addEventListener("mousedown", (e) => {
  if (isTypingTarget(e)) return;
  toggleMaster();
});

document.addEventListener("dragstart", (e) => e.preventDefault());

/* =========================
   Main loop + FPS calc
   ========================= */

let lastT = performance.now();

const fpsCalc = { accT: 0, accF: 0, shownFps: 0 };

function updateFPS(dt) {
  if (!state.master || !state.fps) return;

  fpsCalc.accT += dt;
  fpsCalc.accF += 1;

  if (fpsCalc.accT >= 0.25) {
    const fps = Math.round(fpsCalc.accF / fpsCalc.accT);
    fpsCalc.accT = 0;
    fpsCalc.accF = 0;

    if (fps !== fpsCalc.shownFps) {
      fpsCalc.shownFps = fps;
      hud.setFpsValue(String(fps).padStart(2, " "));
    }
  }
}

function loop(t) {
  const now = t;
  const dt = Math.min(0.05, (t - lastT) / 1000);
  lastT = t;

  if (state.master && state.scan && scanFx.active && scanFx.freezeFrames > 0) {
    scanFx.freezeFrames--;
    updateFPS(dt);
    requestAnimationFrame(loop);
    return;
  }

  if (state.master && state.scan) updateScanFX(now);
  if (state.master && state.statik) updateStaticFlicker(now);

  if (state.master && state.fx4) FX4.update(now, dt);
  if (state.master && state.fx5) FX5.update(now, dt);
  if (state.master && state.fx6) FX6.update(now, dt);

  if (needsRender) draw();

  updateFPS(dt);
  requestAnimationFrame(loop);
}

/* =========================
   Init
   ========================= */

rebuildModelFromText();
applyAll();
resizeToFit();
window.addEventListener("resize", resizeToFit);
requestAnimationFrame(loop);

/* =========================
   Optional API hooks
   ========================= */

function setLeftText(s)  {
  leftText = String(s ?? "");
  if (preLeft) preLeft.textContent = leftText;
  syncSourceText();
  rebuildModelFromText();
  resizeToFit();
  requestRender();
}

function setRightText(s) {
  rightText = String(s ?? "");
  if (preRight) preRight.textContent = rightText;
  syncSourceText();
  rebuildModelFromText();
  resizeToFit();
  requestRender();
}

window.ASCII_GLITCH = {
  state,
  setLeftText,
  setRightText,
  requestRender,
  showHUD
};