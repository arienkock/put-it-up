# Connectors Don't Work on Images (Origin or Destination) - FIXED

## Root Cause
Connectors couldn't be created from or to images due to incorrect image ID extraction logic. The image container has two CSS classes: `image-container` and `image-{id}` (e.g., `image-1`), but the code was finding the first class that starts with 'image-' which was `image-container` itself, not the actual image ID class.

## Issue Details
The image ID extraction was using:
```javascript
// WRONG - finds 'image-container' instead of 'image-1'
const imageIdClass = Array.from(imageContainer.classList).find(cls => cls.startsWith('image-'));
```

This resulted in:
- `imageIdClass = 'image-container'`
- `imageId = 'container'` (after removing 'image-')
- Invalid image ID being passed to connector endpoint update

## Fix Applied
Updated image ID extraction logic to exclude the generic `image-container` class:

```javascript
// CORRECT - finds 'image-1' instead of 'image-container'
const imageIdClass = Array.from(imageContainer.classList).find(cls => 
  cls.startsWith('image-') && cls !== 'image-container'
);
```

## Files Modified
- `scripts/board-items/connector-events.js` - Fixed image ID extraction in all three locations:
  1. Connector creation (origin detection)
  2. Connector drag end (destination detection)  
  3. Handle drag end (destination detection)

## Debug Logs Before Fix
```
Connecting to image: {imageIdClass: 'image-container', imageId: 'container', ...}
```

## Debug Logs After Fix
Should now show:
```
Connecting to image: {imageIdClass: 'image-1', imageId: '1', ...}
```

## Status
✅ **FIXED** - Connectors should now work properly with images as both origin and destination
