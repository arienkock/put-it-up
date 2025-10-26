# Drag Completion Affects Selection Bug

## Bug Description
When a drag operation starts, only the item being dragged remains selected - all other selected items become unselected. This is annoying because the user expects to be able to drag multiple selected items together.

## Root Cause
The issue occurs in the `startDrag` method of the drag manager. When a drag starts, if the item being dragged is not currently selected, the code calls `selectItem` with `addToSelection: false`. This clears ALL other selections before selecting the dragged item.

### Event Flow
1. User has multiple items selected (e.g., 3 stickies)
2. User mousedowns on one sticky to drag
3. Drag manager checks if that sticky is selected
4. If not selected, calls `selectItem(itemType, itemId, { addToSelection: false })`
5. `selectItem` calls `clearAllSelectionsExcept(itemType)` which clears all other selections
6. Only the dragged item remains selected

## Fix Applied

### Files Modified
- `scripts/ui/selection.js` - Added `addToSelection` method
- `scripts/ui/selection-manager.js` - Added `addToSelection` method to manager
- `scripts/ui/drag-manager.js` - Uses new `addToSelection` method instead of `selectItem` with toggle
- `scripts/board-items/connector-events.js` - Added event.stopPropagation to drag end handlers
- `scripts/board-items/sticky-events.js` - Added event.stopPropagation to drag end handlers
- `scripts/board-items/image-events.js` - Added event.stopPropagation to drag end handlers

### Code Changes

Two fixes were applied:

1. Added a new `addToSelection` method to the Selection class that adds an item to the selection without toggling (unlike `toggleSelected`). This ensures that when dragging an unselected item, it gets added to the current selection without accidentally toggling any other items off.

2. Added `event.stopPropagation()` to all drag end handlers to prevent click events from firing after drag completion.

#### 1. Selection.js - Added `addToSelection` method
```javascript
/**
 * Adds an item to selection without affecting other items
 * @param {string} id - Item ID to add
 */
addToSelection(id) {
  const appState = this.store.getAppState();
  const data = appState.ui[this.selectionKey];
  if (!data[id]) {
    data[id] = true;
    this.observer[this.changeNotifier](id);
  }
}
```

#### 2. SelectionManager.js - Added `addToSelection` method
```javascript
/**
 * Adds an item to the current selection without toggling
 * Used when starting a drag to ensure the item is selected without deselecting others
 * @param {string} typeName - The content type being selected
 * @param {string} itemId - The ID of the item to select
 */
addToSelection(typeName, itemId) {
  const targetSelection = this.selections.get(typeName);
  
  if (!targetSelection) {
    console.warn(`No selection registered for type: ${typeName}`);
    return;
  }
  
  targetSelection.addToSelection(itemId);
}
```

#### 3. Drag Manager (`scripts/ui/drag-manager.js`)
```javascript
// If not selected, add it to the current selection (don't toggle, just add)
if (!isSelected) {
  this.selectionManager.addToSelection(itemType, itemId);
  // Re-read selections after potential update
  stickySelection = this.selectionManager.getSelection('stickies');
  imageSelection = this.selectionManager.getSelection('images');
  connectorSelection = this.selectionManager.getSelection('connectors');
}
```

#### 2. Connector Events (`scripts/board-items/connector-events.js`)
```javascript
handleConnectorDragEnd(event) {
  if (this.currentState !== ConnectorState.DRAGGING_NEW || !this.stateData.connectorId) return;
  
  event.preventDefault();
  event.stopPropagation(); // Prevent click events from firing after drag
  
  // ... rest of handler
}

handleHandleDragEnd(event) {
  if (this.currentState !== ConnectorState.DRAGGING_HANDLE || !this.stateData.connectorId) return;
  
  event.preventDefault();
  event.stopPropagation(); // Prevent click events from firing after drag
  
  // ... rest of handler
}

handleCurveHandleDragEnd(event) {
  if (this.currentState !== ConnectorState.DRAGGING_CURVE_HANDLE || !this.stateData.connectorId) return;
  
  event.preventDefault();
  event.stopPropagation(); // Prevent click events from firing after drag
  
  // ... rest of handler
}
```

#### 3. Sticky Events (`scripts/board-items/sticky-events.js`)
```javascript
onMouseUp: (event, stateData) => {
  event.preventDefault();
  event.stopPropagation(); // Prevent click events from firing after resize
  
  // ... rest of handler
}
```

#### 4. Image Events (`scripts/board-items/image-events.js`)
```javascript
handleImageResizeEnd(event) {
  if (this.currentState !== ImageState.RESIZING) return;
  
  event.preventDefault();
  event.stopPropagation(); // Prevent click events from firing after resize
  
  this.transitionTo(ImageState.IDLE, 'resize ended');
}
```

## How It Works

### Fix 1: Selection Preservation During Drag Start
By adding a new `addToSelection` method instead of using `selectItem` with toggle:
- Previously: When dragging an unselected item, it used `selectItem(..., { addToSelection: true })` which calls `toggleSelected`. This could toggle items on/off unexpectedly.
- Now: When dragging an unselected item, it uses `addToSelection` which only adds the item to the selection if it's not already selected, without toggling.
- Key difference: `toggleSelected` toggles (adds if not selected, removes if selected), while `addToSelection` only adds (does nothing if already selected).
- Result: Multiple selected items can be dragged together without accidentally deselecting items

### Fix 2: Preventing Click Events After Drag
By calling both `event.preventDefault()` and `event.stopPropagation()` in drag end handlers:
- `event.preventDefault()` - Prevents the default browser behavior
- `event.stopPropagation()` - Stops the event from bubbling up the DOM tree, preventing any click events from being generated

This ensures that when a drag operation completes, no subsequent click events are fired that would affect selection state.

## Testing
- Dragging an unselected item should add it to the current selection without clearing other selected items
- Dragging multiple selected items should work correctly - all selected items should move together
- Selection should remain intact during and after drag completion
- Clicking the board should still clear selections when not dragging
- Resizing stickies or images should not affect selection
- Dragging with shift+click should still work for adding items to selection

## References
- Event propagation in JavaScript: https://developer.mozilla.org/en-US/docs/Web/API/Event/stopPropagation
- Difference between preventDefault and stopPropagation: preventDefault prevents default browser behavior, stopPropagation prevents event bubbling

