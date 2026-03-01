# ASCII_GLITCH

A real-time ASCII terminal display that simulates unstable signal reception — glitch bursts, VHS noise, sync loss, flicker, frozen frames and drifting signal blocks.

Whatever you place inside the `<pre>` blocks becomes a **received signal** rendered through a simulated unstable terminal.

---

**Live demo**

[ASCII_GLITCH – Web Demo](https://tz-dev.github.io/ASCII_GLITCH/index.html)

---

# Usage

Open **index.html** and replace the ASCII inside:

```html
<pre id="left"  aria-hidden="true" style="position:absolute; left:-9999px; top:-9999px; white-space:pre;">YOUR ASCII ART HERE</pre>
<pre id="right" aria-hidden="true" style="position:absolute; left:-9999px; top:-9999px; white-space:pre;">YOUR ASCII ART HERE</pre>
```

The renderer converts the content into a **canvas-based ASCII terminal** and applies all signal effects in real time.

Best results with **monospaced ASCII art**.

---

# Controls

## Master — Toggle everything

| Key        |
| ---------- |
| ENTER      |
| SPACE      |
| A          |
| LEFT CLICK |

---

## Individual Effects

| Key   | Effect                                |
| ----- | ------------------------------------- |
| 0     | FPS counter on/off                    |
| 1     | Glitch overlay on/off                 |
| 2     | Static noise on/off                   |
| 3     | Scanlines + sync loss + freeze frames |
| 4     | Line distortion waves                 |
| 5     | Character hot/dim activity            |
| 6     | Signal drift / orbit motion           |
| + / - | Cycle color profiles                  |

Available profiles:

```
gray → red → green → blue
```

---

# Effects Overview

### Glitch Overlay (FX1)

Random glitch artifacts simulating corrupted video frames.

### Static Noise (FX2)

Low-opacity analog noise with occasional flicker drops.

### Scanline Sync Loss (FX3)

Simulates unstable signal reception:

* horizontal row shifts
* occasional signal freeze
* irregular sync timing

### Line Distortion (FX4)

Random horizontal bands stretch vertically and relax back to normal.

### Character Activity (FX5)

Random character segments temporarily change intensity:

* **hot** → brighter signal spikes
* **dim** → darker signal dips

All transitions are smooth and animated.

### Signal Motion (FX6)

The entire signal drifts in a subtle orbital movement with slow random drift.

---

# Configuration

All tunable parameters are located at the **top of the main script** inside the `CONFIG` section.

You can modify behavior without touching the effect implementations.

---

# Performance Notes

* The renderer uses **canvas + row caching** for speed.
* Very large ASCII blocks may still reduce frame rate.
* With all effects enabled large signals typically run around **~50–60 FPS** on modern hardware.

---

# ASCII Sources

Some good sources for ASCII art:

[https://www.asciiart.eu/](https://www.asciiart.eu/)  
[https://www.textart.sh/](https://www.textart.sh/)  
[https://emojicombos.com/ascii-art](https://emojicombos.com/ascii-art)  
[https://patorjk.com/software/taag/](https://patorjk.com/software/taag/)  
[https://www.asciiartarchive.com/](https://www.asciiartarchive.com/)  

Tip: **use spaces instead of tabs**.

---

# License

Free for use by everyone.

Personal and commercial use allowed.
