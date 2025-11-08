import { getPlugin, getAllPlugins } from '../board-items/plugin-registry.js';

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
  const plugins = getAllPlugins();
  const appState = board.getAppState ? board.getAppState() : window.appState;
  
  // Helper to get selection for a plugin type (backward compatibility)
  const getSelectionForPlugin = (plugin, selectedStickies) => {
    const type = plugin.getType();
    // Backward compatibility: map known types to selection objects
    // In the future, this should use SelectionManager
    if (type === 'sticky' && selectedStickies) {
      return selectedStickies;
    }
    // Images don't have colors, so we skip them
    // In the future, selections could be passed as a map
    return null;
  };
  
  // Collect all selections that support colors
  const selectionsWithColors = [];
  plugins.forEach(plugin => {
    const type = plugin.getType();
    const palette = plugin.getColorPalette();
    if (palette && palette.length > 0) {
      const selection = getSelectionForPlugin(plugin, selectedStickies);
      if (selection && selection.hasItems && selection.hasItems()) {
        selectionsWithColors.push({ plugin, type, selection, palette });
      }
    }
  });
  
  // Add connectors (not a plugin, but has colors)
  if (selectedConnectors && selectedConnectors.hasItems && selectedConnectors.hasItems()) {
    selectionsWithColors.push({ 
      plugin: null, 
      type: 'connector', 
      selection: selectedConnectors, 
      palette: connectorColorPalette 
    });
  }
  
  const hasSelectedItems = selectionsWithColors.length > 0;
  
  if (hasSelectedItems) {
    let newColor = currentColor;
    
    if (multipleSelectedHaveSameColor() || singleSelectedHasCurrentColor()) {
      newColor = nextColor();
    }
    
    // Update all selected items that support colors
    selectionsWithColors.forEach(({ plugin, type, selection }) => {
      if (type === 'connector') {
        selection.forEach((id) => {
          board.updateConnectorColor(id, newColor);
        });
      } else if (plugin) {
        selection.forEach((id) => {
          plugin.updateItem(board, id, { color: newColor });
        });
      }
    });
    
    // Update current colors for each plugin type
    selectionsWithColors.forEach(({ plugin, type }) => {
      if (type === 'connector') {
        appState.ui.currentConnectorColor = newColor;
      } else if (plugin) {
        const colorKey = `current${type.charAt(0).toUpperCase() + type.slice(1)}Color`;
        appState.ui[colorKey] = newColor;
      }
    });
    
    // Legacy compatibility
    appState.ui.currentColor = newColor;
    
    return newColor;
  } else {
    // No selection - cycle through colors for future items
    // Use first plugin's palette as default, or sticky palette
    const defaultPalette = plugins.find(p => p.getColorPalette()?.length > 0)?.getColorPalette() || stickyColorPalette;
    const newColor = nextColorFromPalette(defaultPalette);
    
    // Update all plugin colors
    plugins.forEach(plugin => {
      const type = plugin.getType();
      const palette = plugin.getColorPalette();
      if (palette && palette.length > 0) {
        const colorKey = `current${type.charAt(0).toUpperCase() + type.slice(1)}Color`;
        appState.ui[colorKey] = newColor;
      }
    });
    appState.ui.currentConnectorColor = newColor;
    appState.ui.currentColor = newColor; // Legacy compatibility
    
    return newColor;
  }

  function nextColor() {
    // Determine which palette to use based on selections
    let palette = stickyColorPalette; // Default
    
    if (selectionsWithColors.length === 1) {
      // Single selection type - use its palette
      palette = selectionsWithColors[0].palette;
    } else if (selectionsWithColors.length > 1) {
      // Multiple types selected - prefer first plugin palette over connector
      const pluginSelection = selectionsWithColors.find(s => s.plugin);
      if (pluginSelection) {
        palette = pluginSelection.palette;
      } else {
        palette = connectorColorPalette;
      }
    }
    
    return nextColorFromPalette(palette);
  }
  
  function nextColorFromPalette(palette) {
    const delta = reverse ? -1 : 1;
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
    selectionsWithColors.forEach(({ plugin, type, selection }) => {
      if (type === 'connector') {
        selection.forEach((id) => {
          try {
            const connector = board.getConnector(id);
            colors.push(connector.color || "#000000");
          } catch (e) {
            // Item not found
          }
        });
      } else if (plugin) {
        selection.forEach((id) => {
          try {
            const item = board.getBoardItemByType(type, id);
            if (item && item.color) {
              colors.push(item.color);
            }
          } catch (e) {
            // Item not found
          }
        });
      }
    });
    return colors;
  }
}
