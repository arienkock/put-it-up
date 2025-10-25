# Image Selection Bug: Only One Image Can Be Selected

## Bug Description
Users reported that only one image could be selected at a time, regardless of which image was clicked. Clicking on different images would not change the selection - it appeared as if only one image could ever be selected.

## Root Cause
The bug was in `/Users/arienkock/Development/put-it-up/scripts/board-items/image-events.js`. The issue was caused by **global state sharing** across all image instances:

1. **Global `imageHandlers` object** (line 272): `let imageHandlers = {};`
2. **Handler overwriting**: Each call to `setupImageEvents()` would **replace** the entire global `imageHandlers` object with handlers specific to that image's ID
3. **Result**: Only the most recently rendered image had working event handlers

### Problematic Code Pattern
```javascript
// Global variable shared by ALL images
let imageHandlers = {};

export function setupImageEvents(container, id, getImageLocation, selectionManager, store) {
  // This OVERWRITES the global handlers for ALL images
  imageHandlers = {
    resizeHandler: createResizeHandler(id, getImageLocation, selectionManager, store),
    dragHandler: createDragHandler(id, getImageLocation, selectionManager, store),
    normalSelectionHandler: createNormalSelectionHandler(id, getImageLocation, selectionManager, store),
    selectionHandler: createSelectionHandler(id, getImageLocation, selectionManager, store)
  };
  
  // All images use the same global handlers - only the last one works
  container.onmousedown = (event) => {
    // Routes to global imageHandlers - only has handlers for last rendered image
  };
}
```

## Fix Applied
Made `imageHandlers` **instance-specific** by creating handlers as local variables inside `setupImageEvents()`:

### Fixed Code Pattern
```javascript
// Removed global imageHandlers variable

export function setupImageEvents(container, id, getImageLocation, selectionManager, store) {
  globalStore = store;
  
  // Create handlers for THIS specific image instance - each image gets its own
  const imageHandlers = {
    resizeHandler: createResizeHandler(id, getImageLocation, selectionManager, store),
    dragHandler: createDragHandler(id, getImageLocation, selectionManager, store),
    normalSelectionHandler: createNormalSelectionHandler(id, getImageLocation, selectionManager, store),
    selectionHandler: createSelectionHandler(id, getImageLocation, selectionManager, store)
  };
  
  // Attach handlers to THIS container's events
  container.onmousedown = (event) => {
    // Routes to local imageHandlers - each image has its own handlers
  };
  container.onclick = (event) => {
    // Routes to local imageHandlers - each image has its own handlers
  };
}
```

## Files Changed
- `/Users/arienkock/Development/put-it-up/scripts/board-items/image-events.js`
  - Removed global `imageHandlers` variable (line 272)
  - Made handlers instance-specific in `setupImageEvents()` function
  - Updated exports to remove `imageHandlers` from exports

## Testing
Added comprehensive tests in `/Users/arienkock/Development/put-it-up/test/image.spec.js`:

1. **"should allow multiple images to be selected independently"** - Verifies multiple images can be created and accessed independently
2. **"should maintain separate state for each image instance"** - Verifies each image maintains its own properties and can be moved independently

All existing tests continue to pass, confirming no regressions.

## Additional Fix: Multi-Selection with Shift Key

After the initial fix, users reported that **multi-selection with Shift+click was still broken**. Investigation revealed a second issue:

### Problem: Drag Handler Interfering with Click Events
The drag handler was calling `event.preventDefault()` and `event.stopPropagation()` on **every mousedown**, which prevented click events from firing. This meant:

1. **mousedown** → drag handler runs → prevents click event
2. **click** → selection handler never runs → no multi-selection

### Solution: Proper Click vs Drag Detection
Implemented proper click vs drag detection:

```javascript
onMouseDown: (event, stateData) => {
  // Store drag start info but don't prevent events yet
  // Let click events fire normally for selection
  
  stateData.imageId = id;
  stateData.dragStart = { x: event.clientX, y: event.clientY };
  
  // Set up mousemove listener to detect actual drag
  const handleMouseMove = (moveEvent) => {
    const dx = moveEvent.clientX - stateData.dragStart.x;
    const dy = moveEvent.clientY - stateData.dragStart.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // If mouse moved more than 5 pixels, start drag
    if (distance > 5) {
      // Remove temporary listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Select this image and start drag
      selectionManager.clearAllSelections();
      selectionManager.getSelection('images').replaceSelection(id);
      
      // Now prevent events and start drag
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
      transitionState(ImageState.DRAGGING, 'drag started');
    }
  };
  
  const handleMouseUp = () => {
    // Remove listeners if mouse is released without dragging
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  // Add temporary listeners
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}
```

### How It Works
1. **On mousedown**: Store start position, don't prevent events yet
2. **On mousemove**: If movement > 5 pixels, THEN start drag and prevent events
3. **On mouseup**: If no significant movement, treat as click (selection handler runs)
4. **Result**: Click events fire normally for selection, drag only starts when actually dragging

## Verification
After both fixes:
- ✅ Multiple images can be pasted onto the board
- ✅ Each image can be selected individually by clicking
- ✅ Shift+click allows multi-selection of images  
- ✅ Selection highlighting appears correctly on each selected image
- ✅ Dragging and resizing still work for individual images
- ✅ All existing functionality remains intact
- ✅ Proper click vs drag detection prevents interference

## Key Learning
**Never use global state for instance-specific data.** When setting up event handlers for multiple instances of the same component, each instance must have its own handler closures with the correct instance data (like `id`). Global state should only be used for truly global concerns like application state or shared resources.

## Related Patterns
This follows the **State Machine Prevention Plan** patterns by ensuring proper instance isolation and avoiding shared mutable state between components.
