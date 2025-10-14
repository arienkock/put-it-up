export const DEFAULT_STICKY_COLOR = "khaki";
export const STICKY_SIZE = 100; // pixels

/**
 * Applies all styling to a sticky note element
 * 
 * @param {Object} sticky - Sticky data object with location and color
 * @param {HTMLElement} container - Container element for the sticky
 * @param {boolean} animateMove - Whether to animate position changes
 * @param {boolean} stickyIsSelected - Whether the sticky is currently selected
 * @param {Object} origin - Board origin point {x, y}
 */
export function setStickyStyles(
  sticky,
  container,
  animateMove,
  stickyIsSelected,
  origin
) {
  const { sticky: stickyElement } = container;
  
  if (animateMove) {
    container.classList.add("animate-move");
  } else {
    container.classList.remove("animate-move");
  }
  
  container.style.left = sticky.location.x - origin.x + "px";
  container.style.top = sticky.location.y - origin.y + "px";
  
  if (stickyIsSelected) {
    container.classList.add("selected");
    container.style.backgroundColor = "";
  } else {
    container.classList.remove("selected");
  }
  
  const sizeXUnits = (sticky.size && sticky.size.x) || 1;
  const sizeYUnits = (sticky.size && sticky.size.y) || 1;
  const widthPx = STICKY_SIZE * sizeXUnits + "px";
  const heightPx = STICKY_SIZE * sizeYUnits + "px";
  container.style.width = widthPx;
  container.style.height = heightPx;
  stickyElement.style.backgroundColor = sticky.color || DEFAULT_STICKY_COLOR;
}
