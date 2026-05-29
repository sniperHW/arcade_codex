# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser-based arcade game launcher built with TypeScript and Vite. Loads arcade ROM ZIPs, runs them via a locally hosted EmulatorJS runtime (no CDN), and renders in an 800x600 screen. Supports keyboard, gamepad, and mobile touch controls.

## Commands

```bash
./start.sh                  # Install deps if needed, then start dev server on 0.0.0.0:5173
npm run dev -- --port 5173  # Dev server (127.0.0.1 only)
npm run build               # TypeScript check + Vite production build → dist/
npm run preview             # Preview production build locally
```

No test runner or linter is configured.

## Architecture

Single-page app with no framework — all UI is built in `src/main.ts` via DOM manipulation.

- **`src/main.ts`** — Entry point and entire application logic: ROM list loading, game booting, EmulatorJS configuration, gamepad bridge, mobile virtual controls
- **`src/styles.css`** — All styling, including responsive desktop layout and `body.is-mobile-browser` mode that overlays a GameBoy-style device skin with positioned touch controls
- **`index.html`** — Minimal shell, just mounts `#app` and loads `src/main.ts`
- **`public/roms.json`** — Array of ROM IDs available in the dropdown (whitelist)
- **`public/emulatorjs-data/`** — Local EmulatorJS runtime: `loader.js`, `emulator.min.js`, core WASM files in `cores/runtime/`

### Key concepts

**ROM whitelist system**: `public/roms.json` lists which ROM ZIPs exist. `ROM_OVERRIDES` in `src/main.ts` maps ROM IDs to titles, cores, and `playable` status. Only entries with `playable: true` appear in the dropdown. BIOS files (neogeo, pgm) are loaded as dependencies, not shown as games.

**Supported cores**: `fbneo`, `mame2003`, `mame2003_plus` — each has WASM runtime files in `public/emulatorjs-data/cores/runtime/`.

**Game boot flow**: User selects ROM → `bootGame()` sets `window.EJS_*` config globals → loads core runtime script → injects `loader.js` which initializes EmulatorJS. If the emulator was already loaded (hot-swap scenario), the page reloads via `sessionStorage` pending-boot key.

**Gamepad bridge**: EmulatorJS doesn't auto-detect browser gamepads reliably. `installGamepadBridge()` runs on `EJS_ready`, polls via `setInterval(500ms)`, and manually populates the emulator's gamepad selection dropdowns.

**Mobile controls**: `isMobileBrowser()` detects touch devices and adds `is-mobile-browser` class. Virtual D-pad and action buttons use pointer events to call `EJS_emulator.gameManager.simulateInput()`. The UI is hidden on mobile (`EJS_hideSettings`, CSS overrides for `.ejs_*` elements).

## Adding a new ROM

1. Place the `.zip` file in `roms/`
2. Add the ROM ID to `public/roms.json`
3. Add an entry to `ROM_OVERRIDES` in `src/main.ts` with `playable: true`, the correct `core`, and optional `parent`/`bios` dependencies
