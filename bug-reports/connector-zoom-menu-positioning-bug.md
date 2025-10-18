# Bug Report: Connector Endpoint Positioning Incorrect with Zoom Menu

## Bug Description
When using the zoom menu (as opposed to pinch zoom), drawing connectors works incorrectly. The connector endpoints are positioned incorrectly because the coordinate calculations don't account for the board scale factor. This causes connectors to appear to connect to the wrong positions on stickies and images.

## Root Cause
The issue was in the `scripts/board-items/connector-events.js` file. The coordinate calculation for connector endpoints was missing the board scale conversion that's required when the zoom menu applies CSS transforms.

### Technical Details
1. **Zoom Menu Implementation**: Uses CSS `transform: scale3d()` to visually scale the board
2. **Coordinate System Mismatch**: Mouse coordinates are in screen pixels, but board coordinates need to account for the current zoom level
3. **Missing Board Scale Conversion**: Connector events were calculating coordinates without dividing by `boardScale`

### Problematic Code (Before Fix)
```javascript
// In connector-events.js - INCORRECT
const point = {
  x: event.clientX - rect.left - boardOrigin.x,
  y: event.clientY - rect.top - boardOrigin.y
};
```

### Comparison with Working Code
```javascript
// In render-to-dom.js - CORRECT (for sticky creation)
const location = {
  x: (event.clientX - rect.left - 50 * appState.ui.boardScale) / appState.ui.boardScale + origin.x,
  y: (event.clientY - rect.top - 50 * appState.ui.boardScale) / appState.ui.boardScale + origin.y,
};
```

## Fix Applied

### Files Modified
- `scripts/board-items/connector-events.js`

### Code Changes
Updated all coordinate calculations in connector events to properly account for board scale:

```javascript
// Before (INCORRECT):
const point = {
  x: event.clientX - rect.left - boardOrigin.x,
  y: event.clientY - rect.top - boardOrigin.y
};

// After (CORRECT):
const appState = store.getAppState();
const boardScale = appState.ui.boardScale || 1;

const point = {
  x: (event.clientX - rect.left) / boardScale - boardOrigin.x,
  y: (event.clientY - rect.top) / boardScale - boardOrigin.y
};
```

### Additional Fix Required
The initial fix caused connectors to not appear at all because of a variable scoping issue. The problem was that `appState` was being declared twice in the same scope. The fix was to:

1. Remove the outer `appState` declaration that was captured at function setup time
2. Get fresh `appState` from the store inside each event handler to ensure current board scale is used

### Functions Updated
1. **Initial connector creation** (mousedown handler)
2. **Connector dragging** (handleConnectorDrag)
3. **Connector drag end** (handleConnectorDragEnd)
4. **Handle dragging** (handleHandleDrag)
5. **Handle drag end** (handleHandleDragEnd)

## Why This Only Affected Zoom Menu
- **Zoom Menu**: Uses CSS `transform: scale3d()` which scales the visual appearance but doesn't change DOM coordinates
- **Pinch Zoom**: Would likely use a different mechanism (possibly viewport scaling) that doesn't require coordinate conversion
- **Other Features**: Sticky creation in `render-to-dom.js` already had the correct coordinate conversion

## Testing
- All existing connector tests pass
- All coordinate calculation tests pass
- The fix ensures connector endpoints are positioned correctly at all zoom levels

## Impact
This fix ensures that:
1. Connector endpoints are positioned correctly when using the zoom menu
2. Connector dragging works properly at all zoom levels
3. The behavior is consistent between zoom menu and other zoom methods
4. The coordinate system is consistent across all board interactions
