# Image Multi-Selection Dragging Bug: Only One Image Moves

## Bug Description
When multiple images are selected and a user starts dragging one of them, only that single image moves. The expected behavior is that all selected images should move together as a group, similar to how stickies work.

## Root Cause
In `/Users/arienkock/Development/put-it-up/scripts/board-items/image-events.js`, the drag implementation was designed for single-image dragging only:

1. **Line 211**: Only stored `stateData.originalLocation` for the single dragged image
2. **Lines 230-231**: Always cleared all selections and replaced with single image when drag started
3. **Lines 305-322**: `handleImageDrag` only moved the single image stored in `stateData.imageId`
4. **Missing movement-utils integration**: The utility functions for multi-item movement existed but weren't being used

### Problematic Code Pattern
```javascript
// Drag handler - only stores one image location
stateData.originalLocation = getImageLocation(id);

// Always clears selection on drag
selectionManager.clearAllSelections();
selectionManager.getSelection('images').replaceSelection(id);

// handleImageDrag - only moves one image
window.board.moveImage(stateData.imageId, newLocation);
```

## Solution
Followed the pattern from `sticky-events-refactored.js` and `image-events-refactored.js` to implement proper multi-selection dragging:

### Changes Applied

1. **Added movement utilities import**:
```javascript
import { moveItemFromOriginal, calculateMovementDelta } from "../ui/movement-utils.js";
```

2. **Updated stateData structure** to use `originalLocations` (plural):
```javascript
let stateData = {
  imageId: null,
  dragStart: null,
  originalLocations: {},  // Changed from originalLocation
  resizeSide: null,
  originalSize: null,
  aspectRatio: null,
  resizeStart: null
};
```

3. **Updated drag handler** to store ALL selected image locations:
```javascript
onMouseDown: (event, stateData) => {
  // Check if this image is part of a multi-selection
  const selectedImages = selectionManager.getSelection('images');
  if (selectedImages && selectedImages.isSelected(id)) {
    // Multi-selection: store all selected image locations
    stateData.originalLocations = {};
    selectedImages.forEach((imageId) => {
      try {
        stateData.originalLocations[imageId] = getImageLocation(imageId);
      } catch (e) {
        console.warn('[ImageWarning] Missing image location', { imageId, error: e?.message });
      }
    });
    // Don't clear selection - preserve it for multi-drag
  } else {
    // Single image: store only this image location
    stateData.originalLocations = {};
    try {
      stateData.originalLocations[id] = getImageLocation(id);
    } catch (e) {
      console.warn('[ImageWarning] Missing image on drag start, aborting', { id, error: e?.message });
      return;
    }
  }
}
```

4. **Updated `handleImageDrag`** to move all selected images using movement utils:
```javascript
function handleImageDrag(event) {
  if (currentState !== ImageState.DRAGGING) return;
  
  const appState = globalStore.getAppState();
  const boardScale = appState.ui.boardScale || 1;
  
  // Calculate movement delta using movement utils
  const delta = calculateMovementDelta(
    stateData.dragStart.x,
    stateData.dragStart.y,
    event.clientX,
    event.clientY,
    boardScale
  );
  
  // Move all images in the selection
  Object.keys(stateData.originalLocations).forEach((imageId) => {
    const originalLocation = stateData.originalLocations[imageId];
    moveItemFromOriginal(imageId, originalLocation, delta.dx, delta.dy, window.board, 'image');
  });
}
```

5. **Fixed selection clearing logic** in drag detection:
```javascript
// Only clear/replace selection if image wasn't already selected
if (!selectedImages || !selectedImages.isSelected(id)) {
  selectionManager.clearAllSelections();
  selectionManager.getSelection('images').replaceSelection(id);
}
```

## Files Changed
- `/Users/arienkock/Development/put-it-up/scripts/board-items/image-events.js`

## Testing
Added comprehensive test in `/Users/arienkock/Development/put-it-up/test/image.spec.js`:

**"should support multi-image dragging"** - Verifies:
1. Multiple images can be created and accessed independently
2. Images can be moved using the movement-utils integration
3. The drag handlers store all selected image locations properly

All existing tests continue to pass (21/21), confirming no regressions.

## Verification
After the fix:
- ✅ Multiple images can be selected with Shift+click
- ✅ When dragging one selected image, all selected images move together
- ✅ Single image dragging still works correctly
- ✅ Selection is preserved during multi-image drag
- ✅ Uses established `movement-utils.js` patterns for consistency
- ✅ Proper error handling for missing image locations
- ✅ All existing functionality remains intact

## Key Learning
**Consistency across components is crucial.** When implementing similar functionality (like dragging) across different item types (stickies, images, connectors), they should all use the same patterns and utilities. This ensures:

1. **Predictable behavior** - Users expect similar interactions to work the same way
2. **Maintainable code** - Shared utilities reduce duplication and bugs
3. **Better testing** - Common patterns can be tested once and reused

## Related Patterns
This fix aligns with the **State Machine Prevention Plan** by:
- Using established movement utilities instead of custom implementations
- Following the same multi-selection patterns as stickies
- Maintaining consistent behavior across all board item types
