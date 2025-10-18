# Image Resize Dragging Not Working

## Bug Description
Users cannot resize images by dragging the resize handles. Images stay the same size when attempting to resize them.

## Root Cause
The image resize functionality had several issues:

1. **Missing dragStart initialization**: The `dragStart` variable was not being initialized when starting a resize operation, causing the delta calculations to fail.

2. **Inefficient resize logic**: The resize logic was calling `window.board.resizeImage()` on every mouse move event, which was inefficient and could cause performance issues.

3. **No movement threshold**: The resize was triggered on any mouse movement, even tiny movements, which could cause unwanted resizing.

## Fix Applied

### Files Modified
- `scripts/board-items/image-events.js`

### Code Changes

1. **Added dragStart initialization for resize**:
```javascript
// Before
if (handle) {
  isResizing = true;
  resizeSide = handle.className.split('-')[2];
  const image = store.getImage(id);
  aspectRatio = image.naturalWidth / image.naturalHeight;
  originalSize = { width: image.width, height: image.height };
  originalLocation = { x: image.location.x, y: image.location.y };
  document.body.style.cursor = handle.style.cursor;
  return;
}

// After
if (handle) {
  isResizing = true;
  resizeSide = handle.className.split('-')[2];
  const image = store.getImage(id);
  aspectRatio = image.naturalWidth / image.naturalHeight;
  originalSize = { width: image.width, height: image.height };
  originalLocation = { x: image.location.x, y: image.location.y };
  dragStart = { x: event.clientX, y: event.clientY }; // Initialize dragStart for resize
  document.body.style.cursor = handle.style.cursor;
  return;
}
```

2. **Improved resize logic with movement threshold**:
```javascript
// Before
} else if (isResizing && resizeSide) {
  const dx = event.clientX - dragStart.x;
  const dy = event.clientY - dragStart.y;
  
  // Calculate resize based on side
  let isGrow = true;
  let delta = 0;
  
  switch (resizeSide) {
    case 'left':
      delta = -dx;
      break;
    case 'right':
      delta = dx;
      break;
    case 'top':
      delta = -dy;
      break;
    case 'bottom':
      delta = dy;
      break;
  }
  
  if (delta < 0) isGrow = false;
  
  // Resize the image (this will be handled by the board)
  window.board.resizeImage(id, isGrow, resizeSide);
  
  // Update drag start to prevent accumulation
  dragStart = { x: event.clientX, y: event.clientY };
}

// After
} else if (isResizing && resizeSide) {
  const dx = event.clientX - dragStart.x;
  const dy = event.clientY - dragStart.y;
  
  // Calculate resize based on side
  let delta = 0;
  
  switch (resizeSide) {
    case 'left':
      delta = -dx;
      break;
    case 'right':
      delta = dx;
      break;
    case 'top':
      delta = -dy;
      break;
    case 'bottom':
      delta = dy;
      break;
  }
  
  // Only resize if there's significant movement (threshold of 5 pixels)
  if (Math.abs(delta) >= 5) {
    const isGrow = delta > 0;
    
    // Resize the image (this will be handled by the board)
    window.board.resizeImage(id, isGrow, resizeSide);
    
    // Update drag start to prevent accumulation
    dragStart = { x: event.clientX, y: event.clientY };
  }
}
```

## Functions and Classes Involved
- `setupImageEvents()` in `scripts/board-items/image-events.js`
- `resizeImage()` in `scripts/board/board.js`
- `updateImageSize()` and `setImageLocation()` in `scripts/board/local-datastore.js`

## Testing
After applying these fixes, image resizing should work properly:
1. Select an image to make resize handles visible
2. Click and drag any resize handle
3. The image should resize while maintaining aspect ratio
4. Resize should only trigger after significant mouse movement (5+ pixels)

## Additional Fix Applied

### Issue Found During Testing
During testing, it was discovered that the `resizeSide` variable was not being extracted correctly from the class name. The console showed `"Resizing mouse move: handle"` instead of the expected side name.

### Root Cause
The class name extraction logic `handle.className.split('-')[2]` was incorrect because:
- Class name: `"resize-handle resize-handle-right"`
- Split result: `["resize", "handle", "resize", "handle", "right"]`
- Index 2 returned "handle" instead of "right"

### Fix Applied
```javascript
// Before
resizeSide = handle.className.split('-')[2]; // Extract side from class name

// After
// Extract side from class name - look for resize-handle-[side] pattern
const classNames = handle.className.split(' ');
resizeSide = null;
for (const className of classNames) {
  if (className.startsWith('resize-handle-')) {
    resizeSide = className.replace('resize-handle-', '');
    break;
  }
}

if (!resizeSide) {
  console.error('Could not determine resize side from class name:', handle.className);
  return;
}
```

## Status
✅ Fixed - Image resize functionality now works correctly
