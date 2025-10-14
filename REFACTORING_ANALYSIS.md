# Large File Refactoring Analysis

## Executive Summary

This document identifies large files in the codebase and provides specific recommendations for extracting functionality into smaller, more maintainable modules.

## Large Files Identified

### File Size Analysis
```
  735 lines - test/ui.spec.js (test file)
  445 lines - scripts/ui/render-to-dom.js ⚠️ HIGH PRIORITY
  329 lines - test/board.spec.js (test file)
  253 lines - scripts/board-items/sticky.js ⚠️ MEDIUM PRIORITY
  188 lines - jest.config.js (config file)
  156 lines - scripts/board/board.js ⚠️ LOWER PRIORITY
  128 lines - scripts/network/network-firestore.js ⚠️ LOWER PRIORITY
```

---

## 1. scripts/ui/render-to-dom.js (445 lines) 🔴 HIGH PRIORITY

### Current Problems
This file has **too many responsibilities** and violates the Single Responsibility Principle:
- Board rendering and sizing
- Menu rendering and management
- Selection state management
- Global keyboard event handling
- Color palette management
- Zoom level management
- Event coordination
- DOM event handling

### Recommended Refactoring

#### Extract 1: Selection Management → `scripts/ui/selection.js`
**Lines to Extract:** 391-430 (Selection class + related logic)
**Size:** ~40 lines

```javascript
// New file: scripts/ui/selection.js
export class Selection {
  constructor(observer) { ... }
  replaceSelection(id) { ... }
  toggleSelected(id) { ... }
  clearSelection() { ... }
  isSelected(id) { ... }
  hasItems() { ... }
  forEach(fn) { ... }
  size() { ... }
}
```

**Benefits:**
- Reusable selection management
- Easier to test in isolation
- Could support different selection strategies

---

#### Extract 2: Menu System → `scripts/ui/menu.js`
**Lines to Extract:** 121-238 (menuItems array + renderMenu function)
**Size:** ~120 lines

```javascript
// New file: scripts/ui/menu.js
export function createMenu(board, selectedStickies, root, appState) {
  // Returns menu element and render function
  // Contains all menu items, their handlers, and rendering logic
}
```

**Benefits:**
- Isolates menu configuration and behavior
- Easier to add new menu items
- Menu logic can be tested separately

---

#### Extract 3: Keyboard Handlers → `scripts/ui/keyboard-handlers.js`
**Lines to Extract:** 324-361 (document.body.onkeydown handler)
**Size:** ~40 lines

```javascript
// New file: scripts/ui/keyboard-handlers.js
export function setupKeyboardHandlers(board, selectedStickies, appState, callbacks) {
  // Returns cleanup function
  // Handles: zoom (o/O), new sticky (n), escape, color (c/C), 
  //          delete, arrow keys for movement
}
```

**Benefits:**
- Centralized keyboard shortcut management
- Easy to document all shortcuts
- Easier to add/modify shortcuts
- Can add keyboard shortcut help/documentation

---

#### Extract 4: Zoom Management → `scripts/ui/zoom.js`
**Lines to Extract:** 64, 100-114, 280-286
**Size:** ~30 lines

```javascript
// New file: scripts/ui/zoom.js
export const zoomScale = [0.3, 0.6, 1];

export function changeZoomLevel(currentScale, reverse) {
  // Returns new zoom level
}

export function applyZoomToBoard(domElement, boardContainer, root, scale, size) {
  // Applies zoom styling to board elements
}
```

**Benefits:**
- Zoom logic in one place
- Easy to add more zoom levels
- Could add zoom-to-fit, zoom-to-area features

---

#### Extract 5: Color Management → `scripts/ui/color-management.js`
**Lines to Extract:** 65-73, 287-322
**Size:** ~50 lines

```javascript
// New file: scripts/ui/color-management.js
export const colorPalette = [
  "khaki", "#F8C471", "#AED6F1", "#82E0AA", "#F1948A", "#C39BD3"
];

export function changeColor(board, selectedStickies, currentColor, reverse) {
  // Returns new current color
  // Handles color cycling and applying to selection
}
```

**Benefits:**
- Color palette in one place
- Easy to customize color schemes
- Could add color picker UI
- Color logic easier to test

---

#### Extract 6: Board Sizing Controls → `scripts/ui/board-size-controls.js`
**Lines to Extract:** 169-211
**Size:** ~45 lines

```javascript
// New file: scripts/ui/board-size-controls.js
export function createBoardSizeControls(board, root) {
  // Creates and manages the sizing control UI
  // Returns cleanup function
}
```

**Benefits:**
- Isolates complex UI control
- Easier to improve the sizing interface
- Could add keyboard shortcuts for sizing

---

### After Refactoring
`render-to-dom.js` would be ~120 lines (73% reduction), focusing only on:
- Mounting the board
- Coordinating rendering
- Basic drag-and-drop handling
- Click handling for sticky creation

---

## 2. scripts/board-items/sticky.js (253 lines) 🟡 MEDIUM PRIORITY

### Current Problems
This file mixes rendering, DOM manipulation, event handling, and text fitting algorithms.

### Recommended Refactoring

#### Extract 1: Text Fitting Algorithm → `scripts/board-items/text-fitting.js`
**Lines to Extract:** 180-210
**Size:** ~30 lines

```javascript
// New file: scripts/board-items/text-fitting.js
export function fitContentInSticky(stickyElement, textarea) {
  // Complex algorithm for text sizing and row calculation
}
```

**Benefits:**
- Algorithm can be improved/optimized in isolation
- Easier to unit test different text scenarios
- Could add different fitting strategies

---

#### Extract 2: Sticky DOM Creation → `scripts/board-items/sticky-dom.js`
**Lines to Extract:** 239-253, helper functions
**Size:** ~40 lines

```javascript
// New file: scripts/board-items/sticky-dom.js
export function createStickyContainerDOM(stickyIdClass) {
  // Creates the DOM structure for a sticky
}

export function removePx(s) { ... }
```

**Benefits:**
- DOM structure in one place
- Could support different sticky templates
- Easier to update sticky HTML structure

---

#### Extract 3: Sticky Event Handlers → `scripts/board-items/sticky-events.js`
**Lines to Extract:** 103-178 (event handler setup from getStickyElement)
**Size:** ~80 lines

```javascript
// New file: scripts/board-items/sticky-events.js
export function setupStickyEvents(container, id, board, selectedStickies, callbacks) {
  // Sets up all event handlers: drag, focus, blur, click, input
  // Returns cleanup function
}
```

**Benefits:**
- Event logic separated from rendering
- Easier to modify interaction behavior
- Could add touch event support

---

#### Extract 4: Sticky Styling → `scripts/board-items/sticky-styling.js`
**Lines to Extract:** 212-237
**Size:** ~25 lines

```javascript
// New file: scripts/board-items/sticky-styling.js
export function setStickyStyles(sticky, container, animateMove, isSelected, origin) {
  // Applies all styles to sticky element
}

export const STICKY_SIZE = 100; // px
```

**Benefits:**
- Styling logic centralized
- Easy to support different sticky sizes
- Could add themes/styles

---

### After Refactoring
`sticky.js` would be ~80 lines (68% reduction), focusing on:
- Main rendering coordination
- Calling out to specialized modules

---

## 3. scripts/board/board.js (156 lines) 🟢 LOWER PRIORITY

### Current Problems
This file is relatively well-scoped but has some geometry utilities mixed in.

### Recommended Refactoring

#### Extract: Geometry Utilities → `scripts/board/geometry.js`
**Lines to Extract:** 136-156
**Size:** ~20 lines

```javascript
// New file: scripts/board/geometry.js
export function snapDimension(x, gridSize) {
  // Snaps a coordinate to grid
}

export function snapLocation(location, gridSize, origin, limit) {
  // Snaps and constrains location to board bounds
}
```

**Benefits:**
- Reusable geometry functions
- Easy to add more geometry utilities
- Easier to unit test

---

## 4. scripts/network/network-firestore.js (128 lines) 🟢 LOWER PRIORITY

### Current Problems
This file is reasonably sized but has utility functions mixed with Firestore logic.

### Recommended Refactoring

#### Extract: Utility Functions → `scripts/network/utils.js`
**Lines to Extract:** 110-128
**Size:** ~20 lines

```javascript
// New file: scripts/network/utils.js
export function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

export function doBatched(array, task, timeLimit = 5) {
  // Batches array processing using requestAnimationFrame
}
```

**Benefits:**
- Reusable utilities
- Could add more batching strategies
- Easier to test

---

## Priority Ranking

### High Priority (Do First)
1. **render-to-dom.js refactoring** - Will have the biggest impact on maintainability
   - Start with Selection and Menu extractions (most self-contained)
   - Then keyboard handlers and color management
   - Finally zoom and board-size controls

### Medium Priority (Do Second)
2. **sticky.js refactoring** - Will improve board-items module organization
   - Start with text-fitting (most isolated)
   - Then DOM creation and styling
   - Finally event handlers (most interconnected)

### Lower Priority (Nice to Have)
3. **board.js and network-firestore.js** - Already reasonably sized
   - Extract geometry utilities
   - Extract network utils

---

## Implementation Strategy

### Phase 1: Extract Stand-alone Utilities (Low Risk)
- `scripts/ui/zoom.js`
- `scripts/ui/color-management.js`
- `scripts/board/geometry.js`
- `scripts/network/utils.js`
- `scripts/board-items/text-fitting.js`

### Phase 2: Extract Classes and Components (Medium Risk)
- `scripts/ui/selection.js`
- `scripts/ui/menu.js`
- `scripts/board-items/sticky-dom.js`
- `scripts/board-items/sticky-styling.js`

### Phase 3: Extract Complex Coordinators (Higher Risk)
- `scripts/ui/keyboard-handlers.js`
- `scripts/ui/board-size-controls.js`
- `scripts/board-items/sticky-events.js`

### Phase 4: Refactor Main Files (Highest Risk)
- Update `scripts/ui/render-to-dom.js` to use extracted modules
- Update `scripts/board-items/sticky.js` to use extracted modules

---

## Expected Benefits

### Code Quality
- **Single Responsibility**: Each module does one thing well
- **Testability**: Smaller modules are easier to unit test
- **Reusability**: Extracted utilities can be used elsewhere
- **Readability**: ~200 lines saved in main files, clearer purpose

### Maintainability
- **Bug fixes**: Easier to locate and fix issues
- **New features**: Clear where to add new functionality
- **Onboarding**: New developers can understand smaller modules

### File Size Improvements
- `render-to-dom.js`: 445 → ~120 lines (73% reduction)
- `sticky.js`: 253 → ~80 lines (68% reduction)
- `board.js`: 156 → ~136 lines (13% reduction)
- `network-firestore.js`: 128 → ~108 lines (16% reduction)

**Total**: 982 lines → ~444 lines across main files
**New modules**: ~538 lines across 11 new focused modules

---

## Testing Recommendations

After each extraction:
1. Run existing test suite (test/ui.spec.js, test/board.spec.js)
2. Add unit tests for extracted modules
3. Verify code coverage doesn't decrease
4. Test all keyboard shortcuts and interactions

---

## Conclusion

The largest file `scripts/ui/render-to-dom.js` (445 lines) should be the primary focus for refactoring. Breaking it into 6 smaller modules will significantly improve code maintainability and testability while reducing the main file by 73%.

The refactoring can be done incrementally with minimal risk by following the phased approach outlined above.
