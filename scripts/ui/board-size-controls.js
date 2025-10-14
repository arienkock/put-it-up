/**
 * Creates and manages the board sizing control UI
 * Allows users to grow or shrink the board in different directions
 * 
 * @param {Object} board - Board instance
 * @param {HTMLElement} root - Root element to attach controls to
 * @param {Event} activatingEvent - The event that triggered the controls
 * @returns {HTMLElement|null} The sizing controls element, or null if already exists
 */
export function createBoardSizeControls(board, root, activatingEvent) {
  const container = document.createElement("div");
  
  // Don't create if already exists
  if (document.querySelector(".sizing-controls")) {
    return null;
  }
  
  container.innerHTML = `<div class="sizing-controls">
    <label for="Grow">Grow</label>
    <input type="radio" id="Grow" name="size-change-direction" value="Grow" checked="checked">
    &nbsp;&nbsp;
    <label for="Shrink">Shrink</label>
    <input type="radio" id="Shrink" name="size-change-direction" value="Shrink">
    <div class="grow-arrows">
      <button class="top">${arrowHTML()}</button>
      <button class="right">${arrowHTML()}</button>
      <button class="bottom">${arrowHTML()}</button>
      <button class="left">${arrowHTML()}</button>
    </div>
  </div>`;
  
  const sizingControls = container.firstElementChild;
  
  // Handle clicks on arrow buttons
  sizingControls.addEventListener("click", (event) => {
    const isGrow = sizingControls.querySelector("#Grow").checked;
    const side = ["top", "right", "bottom", "left"].find((side) =>
      isChildOf(event.target, side)
    );
    if (side) {
      board.changeSize(isGrow, side);
    }
  });
  
  // Close controls when clicking outside
  document.body.addEventListener("click", (event) => {
    if (
      event !== activatingEvent &&
      !isChildOf(event.target, "sizing-controls")
    ) {
      sizingControls.remove();
    }
  });
  
  // Close controls on Escape key
  document.body.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      sizingControls.remove();
    }
  });
  
  root.appendChild(sizingControls);
  return sizingControls;
}

/**
 * Returns SVG markup for an arrow icon
 * @returns {string} SVG HTML string
 */
function arrowHTML() {
  return `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Layer_1" x="0px" y="0px" width="25px" height="25px" viewBox="0 0 512 512" enable-background="new 0 0 512 512" xml:space="preserve">
  <path class="svg-arrow" fill="#010101" d="M128,256L384,0v128L256,256l128,128v128L128,256z"/>
</svg>
  `;
}

/**
 * Checks if an element is a child of an element with the given class name
 * @param {HTMLElement} element - Element to check
 * @param {string} cn - Class name to look for
 * @returns {boolean} True if element is child of element with class name
 */
function isChildOf(element, cn) {
  if (element.classList && element.classList.contains(cn)) {
    return true;
  }
  return element.parentNode && isChildOf(element.parentNode, cn);
}
