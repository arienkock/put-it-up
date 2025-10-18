# Connector Color Issues

## Root Cause
Connectors are experiencing color issues:
1. **Color inheritance**: Connectors are using colors from the sticky palette instead of their own color
2. **Color changes during movement**: Connector colors change when items are moved

## Investigation Results

### Issue 1: Color Inheritance
The connector creation logic correctly uses `appState.ui.currentColor`, but there might be an issue with how the current color is being set or maintained.

### Issue 2: Color Changes During Movement
Found potential causes:
1. **Menu color sync**: In `scripts/ui/menu.js`, when a connector is selected, it updates the current color:
   ```javascript
   // Sync color selector with selected connector
   if (selectedConnectors.hasItems() && selectedConnectors.size() === 1) {
     let selectedConnectorId;
     selectedConnectors.forEach((id) => (selectedConnectorId = id));
     const connector = board.getConnectorSafe(selectedConnectorId);
     if (connector && connector.color) {
       appState.ui.currentColor = connector.color;
     }
   }
   ```

2. **Color management updates**: In `scripts/ui/color-management.js`, when the color changes, it updates all selected connectors:
   ```javascript
   // Update selected connectors
   if (selectedConnectors) {
     selectedConnectors.forEach((id) => {
       board.updateConnectorColor(id, newColor);
     });
   }
   ```

## Potential Solutions

### Solution 1: Separate Connector Color Management
- Create separate color management for connectors
- Don't sync connector colors with the current UI color
- Maintain connector colors independently

### Solution 2: Fix Color Sync Logic
- Only sync colors when explicitly requested
- Don't automatically update connector colors when UI color changes
- Preserve connector colors during movement

### Solution 3: Debug Color Flow
- Add debug logging to track color changes
- Identify exactly when and why colors are changing
- Fix the specific color update points

## Files to Investigate
- `scripts/ui/menu.js` - Color sync logic
- `scripts/ui/color-management.js` - Color update logic
- `scripts/board-items/connector-events.js` - Connector creation color
- `scripts/board-items/connector-styling.js` - Connector rendering color

## Status
🔍 **INVESTIGATING** - Need to identify exact color update points and fix color management logic
