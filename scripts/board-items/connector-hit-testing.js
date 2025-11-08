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
 * Visual stacking is determined by zIndex values, not DOM order.
 * @param {HTMLElement} clickedConnectorContainer - The connector container that was clicked
 * @param {HTMLElement} boardElement - The board container element
 * @param {Object} board - Board instance to access connector data
 * @returns {HTMLElement[]} Array of connector containers below the clicked one (visually), sorted by zIndex descending
 */
export function getConnectorsBelowPoint(clickedConnectorContainer, boardElement, board) {
  if (!clickedConnectorContainer || !boardElement) {
    console.warn('[ConnectorHitTesting] Missing parameters', { clickedConnectorContainer, boardElement });
    return [];
  }
  
  if (!board) {
    console.warn('[ConnectorHitTesting] Board parameter missing, falling back to DOM order');
    // Fallback to old behavior if board is not provided
    const allConnectors = Array.from(boardElement.querySelectorAll('.connector-container'));
    const clickedIndex = allConnectors.indexOf(clickedConnectorContainer);
    if (clickedIndex === -1) {
      return [];
    }
    return allConnectors.slice(0, clickedIndex).reverse();
  }
  
  // Extract clicked connector's ID from class name
  const clickedConnectorIdClass = Array.from(clickedConnectorContainer.classList).find(cls => 
    cls.startsWith('connector-') && cls !== 'connector-container'
  );
  const clickedConnectorId = clickedConnectorIdClass ? clickedConnectorIdClass.replace('connector-', '') : null;
  
  if (!clickedConnectorId) {
    console.warn('[ConnectorHitTesting] Could not extract connector ID from clicked container');
    return [];
  }
  
  // Get clicked connector's zIndex
  let clickedZIndex;
  try {
    const clickedConnector = board.getConnectorSafe(clickedConnectorId);
    clickedZIndex = clickedConnector?.zIndex;
  } catch (error) {
    console.warn('[ConnectorHitTesting] Error getting clicked connector:', error);
    return [];
  }
  
  // If clicked connector has no zIndex, default to 0
  if (clickedZIndex === undefined || clickedZIndex === null) {
    clickedZIndex = 0;
  }
  
  // Get all connector containers
  const allConnectors = Array.from(boardElement.querySelectorAll('.connector-container'));
  if (window.DEBUG_MODE) {
    console.log('[ConnectorHitTesting] All connectors found:', allConnectors.length);
    console.log('[ConnectorHitTesting] Clicked connector zIndex:', clickedZIndex);
  }
  
  // Filter to connectors with lower zIndex values (visually below)
  const connectorsBelow = [];
  for (const container of allConnectors) {
    // Skip the clicked connector itself
    if (container === clickedConnectorContainer) {
      continue;
    }
    
    // Extract connector ID from class name
    const connectorIdClass = Array.from(container.classList).find(cls => 
      cls.startsWith('connector-') && cls !== 'connector-container'
    );
    const connectorId = connectorIdClass ? connectorIdClass.replace('connector-', '') : null;
    
    if (!connectorId) {
      continue;
    }
    
    // Get connector's zIndex
    let connectorZIndex;
    try {
      const connector = board.getConnectorSafe(connectorId);
      connectorZIndex = connector?.zIndex;
    } catch (error) {
      // Skip connectors that can't be accessed
      continue;
    }
    
    // If connector has no zIndex, default to 0
    if (connectorZIndex === undefined || connectorZIndex === null) {
      connectorZIndex = 0;
    }
    
    // Only include connectors with lower zIndex (visually below)
    if (connectorZIndex < clickedZIndex) {
      connectorsBelow.push({ container, zIndex: connectorZIndex, id: connectorId });
    }
  }
  
  // Sort by zIndex descending (top-most lower connectors first)
  connectorsBelow.sort((a, b) => b.zIndex - a.zIndex);
  
  if (window.DEBUG_MODE) {
    console.log('[ConnectorHitTesting] Clicked connector ID:', clickedConnectorId, 'zIndex:', clickedZIndex);
    console.log('[ConnectorHitTesting] Connectors below:', connectorsBelow.length);
    connectorsBelow.forEach(c => {
      console.log('[ConnectorHitTesting]   - Connector', c.id, 'zIndex:', c.zIndex);
    });
  }
  
  // Return just the containers, sorted by zIndex descending
  return connectorsBelow.map(item => item.container);
}

