# Bug Report: Incorrect Connector Endpoints for Non-Square Stickies

## Bug Description
When a sticky note has non-square dimensions (e.g., 2x1, 1x3, 3x2), the connector endpoints are not calculated correctly. Connectors appear to connect to incorrect points on the sticky edges, making the visual connection look wrong.

## Root Cause
The issue was in the `calculateEdgePoint` function in `scripts/board-items/connector-dom.js`. The function was designed to work with square stickies only, using a single `stickySize` parameter for both width and height calculations.

### Problematic Code (Before Fix)
```javascript
// In connector-dom.js
export function calculateEdgePoint(centerX, centerY, targetX, targetY, stickySize) {
  const halfSize = stickySize / 2;
  // ... 
  const halfWidth = halfSize;  // ❌ Same value for width and height
  const halfHeight = halfSize; // ❌ Same value for width and height
  // ...
}

// In connector-styling.js
startPoint = calculateEdgePoint(
  originCenter.x,
  originCenter.y,
  destCenter.x,
  destCenter.y,
  Math.max(stickySize * originSizeX, stickySize * originSizeY) // ❌ Using max dimension
);
```

### The Problem
1. **Incorrect Size Calculation**: The code used `Math.max(stickySize * originSizeX, stickySize * originSizeY)` to determine the "size" parameter
2. **Square Assumption**: The `calculateEdgePoint` function treated this single size parameter as both width and height
3. **Wrong Edge Points**: For non-square stickies, this resulted in connector endpoints that didn't align with the actual sticky boundaries

## Fix Applied

### 1. Updated `calculateEdgePoint` Function
**File**: `scripts/board-items/connector-dom.js`

```javascript
// Before
export function calculateEdgePoint(centerX, centerY, targetX, targetY, stickySize)

// After  
export function calculateEdgePoint(centerX, centerY, targetX, targetY, stickyWidth, stickyHeight)
```

**Key Changes**:
- Added separate `stickyWidth` and `stickyHeight` parameters
- Removed the unused `angle` calculation
- Updated validation to check both width and height parameters
- Used actual width and height values for edge calculations

### 2. Updated Function Calls
**File**: `scripts/board-items/connector-styling.js`

```javascript
// Before
startPoint = calculateEdgePoint(
  originCenter.x,
  originCenter.y,
  destCenter.x,
  destCenter.y,
  Math.max(stickySize * originSizeX, stickySize * originSizeY)
);

// After
startPoint = calculateEdgePoint(
  originCenter.x,
  originCenter.y,
  destCenter.x,
  destCenter.y,
  stickySize * originSizeX,  // ✅ Actual width
  stickySize * originSizeY   // ✅ Actual height
);
```

## Files Modified
1. `scripts/board-items/connector-dom.js` - Updated `calculateEdgePoint` function signature and implementation
2. `scripts/board-items/connector-styling.js` - Updated all calls to `calculateEdgePoint` to pass separate width and height

## Classes and Functions Involved
- **Function**: `calculateEdgePoint()` in `connector-dom.js`
- **Function**: `setConnectorStyles()` in `connector-styling.js`
- **Class**: Connector rendering system

## Testing
Created and ran a test script that verified the fix works correctly for various non-square sticky sizes:
- 2x1 sticky (wide)
- 1x2 sticky (tall) 
- 3x1 sticky (very wide)
- 1x3 sticky (very tall)

All test cases confirmed that connector endpoints now correctly align with sticky boundaries.

## Impact
- ✅ Connectors now properly connect to the correct edge points on non-square stickies
- ✅ Visual appearance of connections is accurate regardless of sticky dimensions
- ✅ No breaking changes to existing functionality
- ✅ Maintains backward compatibility with square stickies

## Date Fixed
December 2024
