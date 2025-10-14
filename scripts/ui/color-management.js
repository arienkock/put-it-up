export const colorPalette = [
  "khaki",
  "#F8C471",
  "#AED6F1",
  "#82E0AA",
  "#F1948A",
  "#C39BD3",
];
Object.freeze(colorPalette);

/**
 * Changes the color, either for selected stickies or the current drawing color
 * @param {Object} board - Board instance
 * @param {Object} selectedStickies - Selection instance
 * @param {string} currentColor - Current color
 * @param {boolean} reverse - If true, cycle backwards through colors
 * @returns {string} New current color
 */
export function changeColor(board, selectedStickies, currentColor, reverse) {
  if (selectedStickies.hasItems()) {
    let newColor = currentColor;
    
    if (multipleSelectedHaveSameColor() || singleSelectedHasCurrentColor()) {
      newColor = nextColor();
    }
    
    selectedStickies.forEach((id) => {
      board.updateColor(id, newColor);
    });
    
    return newColor;
  } else {
    return nextColor();
  }

  function nextColor() {
    const delta = reverse ? -1 : 1;
    let index =
      (colorPalette.findIndex((c) => c === currentColor) + delta) %
      colorPalette.length;
    if (index < 0) {
      index += colorPalette.length;
    }
    return colorPalette[index];
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
    return colors;
  }
}
