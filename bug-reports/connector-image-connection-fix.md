# Connector-to-Image Connection Bug Fix

## Root Cause
The connector events system (`scripts/board-items/connector-events.js`) was only checking for `.sticky-container` elements when creating connections, but not for `.image-container` elements. Additionally, image event handlers were preventing event propagation even when in connector creation mode. Finally, the coordinate calculation was incorrect - adding boardOrigin instead of subtracting it.

## Fix
1. **Updated connector events** to detect both sticky and image containers:
   - Added detection for `.image-container` elements in connector creation
   - Added support for `originImageId` and `destinationImageId` in connector data
   - Updated both connector creation and handle dragging to support image connections

2. **Updated image events** to allow connector creation:
   - Modified image mouse down handler to skip event prevention when in connector creation mode
   - Modified image click handler to skip event prevention when in connector creation mode

3. **Fixed coordinate calculation**:
   - Changed from adding `boardOrigin.x/y` to subtracting them in all coordinate calculations
   - This ensures connectors snap to the correct positions relative to the board viewport

## Files Involved
- `scripts/board-items/connector-events.js` - Added image container detection, connection logic, and fixed coordinate calculation
- `scripts/board-items/image-events.js` - Modified to allow connector events to work

## Code Snippets

### Connector Events Fix
```javascript
// Check if we're starting from a sticky or image
const stickyContainer = event.target.closest('.sticky-container');
const imageContainer = event.target.closest('.image-container');
let originStickyId = null;
let originImageId = null;

if (stickyContainer) {
  const stickyIdClass = Array.from(stickyContainer.classList).find(cls => cls.startsWith('sticky-'));
  originStickyId = stickyIdClass ? stickyIdClass.replace('sticky-', '') : null;
} else if (imageContainer) {
  const imageIdClass = Array.from(imageContainer.classList).find(cls => cls.startsWith('image-'));
  originImageId = imageIdClass ? imageIdClass.replace('image-', '') : null;
}
```

### Coordinate Calculation Fix
```javascript
// FIXED: Subtract boardOrigin instead of adding it
const point = {
  x: event.clientX - rect.left - boardOrigin.x,
  y: event.clientY - rect.top - boardOrigin.y
};
```

### Image Events Fix
```javascript
// Mouse down handler
container.onmousedown = (event) => {
  // Don't prevent propagation if we're in connector creation mode
  const appState = store.getAppState();
  if (appState.ui.nextClickCreatesConnector) {
    return; // Let connector events handle this
  }
  
  event.preventDefault();
  event.stopPropagation();
  // ... rest of handler
};
```

## Status
✅ **RESOLVED** - Connectors can now be created from/to images and will properly connect to image bounding box centers without snapping away.
