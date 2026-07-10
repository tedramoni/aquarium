# aquarium

A little bioluminescent-abyss love scene: two glowing jellyfish, **Eva** (pink)
and **Ted** (blue), drift through a deep-sea aquarium. It's a single static page —
no build step, no framework.

## Run it

Just open `index.html` in a browser. For the background music to play reliably,
serve it over HTTP instead of `file://`:

```sh
python -m http.server 8000
# then open http://localhost:8000
```

## Features

- Two autonomous jellyfish you can drag; guide them together and they bloom into a heart.
- Bioluminescent abyss: drifting plankton, glow blobs, light rays, and a soft grain.
- A wandering anglerfish and a little red octopus in the background.
- Tap the water to release rising hearts; a reactive cursor glow the plankton drift toward.
- A shy "notice" moment when the jellyfish pass close.
- A "together for N days" counter (set the date in `script.js` → `TOGETHER_SINCE`).
- Optional ambient music toggle (see below).

## Music

The 🔇 button plays `assets/music.mp3` (looped, gentle fade). That file is **not**
committed — add your own, using a track you're allowed to publish. See
[`assets/README.md`](assets/README.md) for licensing notes and free sources.
