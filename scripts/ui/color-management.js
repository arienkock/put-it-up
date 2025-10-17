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
  "#8B6F47", // Darker khaki
  "#C49B3E", // Darker #F8C471
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
 * @param {string} currentColor - Current color
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
      board.updateColor(id, newColor);
    });
    
    // Update selected connectors
    if (selectedConnectors) {
      selectedConnectors.forEach((id) => {
        board.updateConnectorColor(id, newColor);
      });
    }
    
    return newColor;
  } else {
    return nextColor();
  }

  function nextColor() {
    const delta = reverse ? -1 : 1;
    const palette = getCurrentPalette();
    let index =
      (palette.findIndex((c) => c === currentColor) + delta) %
      palette.length;
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
    selectedStickies.forEach((id) => colors.push(board.getSticky(id).color));
    if (selectedConnectors) {
      selectedConnectors.forEach((id) => {
        const connector = board.getConnector(id);
        colors.push(connector.color || "#000000"); // Default connector color (black)
      });
    }
    return colors;
  }
}
