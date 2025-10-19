# Bug Report: toggleSelection Method Name Error

## Summary
Error occurs when clicking on images due to incorrect method name being called on the Selection object.

## Error Details
```
image-events.js:173 Uncaught TypeError: selectionManager.getSelection(...).toggleSelection is not a function
    at container.onclick (image-events.js:173:45)
```

## Root Cause
The code in `image-events.js` line 173 is calling `toggleSelection()` on the Selection object, but the Selection class only has a method called `toggleSelected()`, not `toggleSelection()`.

## Files Involved
- **File**: `scripts/board-items/image-events.js`
- **Line**: 173
- **Class**: Selection (in `scripts/ui/selection.js`)
- **Method**: `toggleSelected()` (correct method name)

## Code Snippets

### Error Location (image-events.js:173)
```javascript
selectionManager.getSelection('images').toggleSelection(id);
```

### Correct Method in Selection Class
```javascript
/**
 * Toggles selection state of an item
 * @param {string} id - Item ID to toggle
 */
toggleSelected(id) {
  const appState = this.store.getAppState();
  const data = appState.ui[this.selectionKey];
  if (data[id]) {
    delete data[id];
  } else {
    data[id] = true;
  }
  this.observer[this.changeNotifier](id);
}
```

## Fix
Change `toggleSelection` to `toggleSelected` in `image-events.js` line 173.

## Status
Fixed - Method name corrected from `toggleSelection` to `toggleSelected`.
