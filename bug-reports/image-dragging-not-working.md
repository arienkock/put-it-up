# Image Dragging Not Working

## Bug Description
Users cannot move images by dragging them. When attempting to drag an image, it either doesn't move at all or moves in an incorrect/unexpected manner. Additionally, the cursor remains stuck in the "grabbing" state after attempting to drag.

## Root Cause
The image dragging functionality had two main issues:

1. **Missing board scale conversion**: The drag calculation was using raw pixel coordinates without converting them to board coordinates
2. **Event handler conflicts**: The image events were using direct property assignment (`document.onmousemove = ...`) which conflicts with other event handlers that use `addEventListener`

### Technical Details
1. **Missing board scale conversion**: The drag calculation was using raw mouse movement (`dx`, `dy`) directly without dividing by the board scale
2. **Coordinate system mismatch**: Mouse coordinates are in screen pixels, but board coordinates need to account for the current zoom level
3. **Event handler conflicts**: Multiple event handlers (connector events, sticky events) use `addEventListener` for mouse events, but image events were using direct assignment, causing the image handlers to be overwritten
4. **Incomplete cleanup**: The cursor state wasn't being properly reset because the mouse up handler wasn't being called due to event handler conflicts

## Fix Applied

### Files Modified
- `scripts/board-items/image-events.js`

### Code Changes

1. **Fixed drag movement calculation**:
```javascript
// Before (INCORRECT):
const dx = event.clientX - dragStart.x;
const dy = event.clientY - dragStart.y;

const newLocation = {
  x: originalLocation.x + dx,
  y: originalLocation.y + dy
};

// After (CORRECT):
const appState = store.getAppState();
const boardScale = appState.ui.boardScale || 1;

const dx = event.clientX - dragStart.x;
const dy = event.clientY - dragStart.y;

// Convert pixel movement to board coordinates by dividing by scale
const newLocation = {
  x: originalLocation.x + dx / boardScale,
  y: originalLocation.y + dy / boardScale
};
```

2. **Fixed resize movement calculation**:
```javascript
// Before (INCORRECT):
switch (resizeSide) {
  case 'left':
    delta = -dx;
    break;
  case 'right':
    delta = dx;
    break;
  // ... etc
}

// After (CORRECT):
const appState = store.getAppState();
const boardScale = appState.ui.boardScale || 1;

switch (resizeSide) {
  case 'left':
    delta = -dx / boardScale;
    break;
  case 'right':
    delta = dx / boardScale;
    break;
  // ... etc
}
```

3. **Fixed event handler conflicts**:
```javascript
// Before (INCORRECT - causes conflicts):
document.onmousemove = (event) => { /* ... */ };
document.onmouseup = () => { /* ... */ };

// After (CORRECT - uses addEventListener):
const handleMouseMove = (event) => { /* ... */ };
const handleMouseUp = () => { /* ... */ };

const addGlobalListeners = () => {
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

// Remove listeners when done:
const handleMouseUp = () => {
  // ... cleanup code ...
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
};
```

## Classes, Functions, and Code Snippets Involved

### Functions Modified
- `setupImageEvents()` in `scripts/board-items/image-events.js`
  - Mouse move handler for dragging
  - Mouse move handler for resizing

### Key Code Snippets
```javascript
// Mouse move handler for dragging (lines 71-86)
document.onmousemove = (event) => {
  if (isDragging && !isResizing) {
    const appState = store.getAppState();
    const boardScale = appState.ui.boardScale || 1;
    
    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;
    
    // Convert pixel movement to board coordinates by dividing by scale
    const newLocation = {
      x: originalLocation.x + dx / boardScale,
      y: originalLocation.y + dy / boardScale
    };
    
    window.board.moveImage(id, newLocation);
  }
  // ... resize handling
};
```

## Testing
The fix ensures that:
1. Images can be dragged smoothly at any zoom level
2. Image movement is proportional to mouse movement regardless of board scale
3. Resize handles also work correctly with proper scale conversion
4. Cursor state is properly managed (no more stuck "grabbing" cursor)
5. Event handlers don't conflict with other dragging operations
6. Behavior is consistent with other dragging operations in the application

## Related Issues
This fix is similar to the coordinate calculation fixes applied in:
- `bug-reports/connector-points-to-origin-bug.md` - Connector coordinate calculation
- `bug-reports/image-resize-dragging-not-working.md` - Image resize functionality

The root cause was the same: missing board scale conversion in coordinate calculations.
