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
  path.setAttribute("stroke-width", "4");
  svg.appendChild(path);
  
  container.appendChild(svg);
  container.svg = svg;
  container.path = path;
  container.defs = defs;
  
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
 * @param {number} stickyWidth - Width of the sticky
 * @param {number} stickyHeight - Height of the sticky
 * @returns {Object} {x, y} coordinates of intersection point
 */
export function calculateEdgePoint(centerX, centerY, targetX, targetY, stickyWidth, stickyHeight) {
  // Validate inputs to prevent NaN results
  if (typeof centerX !== 'number' || typeof centerY !== 'number' || 
      typeof targetX !== 'number' || typeof targetY !== 'number' || 
      typeof stickyWidth !== 'number' || typeof stickyHeight !== 'number' ||
      isNaN(centerX) || isNaN(centerY) || isNaN(targetX) || isNaN(targetY) || 
      isNaN(stickyWidth) || isNaN(stickyHeight)) {
    console.warn('Invalid inputs to calculateEdgePoint:', { centerX, centerY, targetX, targetY, stickyWidth, stickyHeight });
    return { x: centerX || 0, y: centerY || 0 }; // Return center point as fallback
  }
  
  const halfWidth = stickyWidth / 2;
  const halfHeight = stickyHeight / 2;
  const dx = targetX - centerX;
  const dy = targetY - centerY;

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // Scale to rectangle edge
  const scaleX = absDx !== 0 ? halfWidth / absDx : Infinity;
  const scaleY = absDy !== 0 ? halfHeight / absDy : Infinity;
  const scale = Math.min(scaleX, scaleY);
  const x = centerX + dx * scale;
  const y = centerY + dy * scale;
  
  // Validate result to ensure no NaN values
  if (isNaN(x) || isNaN(y)) {
    // console.warn('calculateEdgePoint returned NaN:', { x, y, centerX, centerY, targetX, targetY, stickyWidth, stickyHeight });
    return { x: centerX, y: centerY }; // Return center point as fallback
  }
  
  return { x, y };
}
