/**
 * Creates the DOM structure for a sticky note container
 * 
 * @param {string} stickyIdClass - CSS class name for the sticky (e.g., "sticky-1")
 * @returns {HTMLElement} Container element with references to sticky and inputElement
 */
export function createStickyContainerDOM(stickyIdClass) {
  const container = document.createElement("div");
  container.innerHTML =
    '<div class="sticky"><textarea class="text-input text" rows="1"></textarea></div>' +
    '<div class="resize-handle resize-handle-top"></div>' +
    '<div class="resize-handle resize-handle-right"></div>' +
    '<div class="resize-handle resize-handle-bottom"></div>' +
    '<div class="resize-handle resize-handle-left"></div>';
  container.classList.add(stickyIdClass);
  container.inputElement = container.querySelector(".text-input");
  container.sticky = container.querySelector(".sticky");
  container.classList.add("sticky-container");
  // Custom drag is now handled by the state machine - no HTML5 draggable needed
  return container;
}

/**
 * Removes 'px' suffix from a CSS size string and returns the numeric value
 * @param {string} s - CSS size string (e.g., "100px")
 * @returns {number} Numeric value
 */
export function removePx(s) {
  return +s.substring(0, s.length - 2);
}
