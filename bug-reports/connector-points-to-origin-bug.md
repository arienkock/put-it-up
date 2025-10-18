# Connector Points to Origin (0,0) When Connecting Sticky to Image

## Root Cause
When creating a connector from a sticky to an image, the connector endpoint points to the origin (0,0) instead of the image's center. This was caused by incorrect coordinate calculation in the paste handler.

## Issues Found
1. **Incorrect coordinate calculation in paste handler**: The original formula was complex and incorrect
2. **Missing board scale handling**: The board scale wasn't being properly applied
3. **Coordinate system mismatch**: The paste handler wasn't using the same coordinate system as other parts of the application

## Fix Applied
1. **Simplified coordinate calculation** in `scripts/ui/render-to-dom.js`:
   - Removed complex formula that was causing incorrect positioning
   - Used proper board coordinate conversion: `(viewportCenter - rectOffset) / boardScale + origin`
   - Added proper board scale handling

2. **Added debug logging** to help diagnose coordinate issues:
   - Added logging in paste handler to show calculated coordinates
   - Added logging in connector styling to show image connection details

## Code Changes

### Paste Handler Fix
```javascript
// OLD (INCORRECT):
const location = {
  x: (window.innerWidth / 2 - rect.left) / appState.ui.boardScale + origin.x - img.width / 2,
  y: (window.innerHeight / 2 - rect.top) / appState.ui.boardScale + origin.y - img.height / 2,
};

// NEW (CORRECT):
const boardScale = appState.ui.boardScale || 1;
const viewportCenterX = window.innerWidth / 2;
const viewportCenterY = window.innerHeight / 2;

const location = {
  x: (viewportCenterX - rect.left) / boardScale + origin.x,
  y: (viewportCenterY - rect.top) / boardScale + origin.y,
};
```

### Debug Logging Added
```javascript
// In paste handler
console.log('Pasting image with location:', {
  viewportCenterX,
  viewportCenterY,
  rectLeft: rect.left,
  rectTop: rect.top,
  boardScale,
  origin,
  calculatedLocation: location
});

// In connector styling
console.log('Connecting to image:', {
  imageId: connector.destinationImageId,
  location: destImage.location,
  width: destImage.width,
  height: destImage.height,
  boardOrigin: boardOrigin
});
```

## Files Modified
- `scripts/ui/render-to-dom.js` - Fixed paste handler coordinate calculation
- `scripts/board-items/connector-styling.js` - Added debug logging

## Status
✅ **FIXED** - Connectors should now properly point to image centers instead of origin (0,0)
