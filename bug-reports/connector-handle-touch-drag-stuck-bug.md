# Connector Handle Touch Drag Gets Stuck

## Bug Description
When dragging connector handles (origin/destination handles or curve control handles) with touch events, the drag operation doesn't properly end. After lifting the finger, attempting to touch and move something else causes the original handle to jump to the new touch position, as if the drag was still ongoing.

## Root Cause
Two separate issues were causing this bug:

1. **Duplicate touchend handlers**: The boardElement had a touchend listener (lines 1040-1047 in connector-events.js) that competed with the global listeners set up by `setupHandleDragListeners()` and `setupCurveHandleDragListeners()`. This caused:
   - Duplicate event handling
   - Potential race conditions
   - State machine not properly cleaning up

2. **Missing `{ passive: false }` on global touch listeners**: The `GlobalListenerManager.setListeners()` method didn't add `{ passive: false }` option when registering touch event listeners on the document. This meant:
   - `preventDefault()` calls in touchmove and touchend handlers were silently ignored
   - Browser could still process default touch behavior
   - Events might not be properly captured

## Fix

### 1. Removed Duplicate touchend Handler
**File**: `scripts/board-items/connector-events.js` (lines 1040-1047)

Removed the boardElement touchend listener since the global listeners (set up when entering drag states) already properly handle touchend events.

```javascript
// REMOVED - this was causing duplicate handling:
this.boardElement.addEventListener('touchend', (event) => {
  if (this.currentState === ConnectorState.DRAGGING_HANDLE ||
      this.currentState === ConnectorState.DRAGGING_CURVE_HANDLE) {
    event.preventDefault();
    this.routeMouseUp(event);
  }
}, { passive: false });
```

### 2. Added `{ passive: false }` to Global Touch Listeners
**File**: `scripts/ui/state-machine-base.js` (lines 87-100)

Modified `GlobalListenerManager.setListeners()` to automatically add `{ passive: false }` option for all touch events (touchstart, touchmove, touchend).

```javascript
setListeners(listenerMap) {
  this.clearAll();
  
  Object.entries(listenerMap).forEach(([eventType, handler]) => {
    // Add { passive: false } for touch events to allow preventDefault()
    const options = eventType.startsWith('touch') ? { passive: false } : undefined;
    document.addEventListener(eventType, handler, options);
    
    if (!this.activeListeners.has(eventType)) {
      this.activeListeners.set(eventType, new Set());
    }
    this.activeListeners.get(eventType).add(handler);
  });
}
```

## Files Changed
1. `scripts/board-items/connector-events.js`
   - Removed duplicate boardElement touchend listener (lines 1040-1047)
   
2. `scripts/ui/state-machine-base.js`
   - Modified GlobalListenerManager.setListeners() to add { passive: false } for touch events

## Testing
The fix ensures that:
1. Connector handles can be dragged smoothly with touch
2. Drag operations properly end when lifting the finger
3. Subsequent touches don't affect previously dragged handles
4. State machine properly transitions back to IDLE state after drag ends

## Related Issues
This fix also benefits other touch drag operations handled by GlobalListenerManager:
- Sticky resizing (StickyResizeStateMachine)
- Image resizing (ImageStateMachine)  
- General drag operations (DragStateMachine)

All now properly support preventDefault() in their touch handlers.

