export const zoomScale = [0.3, 0.6, 1];

/**
 * Changes the zoom level by cycling through available zoom scales
 * @param {number} currentScale - Current zoom scale value
 * @param {boolean} reverse - If true, cycle backwards through zoom levels
 * @returns {number} New zoom scale value
 */
export function changeZoomLevel(currentScale, reverse) {
  let index =
    zoomScale.findIndex((v) => v === currentScale) + (reverse ? -1 : 1);
  return zoomScale[index % zoomScale.length];
}

/**
 * Applies zoom styling to board elements
 * @param {HTMLElement} domElement - The board DOM element
 * @param {HTMLElement} boardContainer - The board container element
 * @param {HTMLElement} root - The root element
 * @param {number} boardScale - Current board scale
 * @param {Object} size - Board size {width, height}
 */
export function applyZoomToBoard(domElement, boardContainer, root, boardScale, size) {
  // Note: root (.app) should remain at viewport size (100vh x 100vw)
  // Scrolling is handled by .board-scroll-container
  domElement.style.width = size.width + "px";
  domElement.style.height = size.height + "px";
  boardContainer.style.width = size.width * boardScale + "px";
  boardContainer.style.height = size.height * boardScale + "px";
  domElement.style.transform = `scale3d(${boardScale},${boardScale},1)`;
  
  if (boardScale < 0.5) {
    domElement.classList.add("sticky-text-hidden");
  } else {
    domElement.classList.remove("sticky-text-hidden");
  }
}
