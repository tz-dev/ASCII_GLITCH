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
<pre id="left">
YOUR ASCII ART
</pre>

<pre id="right">
MORE ASCII ART
</pre>
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

### Glitch Overlay

Random glitch artifacts simulating corrupted video frames.

### Static Noise

Low-opacity analog noise with occasional flicker drops.

### Scanline Sync Loss

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

## Initial State

`DEFAULT_STATE`

Controls which effects start enabled.

Example:

```
master
glitch
static
scan
fx4
fx5
fx6
fps
```

---

## Color Profiles

`PROFILES`

Defines available terminal color palettes.

Default:

```
gray
red
green
blue
```

---

## Static Noise

`STATIC_TUNABLES`

Controls noise opacity and flicker behavior.

Parameters include:

```
opacity
nextTickMin / nextTickMax
flickerChance
offForMin / offForMax
```

---

## Scanline Sync Loss

`SCAN_TUNABLES`

Controls signal instability.

Includes:

```
shift frequency
shift distance
shift duration
freeze probability
number of affected lines
```

---

## Line Distortion

`FX4` tunables control:

```
band size
distortion amplitude
relaxation speed
event frequency
```

---

## Character Activity

`FX5_TUNABLES`

Controls hot/dim behavior.

Parameters include:

```
spawn rate
segment length
lifetime
fade in/out
hot probability
space skip probability
```

---

## Signal Motion

`FX6_TUNABLES`

Controls orbital movement.

Parameters include:

```
radius range
speed range
drift intensity
drift smoothing
micro jitter
vertical scaling
```

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
