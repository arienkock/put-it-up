# Connector Dragging Unnatural Movement Bug

## Summary

When dragging a disconnected connector, it would move unnaturally, appearing to "fly away" from the cursor position. This was caused by incorrect delta calculation in the drag manager that accumulated movement incorrectly.

## Root Cause

The issue was a mismatch in how movement deltas were calculated:

1. **`drag-manager.js`** calculated delta from a **fixed original start point** using `calculateMovementDelta`
2. **`board.moveConnector`** expected **incremental deltas** (relative movement from current position) and adds them to current endpoint positions
3. Result: Delta kept growing during dragging, causing the connector to accumulate incorrect movement and appear to move too far

The old `connector-events.js` worked around this by updating the drag start point after each move (line 877), making each delta relative to the last position instead of the original start.

## Fix

Modified `drag-manager.js` to track the **last mouse position** for connectors and calculate incremental deltas on each mousemove:

1. **Added `lastPosition` tracking** to state data in `startDrag` (line 163)
2. **Modified `handleDragMove`** to calculate incremental deltas for connectors from `lastPosition` instead of `dragStart` (lines 235-252)
3. **Updated `lastPosition`** after each connector movement for the next increment

Now connectors move smoothly with incremental deltas that don't accumulate incorrectly.

## Files Changed

- `scripts/ui/drag-manager.js` - Added `lastPosition` tracking and incremental delta calculation for connectors
- `test/connector-events.spec.js` - Added test to verify smooth connector dragging with multiple incremental movements

## Code Changes

### drag-manager.js - startDrag method
```163:163:scripts/ui/drag-manager.js
this.stateData.lastPosition = { x: event.clientX, y: event.clientY };
```

### drag-manager.js - handleDragMove method
```235:252:scripts/ui/drag-manager.js
// Move all selected connectors (connectors use incremental delta movement)
if (this.stateData.originalLocations.connectors) {
  // Calculate incremental delta for connectors from last position
  const connectorDelta = calculateMovementDelta(
    this.stateData.lastPosition.x,
    this.stateData.lastPosition.y,
    event.clientX,
    event.clientY,
    this.stateData.boardScale
  );
  
  this.stateData.originalLocations.connectors.forEach((_, id) => {
    this.board.moveConnector(id, connectorDelta.dx, connectorDelta.dy);
  });
}

// Update last position for next move (used for connectors)
this.stateData.lastPosition = { x: event.clientX, y: event.clientY };
```

## Tests Added

Added test "should move connector smoothly with multiple incremental movements" in `test/connector-events.spec.js` that:
- Creates a disconnected connector
- Simulates multiple incremental drag movements (10,10 then 10,10 then 20,30)
- Verifies that each movement accumulates correctly without multiplication
- Confirms final position matches expected cumulative movement

## Testing Results

- All connector-events.spec.js tests pass (23/23)
- New test verifies smooth incremental movement
- Manual testing confirms natural movement when dragging disconnected connectors
