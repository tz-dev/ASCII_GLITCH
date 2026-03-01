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
  lineHeight: 0.575,     // from your CSS
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

/* =========================
   State
   ========================= */

const state = { ...DEFAULT_STATE };

/* =========================
   Text sources
   ========================= */


let leftText  = `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\n`;
let rightText = `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\n`;
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
  const name = PROFILES[state.profileIndex] || "gray";
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
    const prof = PROFILES[state.profileIndex] || "gray";
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

function setLeftText(s)  { leftText = String(s ?? "");  rebuildModelFromText(); resizeToFit(); requestRender(); }
function setRightText(s) { rightText = String(s ?? ""); rebuildModelFromText(); resizeToFit(); requestRender(); }

window.ASCII_GLITCH = {
  state,
  setLeftText,
  setRightText,
  requestRender,
  showHUD
};