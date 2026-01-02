# Liquid Light Show

**[Live Demo](https://danielcarmingham.github.io/LiquidLightShow/)**

![Liquid Light Show Preview](samples/preview.gif)

A web-based recreation of [1970s psychedelic liquid light shows](./liquid-lightshow-description.md) — those mesmerizing concert visuals created with overhead projectors, colored oils, and glass dishes.

This app simulates swirling, iridescent fluid patterns using GPU-accelerated fluid dynamics and thin-film interference shaders, with optional audio reactivity via your microphone.

## Controls

| Input | Action |
|-------|--------|
| Mouse/Touch | Swirl the liquid |
| 1-9 | Switch color palette |
| Space | Toggle auto-animation |
| M | Toggle microphone reactivity |
| +/- | Adjust speed |
| R | Reset simulation |
| F | Fullscreen |
| H | Show/hide help |

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

Open http://localhost:5173 in your browser.

## Tech Stack

- **Three.js** — WebGL rendering and shader management
- **GLSL** — Custom shaders for fluid simulation and iridescence
- **TypeScript** — Type-safe application code
- **Vite** — Fast dev server and build tool
- **Web Audio API** — Microphone input and FFT analysis
