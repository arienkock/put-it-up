import { getPlugin } from '../board-items/plugin-registry.js';

export const stickyColorPalette = [
  "khaki",
  "#F8C471",
  "#AED6F1",
  "#82E0AA",
  "#F1948A",
  "#C39BD3",
];
Object.freeze(stickyColorPalette);

export const connectorColorPalette = [
  "#000000", // Black (default)
  "#7A9BC4", // Darker #AED6F1
  "#5BA67A", // Darker #82E0AA
  "#B86B5A", // Darker #F1948A
  "#8B6B9A", // Darker #C39BD3
];
Object.freeze(connectorColorPalette);

// Legacy export for backward compatibility
export const colorPalette = stickyColorPalette;

/**
 * Changes the color, either for selected stickies/connectors or the current drawing color
 * @param {Object} board - Board instance
 * @param {Object} selectedStickies - Selection instance
 * @param {Object} selectedConnectors - Selection instance for connectors
 * @param {string} currentColor - Current color (legacy)
 * @param {boolean} reverse - If true, cycle backwards through colors
 * @returns {string} New current color
 */
export function changeColor(board, selectedStickies, selectedConnectors, currentColor, reverse) {
  const hasSelectedItems = selectedStickies.hasItems() || (selectedConnectors && selectedConnectors.hasItems());
  
  if (hasSelectedItems) {
    let newColor = currentColor;
    
    if (multipleSelectedHaveSameColor() || singleSelectedHasCurrentColor()) {
      newColor = nextColor();
    }
    
    // Update selected stickies
    selectedStickies.forEach((id) => {
      const plugin = getPlugin('sticky');
      if (plugin) {
        plugin.updateItem(board, id, { color: newColor });
      }
    });
    
    // Update selected connectors
    if (selectedConnectors) {
      selectedConnectors.forEach((id) => {
        board.updateConnectorColor(id, newColor);
      });
    }
    
    // Update the appropriate current color based on what's selected
    const appState = board.getAppState ? board.getAppState() : window.appState;
    if (selectedStickies.hasItems() && (!selectedConnectors || !selectedConnectors.hasItems())) {
      // Only stickies selected - update sticky color
      appState.ui.currentStickyColor = newColor;
    } else if (selectedConnectors && selectedConnectors.hasItems() && !selectedStickies.hasItems()) {
      // Only connectors selected - update connector color
      appState.ui.currentConnectorColor = newColor;
    } else if (selectedStickies.hasItems() && selectedConnectors && selectedConnectors.hasItems()) {
      // Both selected - update both colors
      appState.ui.currentStickyColor = newColor;
      appState.ui.currentConnectorColor = newColor;
    }
    
    // Legacy compatibility
    appState.ui.currentColor = newColor;
    
    return newColor;
  } else {
    // No selection - cycle through colors for future items
    const newColor = nextColor();
    
    // Update both current colors
    const appState = board.getAppState ? board.getAppState() : window.appState;
    appState.ui.currentStickyColor = newColor;
    appState.ui.currentConnectorColor = newColor;
    appState.ui.currentColor = newColor; // Legacy compatibility
    
    return newColor;
  }

  function nextColor() {
    const delta = reverse ? -1 : 1;
    const palette = getCurrentPalette();
    let currentIndex = palette.findIndex((c) => c === currentColor);
    
    // If currentColor is not found in the palette, start from the beginning
    if (currentIndex === -1) {
      currentIndex = reverse ? palette.length - 1 : 0;
    }
    
    let index = (currentIndex + delta) % palette.length;
    if (index < 0) {
      index += palette.length;
    }
    return palette[index];
  }

  function getCurrentPalette() {
    // If only connectors are selected, use connector palette
    if (selectedConnectors && selectedConnectors.hasItems() && !selectedStickies.hasItems()) {
      return connectorColorPalette;
    }
    // If only stickies are selected, use sticky palette
    if (selectedStickies.hasItems() && (!selectedConnectors || !selectedConnectors.hasItems())) {
      return stickyColorPalette;
    }
    // If both are selected or none are selected, use sticky palette as default
    return stickyColorPalette;
  }

  function multipleSelectedHaveSameColor() {
    const colors = selectedColors();
    return colors.length > 1 && colors.every((color) => color === colors[0]);
  }

  function singleSelectedHasCurrentColor() {
    const colors = selectedColors();
    return colors.length === 1 && colors[0] === currentColor;
  }

  function selectedColors() {
    const colors = [];
    selectedStickies.forEach((id) => {
      try {
        const sticky = board.getBoardItemByType('sticky', id);
        colors.push(sticky.color);
      } catch (e) {
        // Item not found
      }
    });
    if (selectedConnectors) {
      selectedConnectors.forEach((id) => {
        const connector = board.getConnector(id);
        colors.push(connector.color || "#000000"); // Default connector color (black)
      });
    }
    return colors;
  }
}
