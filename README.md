# ASCII_GLITCH

A real-time ASCII terminal display that simulates unstable signal reception — glitch bursts, VHS noise, sync loss, flicker and frozen frames.

Whatever you place inside the `<pre>` blocks becomes a “received signal”.

---

[ASCII_GLITCH – Web Demo](https://tz-dev.github.io/ASCII_GLITCH/index.html)

---

## Usage

Open **index.html** and replace the ASCII inside:

```html
<pre id="left">
YOUR ASCII ART
</pre>

<pre id="right">
MORE ASCII ART
</pre>
````

The animation automatically applies to every character.

Best results with monospaced ASCII.

---

## Controls

### Master — Toggle general FX on/off

* ENTER
* SPACE
* A
* LEFT CLICK

### Individual Effects

| Key   | Effect                                           |
| ----- | ------------------------------------------------ |
| 1     | Glitch overlay on/off                            |
| 2     | Static noise on/off                              |
| 3     | Scanlines + sync loss movement on/off            |
| 4     | Character activity (bright/dim waves) on/off     |
| 5     | Pre block floating movement on/off               |
| + / - | Cycle color profiles (gray → red → green → blue) |

---

## Configuration

All tunable parameters (frequencies, ranges, intensities) are grouped at the **top of the main script** inside a dedicated **`CONFIG`** section.

This lets you tweak the “signal behavior” without digging through effect logic.

### What you can tune

**Initial toggles**

* `DEFAULT_STATE` controls which effects start enabled (master/glitch/static/scan/character FX/float + default color profile).

**Color profiles**

* `PROFILES` defines available theme profiles (default: `gray`, `red`, `green`, `blue`).
* Use `+ / -` to cycle them during runtime.

**Character waves (hot/dim)**

* `WAVE_TUNABLES` defines per-side behavior (left/right, hot/dim):

  * Line band size (`bandMinLines`, `bandMaxLines`)
  * Activity density per line (`perLineMin`, `perLineMax`)
  * How long chars stay hot/dim (`holdMin`, `holdMax`)
  * Horizontal spread around a random center (`radiusMin`, `radiusMax`)
* `WAVE_SCHEDULE` controls how often new waves are emitted (`intervalMin`, `intervalMax`).

**Static flicker**

* `STATIC_TUNABLES` controls static opacity and flicker timing:

  * Base opacity (`opacity`)
  * Tick interval (`nextTickMin/Max`)
  * Flicker probability (`flickerChance`)
  * Flicker off duration (`offForMin/Max`)

**Scanline / sync-loss**

* `SCAN_TUNABLES` controls the “sync loss” line shift + rare freeze frames:

  * Tick interval + initial delay
  * Freeze probability (`freezeChance`)
  * Shift probability (`shiftChance`)
  * How many lines shift, duration, and px range

> Tip: Start by adjusting *intervals* and *probabilities* first (feel), then shift/hold/radius (look).

---

## ASCII Sources

* [https://www.asciiart.eu/](https://www.asciiart.eu/)
* [https://www.textart.sh/](https://www.textart.sh/)
* [https://emojicombos.com/ascii-art](https://emojicombos.com/ascii-art)
* [https://patorjk.com/software/taag/](https://patorjk.com/software/taag/)
* [https://www.asciiartarchive.com/](https://www.asciiartarchive.com/)

Tip: use spaces instead of tabs.

---

## Notes

* Large ASCII may impact performance
* Intended for fullscreen viewing
* Dark background recommended

---

## License

Free for use by everyone (personal & commercial).
