/**
 * Hit testing utilities for connector click pass-through
 */

/**
 * Checks if a click event actually hit a connector's path stroke
 * @param {MouseEvent} event - The click event
 * @param {SVGPathElement} pathElement - The connector's path element
 * @returns {boolean} True if the click hit the stroke
 */
export function isClickOnConnectorStroke(event, pathElement) {
  if (!pathElement || !pathElement.getTotalLength) {
    return false;
  }
  
  try {
    // Get the SVG element that contains the path
    const svgElement = pathElement.ownerSVGElement;
    if (!svgElement) {
      return false;
    }
    
    // Get the transformation matrix from the path's coordinate system to screen coordinates
    const ctm = pathElement.getScreenCTM();
    
    if (!ctm) {
      return false;
    }
    
    // Create a point in SVG coordinate space and convert from screen coordinates
    // to the path element's local coordinate system
    const svgPoint = svgElement.createSVGPoint();
    svgPoint.x = event.clientX;
    svgPoint.y = event.clientY;
    
    // Transform from screen coordinates to path's local coordinate system
    const pathCoord = svgPoint.matrixTransform(ctm.inverse());
    
    // Use isPointInStroke to check if the point is on the path stroke
    // isPointInStroke works in the path element's local coordinate system
    return pathElement.isPointInStroke(pathCoord);
  } catch (error) {
    console.warn('[ConnectorHitTesting] Error checking stroke hit:', error);
    return false;
  }
}

/**
 * Gets all connector containers that appear visually below the clicked connector
 * Since all connectors have z-index: -1, DOM order determines visual stacking.
 * Elements that appear BEFORE the clicked connector in the DOM are visually BELOW it.
 * @param {HTMLElement} clickedConnectorContainer - The connector container that was clicked
 * @param {HTMLElement} boardElement - The board container element
 * @returns {HTMLElement[]} Array of connector containers below the clicked one (visually)
 */
export function getConnectorsBelowPoint(clickedConnectorContainer, boardElement) {
  if (!clickedConnectorContainer || !boardElement) {
    console.warn('[ConnectorHitTesting] Missing parameters', { clickedConnectorContainer, boardElement });
    return [];
  }
  
  const allConnectors = Array.from(boardElement.querySelectorAll('.connector-container'));
  if (window.DEBUG_MODE) {
    console.log('[ConnectorHitTesting] All connectors found:', allConnectors.length);
  }
  
  const clickedIndex = allConnectors.indexOf(clickedConnectorContainer);
  if (window.DEBUG_MODE) {
    console.log('[ConnectorHitTesting] Clicked connector index:', clickedIndex, 'out of', allConnectors.length);
  }
  
  if (clickedIndex === -1) {
    console.warn('[ConnectorHitTesting] Clicked connector not found in all connectors list');
    return [];
  }
  
  // Return all connectors that appear BEFORE this one in the DOM
  // (In DOM order, earlier = visually below since all have z-index: -1)
  // Reverse the order so we test from visually top-most to bottom-most
  const connectorsBelow = allConnectors.slice(0, clickedIndex).reverse();
  if (window.DEBUG_MODE) {
    console.log('[ConnectorHitTesting] Connectors below:', connectorsBelow.length);
  }
  return connectorsBelow;
}

