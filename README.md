# Put It Up

A collaborative digital whiteboard — built with vanilla JavaScript, Firebase, and zero frontend frameworks.

![Board interface with sticky notes, images, and connectors](https://github.com/arienkock/put-it-up/raw/main/screenshot.png)

## What Is This?

**Put It Up** is a proof-of-concept for a real-time collaborative sticky board. You can place notes, images, and draw arrows between them on an infinite canvas. Multiple users can work on the same board simultaneously via Firebase Firestore, or you can run it entirely offline using LocalStorage.

The goal was to explore how far vanilla JS + a plugin architecture can take you — no React, no Vue, no Angular. Just ES6 modules, SVG, and careful state management.

---

## Features

- **Sticky notes** — create, move, resize, recolor, and edit inline
- **Images** — upload and position images on the canvas
- **Connectors** — draw arrows between items (drag or click-to-click)
- **Infinite canvas** — pan and zoom freely; minimap for orientation
- **Real-time collaboration** — live sync via Firebase Firestore
- **Offline mode** — works without a network via LocalStorage (`?offline=true`)
- **Plugin architecture** — new item types drop in via a consistent interface
- **State machine internals** — connector interactions and keyboard handling modeled as explicit state machines

---

## Quick Start

```bash
npm install
npm run serve
# Open http://localhost:9000
```

From the landing page you can create a new board or browse existing ones.

### URL Parameters

| Parameter | Effect |
|-----------|--------|
| `?boardName=MyBoard` | Open a specific board by name |
| `?offline=true` | Use LocalStorage instead of Firebase |
| `?debug=true` | Log state transitions to the console |

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| UI | Vanilla JS (ES6 modules) + HTML/CSS |
| Graphics | SVG (connectors/arrows) |
| Backend | Firebase Firestore + Auth |
| Testing | Jest + Playwright (E2E) |
| Transpilation | Babel |

No frontend framework. ~9,600 lines of JavaScript across 46 files.

---

## Architecture Highlights

### Plugin System

Item types (Sticky, Image) are registered plugins. Each plugin implements a shared interface:

```
createItem() / deleteItem() / moveItem() / resizeItem()
```

The app state initializes dynamically based on registered plugins, making it straightforward to add new item types without touching core logic.

### Dual Storage

The same board code runs against two backends:
- **Firebase Firestore** — real-time listeners, multi-user, authenticated
- **LocalDatastore + LocalStorage** — fully offline, no config needed

### State Machines

Complex interactions are modeled as explicit state machines. The connector system has five states:

```
IDLE → DRAGGING_NEW → (connected)
     → CLICK_TO_CLICK_WAITING → (connected)
DRAGGING_HANDLE / DRAGGING_DISCONNECTED
```

Keyboard handling follows the same pattern. This makes edge cases (half-drawn connectors, interrupted drags) predictable and testable.

### Rendering

A `BufferedObserver` batches rapid state changes into single `requestAnimationFrame` render passes, keeping DOM updates efficient without a virtual DOM.

---

## Testing

```bash
npm test                    # Unit tests (Jest)
npm run test:coverage       # Coverage report
npx playwright test         # E2E tests
```

The test suite covers board operations, plugin behavior, state machine transitions, and full user flows via Playwright.

---

## Project Structure

```
put-it-up/
├── index.html              # Landing page
├── board.html              # Main board view
├── list.html               # Boards listing
├── scripts/
│   ├── app-state.js        # Global state, plugin-aware
│   ├── board/              # Board facade, datastores
│   ├── board-items/        # Plugin registry, connector system
│   │   └── plugins/
│   │       ├── sticky/     # Sticky note plugin
│   │       └── image/      # Image plugin
│   ├── network/            # Firestore integration
│   ├── ui/                 # Rendering, drag, zoom, minimap, menus
│   └── config/             # Firebase config
└── styles/
    └── global.css
```

---

## Status

This is a **proof of concept** — functional and reasonably well-tested, but not production-hardened. Firebase credentials are baked into the config for demo purposes. If you want to run your own instance, swap in your Firebase project in `scripts/config/firebase-config.js`.
