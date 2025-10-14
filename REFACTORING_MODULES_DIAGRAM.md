# Proposed Module Structure

## Current Structure (Large Files)

```
scripts/
├── ui/
│   └── render-to-dom.js (445 lines) ⚠️
│       ├── Board rendering
│       ├── Menu system
│       ├── Selection management
│       ├── Keyboard handlers
│       ├── Color management
│       ├── Zoom management
│       └── Board sizing controls
│
├── board-items/
│   └── sticky.js (253 lines) ⚠️
│       ├── Sticky rendering
│       ├── DOM creation
│       ├── Text fitting
│       ├── Event handlers
│       └── Styling
│
├── board/
│   └── board.js (156 lines)
│       ├── Board state management
│       ├── CRUD operations
│       └── Geometry utilities
│
└── network/
    └── network-firestore.js (128 lines)
        ├── Firestore integration
        ├── State sync
        └── Utilities
```

## Proposed Structure (Smaller Modules)

```
scripts/
├── ui/
│   ├── render-to-dom.js (120 lines) ✓ [Main coordinator]
│   ├── selection.js (40 lines) ✓ [NEW]
│   │   └── Selection class
│   ├── menu.js (120 lines) ✓ [NEW]
│   │   ├── Menu items config
│   │   └── Menu rendering
│   ├── keyboard-handlers.js (40 lines) ✓ [NEW]
│   │   └── All keyboard shortcuts
│   ├── color-management.js (50 lines) ✓ [NEW]
│   │   ├── Color palette
│   │   └── Color cycling logic
│   ├── zoom.js (30 lines) ✓ [NEW]
│   │   ├── Zoom scales
│   │   └── Zoom logic
│   ├── board-size-controls.js (45 lines) ✓ [NEW]
│   │   └── Board sizing UI
│   └── buffered-observer.js (38 lines)
│
├── board-items/
│   ├── sticky.js (80 lines) ✓ [Main coordinator]
│   ├── sticky-dom.js (40 lines) ✓ [NEW]
│   │   └── DOM creation
│   ├── sticky-events.js (80 lines) ✓ [NEW]
│   │   └── All event handlers
│   ├── sticky-styling.js (25 lines) ✓ [NEW]
│   │   └── Style application
│   └── text-fitting.js (30 lines) ✓ [NEW]
│       └── Text sizing algorithm
│
├── board/
│   ├── board.js (136 lines) ✓
│   ├── local-datastore.js (85 lines)
│   └── geometry.js (20 lines) ✓ [NEW]
│       ├── snapDimension()
│       └── snapLocation()
│
└── network/
    ├── network-firestore.js (108 lines) ✓
    ├── network-stubs.js (46 lines)
    └── utils.js (20 lines) ✓ [NEW]
        ├── clone()
        └── doBatched()
```

## Module Dependencies (After Refactoring)

```
render-to-dom.js
├── imports: selection.js
├── imports: menu.js
├── imports: keyboard-handlers.js
├── imports: color-management.js
├── imports: zoom.js
├── imports: board-size-controls.js
├── imports: sticky.js (createRenderer)
└── imports: app-state.js

sticky.js
├── imports: sticky-dom.js
├── imports: sticky-events.js
├── imports: sticky-styling.js
├── imports: text-fitting.js
└── exports: createRenderer(), STICKY_TYPE, DEFAULT_STICKY_COLOR

menu.js
├── imports: color-management.js
├── imports: zoom.js
└── imports: board-size-controls.js

keyboard-handlers.js
├── imports: color-management.js
├── imports: zoom.js
└── requires: board, selectedStickies, appState

board.js
├── imports: geometry.js
└── requires: store (LocalDatastore or FirestoreStore)

network-firestore.js
└── imports: utils.js
```

## Size Comparison

### Before Refactoring
```
render-to-dom.js:       445 lines ████████████████████████████
sticky.js:              253 lines ████████████████
board.js:               156 lines █████████
network-firestore.js:   128 lines ████████
                        ─────────
Total:                  982 lines
```

### After Refactoring
```
Main files:             444 lines ████████████████
New focused modules:    538 lines ██████████████████████
                        ─────────
Total:                  982 lines (same LOC, better organized)
```

## Benefits Breakdown

### 📊 Complexity Reduction
- **render-to-dom.js**: 445 → 120 lines (73% reduction)
- **sticky.js**: 253 → 80 lines (68% reduction)

### ✅ Testability
- 11 new modules that can be unit tested independently
- Easier to mock dependencies
- Clearer test boundaries

### 🔧 Maintainability
- Each module has a single, clear purpose
- Bug fixes are easier to scope
- New features have obvious homes

### 🚀 Reusability
- Selection logic can be used elsewhere
- Color management can support themes
- Geometry utilities can be expanded
- Text fitting can be improved independently

### 📖 Readability
- Files under 120 lines are easier to understand
- Clear separation of concerns
- Better code navigation

## Implementation Checklist

### Phase 1: Low-Hanging Fruit ✓
- [ ] Extract `scripts/ui/zoom.js`
- [ ] Extract `scripts/ui/color-management.js`
- [ ] Extract `scripts/board/geometry.js`
- [ ] Extract `scripts/network/utils.js`
- [ ] Extract `scripts/board-items/text-fitting.js`
- [ ] Run tests

### Phase 2: Self-Contained Components ✓
- [ ] Extract `scripts/ui/selection.js`
- [ ] Extract `scripts/board-items/sticky-dom.js`
- [ ] Extract `scripts/board-items/sticky-styling.js`
- [ ] Run tests

### Phase 3: Complex Coordinators ✓
- [ ] Extract `scripts/ui/menu.js`
- [ ] Extract `scripts/ui/keyboard-handlers.js`
- [ ] Extract `scripts/ui/board-size-controls.js`
- [ ] Extract `scripts/board-items/sticky-events.js`
- [ ] Run tests

### Phase 4: Integration ✓
- [ ] Update `scripts/ui/render-to-dom.js`
- [ ] Update `scripts/board-items/sticky.js`
- [ ] Update `scripts/board/board.js`
- [ ] Update `scripts/network/network-firestore.js`
- [ ] Run full test suite
- [ ] Verify code coverage

---

**Total New Files**: 11 modules
**Files Modified**: 4 main files
**Expected Time**: 2-4 hours for complete refactoring
**Risk Level**: Low (if done incrementally with tests)
