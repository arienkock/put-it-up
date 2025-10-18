# Arrowhead Menu Empty Display Bug

## Issue Description
The arrowhead menu item was displaying as completely empty (no image element visible) when connectors were selected. Users could still click on it to change arrowhead types, but there was no visual indication of what the current arrowhead type was. The functionality worked correctly, but the visual display was missing.

## Root Cause
The issue was in the menu rendering logic in `scripts/ui/menu.js`. The arrowhead menu item was being rendered to the DOM correctly, but it was not being added to the `allItems` array that gets processed for `customLabel` functions. This meant that while the button was created and clickable, its `customLabel` function was never called, so no image was displayed.

**The Problem:**
- Line 389: Arrowhead item was rendered to DOM: `menuElement.appendChild(renderMenuButton(arrowHeadItem))`
- Lines 400-410: Arrowhead item was NOT added to `allItems` array
- Lines 418-422: `customLabel` functions are only called for items in `allItems` array

**Result:** Button exists but has no visual content because `customLabel` is never called.

## Fix
Added the arrowhead item to the `allItems` array when it's rendered, ensuring its `customLabel` function gets called:

```javascript
// Add the items that were actually rendered
if (hasAnySelection) {
  // Add color item only if it was rendered (single type selection)
  if (!(hasStickiesSelected && hasConnectorsSelected)) {
    const colorItem = selectionDependentItems.find(item => item.className === "change-color");
    if (colorItem) allItems.push(colorItem);
  }
  
  // Add arrowhead item only if it was rendered (when connectors are selected)
  if (hasConnectorsSelected) {
    const arrowHeadItem = selectionDependentItems.find(item => item.className === "change-arrow-head");
    if (arrowHeadItem) allItems.push(arrowHeadItem);
  }
  
  const deleteItem = selectionDependentItems.find(item => item.className === "delete");
  if (deleteItem) allItems.push(deleteItem);
}
```

## Files Involved
- `scripts/ui/menu.js` - Fixed the menu rendering logic to include arrowhead item in `allItems` array

## Code Snippets
The fix was applied to lines 408-412 in `scripts/ui/menu.js`, adding the missing logic to include the arrowhead item in the `allItems` array when connectors are selected.

## Testing
The fix ensures that:
1. The arrowhead menu item displays the current arrowhead icon when connectors are selected
2. The icon updates correctly when the arrowhead type changes
3. The functionality remains unchanged - users can still click to cycle through arrowhead types
4. No label text is shown (as intended) - only the icon