/**
 * Creates the DOM structure for a connector (arrow between stickies)
 * 
 * @param {string} connectorIdClass - CSS class name for the connector (e.g., "connector-1")
 * @param {string} id - Connector ID
 * @param {Object} selectedConnectors - Selection management object
 * @returns {HTMLElement} Container element with SVG
 */
export function createConnectorDOM(connectorIdClass, id, selectedConnectors) {
  const container = document.createElement("div");
  container.classList.add(connectorIdClass);
  container.classList.add("connector-container");
  
  // Create SVG element for the arrow
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("connector-svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  
  // Create defs for arrow markers
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  svg.appendChild(defs);
  
  // Line path
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.classList.add("connector-path");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#444");
  path.setAttribute("stroke-width", "2");
  svg.appendChild(path);
  
  container.appendChild(svg);
  container.svg = svg;
  container.path = path;
  container.defs = defs;
  
  // Click handler for selection
  container.onclick = (event) => {
    event.stopPropagation();
    if (event.shiftKey) {
      selectedConnectors.toggleSelected(id);
    } else {
      selectedConnectors.replaceSelection(id);
    }
  };
  
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

/**
 * Calculate the point where a line from center intersects the sticky edge
 * @param {number} centerX - Center X of sticky
 * @param {number} centerY - Center Y of sticky
 * @param {number} targetX - Target X to point towards
 * @param {number} targetY - Target Y to point towards
 * @param {number} stickySize - Size of the sticky
 * @returns {Object} {x, y} coordinates of intersection point
 */
export function calculateEdgePoint(centerX, centerY, targetX, targetY, stickySize) {
  const halfSize = stickySize / 2;
  const dx = targetX - centerX;
  const dy = targetY - centerY;
  const angle = Math.atan2(dy, dx);
  
  // Calculate intersection with the square edge
  const absTanAngle = Math.abs(Math.tan(angle));
  
  if (absTanAngle <= 1) {
    // Intersects left or right edge
    const x = centerX + (dx > 0 ? halfSize : -halfSize);
    const y = centerY + (dx > 0 ? halfSize : -halfSize) * Math.tan(angle);
    return { x, y };
  } else {
    // Intersects top or bottom edge
    const x = centerX + (dy > 0 ? halfSize : -halfSize) / Math.tan(angle);
    const y = centerY + (dy > 0 ? halfSize : -halfSize);
    return { x, y };
  }
}
