# Bug Report: Image Selection Not Working Due to Drag Handler Interference

## Bug Description
Users reported that clicking on images does not select them. The images appear on the board but clicking them does not change their selection state.

## Root Cause
The bug was in `/Users/arienkock/Development/put-it-up/scripts/board-items/image-events.js`. The `dragHandler` was calling `window.dragManager.startDrag()` immediately on **mousedown**, which:

1. Transitions the image to DRAGGING state
2. Calls `event.preventDefault()` and `event.stopPropagation()`
3. Prevents the **click event** from firing
4. Blocks the selection handlers (`normalSelectionHandler` and `selectionHandler`) from running

The selection handlers only have `onClick` methods, not `onMouseDown` methods, so they never get executed when the drag handler intercepts mousedown events.

### Problematic Code Pattern

**Before (image-events.js lines 196-202)**:
```javascript
onMouseDown: (event, stateData) => {
  // Delegate to global drag manager
  if (window.dragManager && window.dragManager.startDrag(this.id, 'image', event)) {
    event.preventDefault();
    event.stopPropagation();
  }
},
```

**Problem**: This immediately calls `startDrag` on mousedown, which transitions to DRAGGING state and prevents click events from firing.

## Fix Applied
Modified the drag handler to use the same click-detection pattern as sticky events:

1. **On mousedown**: Store position and set up mousemove listener (don't start drag yet)
2. **On mousemove**: Only start drag if mouse has moved more than 5 pixels
3. **On click**: Check if drag started; if not, allow selection to proceed

### Fixed Code Pattern

**After (image-events.js lines 196-224)**:
```javascript
onMouseDown: (event, stateData) => {
  // Store mousedown position for drag detection
  stateData.mouseDownPos = { x: event.pageX, y: event.pageY };
  stateData.dragStarted = false;
  
  // Add mousemove listener to detect drag
  stateData.mouseMoveListener = (moveEvent) => {
    const movedX = Math.abs(moveEvent.pageX - stateData.mouseDownPos.x);
    const movedY = Math.abs(moveEvent.pageY - stateData.mouseDownPos.y);
    
    // Only start drag if mouse has moved more than 5 pixels
    if (movedX > 5 || movedY > 5) {
      document.removeEventListener('mousemove', stateData.mouseMoveListener);
      stateData.dragStarted = true;
      
      // Start the drag
      if (window.dragManager && window.dragManager.startDrag(this.id, 'image', moveEvent)) {
        moveEvent.preventDefault();
        moveEvent.stopPropagation();
      }
    }
  };
  
  document.addEventListener('mousemove', stateData.mouseMoveListener);
},
```

**Selection handlers (lines 259-291 and 234-266)** now:
1. Clean up mousemove listener on click
2. Check if drag actually started before handling selection
3. Properly toggle image selection

## Files Changed
- `/Users/arienkock/Development/put-it-up/scripts/board-items/image-events.js`
  - Modified `dragHandler.onMouseDown` to use click-vs-drag detection (lines 196-224)
  - Updated `normalSelectionHandler.onClick` to clean up listeners and check for drag (lines 259-291)
  - Updated `selectionHandler.onClick` to clean up listeners and check for drag (lines 234-266)
  - Added cleanup logic to IDLE state setup/cleanup to handle leftover mousemove listeners (lines 29-35, 42-46)

## How It Works Now
1. **On mousedown**: Store position, set up mousemove listener, but don't prevent events
2. **On mousemove**: If movement > 5 pixels, THEN start drag and prevent events
3. **On mouseup**: If no significant movement, treat as click (selection handler runs)
4. **On click**: Check if drag started; if not, toggle selection

## Verification
After the fix:
- ✅ Clicking an image selects/deselects it
- ✅ Shift+click adds to selection without clearing others
- ✅ Dragging images still works correctly (only starts when mouse moves > 5 pixels)
- ✅ Resize handles still work
- ✅ All event listeners are properly cleaned up

## Key Learning
**Don't call `startDrag` immediately on mousedown.** Use mousemove tracking to distinguish clicks from drags. This pattern (used in sticky-events.js) ensures that click events fire normally for selection, and drag only starts when the user actually drags.

## Related Patterns
This fix follows the **State Machine Prevention Plan** patterns by:
- Using state data for drag tracking instead of global variables
- Properly cleaning up event listeners in state transitions
- Explicit click vs drag detection prevents event interference

