# Connector Inherits Sticky Color Bug

## Bug Description
When drawing a connector while a sticky is selected, the connector incorrectly inherits the sticky's color instead of using the default connector color.

## Root Cause
The issue occurs due to the interaction between two components:

1. **Menu Color Sync** (`scripts/ui/menu.js` lines 193-200): When a sticky is selected, the `syncSelectorsWithSelection()` function updates `appState.ui.currentColor` to match the selected sticky's color:
   ```javascript
   // Sync color selector with selected sticky
   if (selectedStickies.hasItems() && selectedStickies.size() === 1) {
     let selectedStickyId;
     selectedStickies.forEach((id) => (selectedStickyId = id));
     const sticky = board.getStickySafe(selectedStickyId);
     if (sticky && sticky.color) {
       appState.ui.currentColor = sticky.color; // This sets the UI color to sticky color
     }
   }
   ```

2. **Connector Creation** (`scripts/board-items/connector-events.js` line 74): When creating a new connector, it uses `appState.ui.currentColor` as the connector's color:
   ```javascript
   const connectorData = {
     destinationPoint: point,
     arrowHead: appState.ui.currentArrowHead,
     color: appState.ui.currentColor, // This inherits the sticky's color
   };
   ```

## Fix
Changed the connector creation logic to always use a default black color (`#000000`) instead of inheriting from `appState.ui.currentColor`:

```javascript
const connectorData = {
  destinationPoint: point,
  arrowHead: appState.ui.currentArrowHead,
  color: "#000000", // Always use default black color for connectors
};
```

## Files Modified
- `scripts/board-items/connector-events.js` (line 74)

## Code Snippets Involved

### Before Fix
```javascript
// In scripts/board-items/connector-events.js
const connectorData = {
  destinationPoint: point,
  arrowHead: appState.ui.currentArrowHead,
  color: appState.ui.currentColor, // Bug: inherits sticky color
};
```

### After Fix
```javascript
// In scripts/board-items/connector-events.js
const connectorData = {
  destinationPoint: point,
  arrowHead: appState.ui.currentArrowHead,
  color: "#000000", // Always use default black color for connectors
};
```

## Testing
To test the fix:
1. Create a sticky with a specific color (e.g., red)
2. Select the sticky
3. Draw a connector
4. Verify the connector is black, not red

## Impact
- Connectors now consistently use black color regardless of selected sticky color
- Maintains separation between sticky colors and connector colors
- Improves user experience by providing predictable connector appearance
