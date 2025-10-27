# Connector Point-to-Point Renders as Loop Bug

## Bug Description

When creating a point-to-point connector (where both endpoints are unconnected to any sticky or image), the connector incorrectly renders as a self-loop during creation. The user observes:

1. A loop connector renders when trying to create a point-to-point connection
2. The curve handle appears in the correct place after creation
3. When dragging the curve handle, the connector renders correctly
4. It only renders wrong (as a loop) before starting to curve it

## Root Cause

**File:** `scripts/board-items/connector-styling.js`  
**Lines:** 169-170

The self-connection detection logic was comparing `undefined === undefined`, which evaluates to `true` when both endpoints are unconnected to any sticky or image:

```javascript
// Buggy code:
const isSelfConnection = connector.originId === connector.destinationId || 
                         connector.originImageId === connector.destinationImageId;
```

When creating a point-to-point connector:
- `connector.originId` is `undefined` (no sticky attached to origin)
- `connector.destinationId` is `undefined` (no sticky attached to destination)
- `undefined === undefined` returns `true`
- This triggers the self-loop rendering path

## The Fix

Updated the check to only evaluate to `true` when IDs actually exist AND match:

```javascript
// Fixed code:
const isSelfConnection = (connector.originId && connector.originId === connector.destinationId) || 
                         (connector.originImageId && connector.originImageId === connector.destinationImageId);
```

## Why It Was Hard to Notice

1. The bug only manifests during the brief moment before the user interacts with the curve handle
2. Once the curve handle is moved, `connector.curveControlPoint` is set, which bypasses the self-loop rendering on line 300: `if (isSelfConnection && !connector.curveControlPoint)`
3. The visual appearance is a subtle rendering issue that doesn't affect functionality

## Classes and Functions Involved

### Files Modified
- `scripts/board-items/connector-styling.js`
  - Function: `setConnectorStyles()`
  - Lines: 167-171

### Related Code

The self-loop path is rendered in the `buildSelfLoopPath()` function (lines 250-298), which is only called when:
- `isSelfConnection` is `true` (line 300)
- AND `!connector.curveControlPoint` (line 300)

Once a user drags the curve handle, the `curveControlPoint` is set, bypassing the loop rendering.

## Tests That Were Inspired by This Bug

This bug should be tested with:

1. Point-to-point connector creation (both endpoints unconnected)
2. Actual self-loop connector (from sticky back to same sticky)
3. Point to sticky connectors
4. Sticky to point connectors
5. Sticky to sticky connectors
6. Self-loop with curve control point manipulation

## Date
Fixed on: 2024

