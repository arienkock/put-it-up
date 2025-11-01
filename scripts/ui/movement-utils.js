/**
 * Movement Utilities
 * Centralized movement logic for all board items (stickies, images, connectors)
 * Extracted from keyboard handlers to be reused by drag implementations
 */

/**
 * Extract coordinates from touch or mouse event
 * Returns clientX/Y for drag operations (matches mouse event behavior)
 * 
 * @param {Event} event - TouchEvent or MouseEvent
 * @returns {Object} {x, y} coordinates or null if invalid
 */
export function getEventCoordinates(event) {
  // Handle touch events
  if (event.touches && event.touches.length > 0) {
    return {
      clientX: event.touches[0].clientX,
      clientY: event.touches[0].clientY
    };
  }
  
  // Handle touch end events (use changedTouches)
  if (event.changedTouches && event.changedTouches.length > 0) {
    return {
      clientX: event.changedTouches[0].clientX,
      clientY: event.changedTouches[0].clientY
    };
  }
  
  // Handle mouse events
  if (typeof event.clientX === 'number' && typeof event.clientY === 'number') {
    return {
      clientX: event.clientX,
      clientY: event.clientY
    };
  }
  
  return null;
}

/**
 * Extract page coordinates from touch or mouse event
 * Returns pageX/Y for resize operations (matches mouse event behavior)
 * 
 * @param {Event} event - TouchEvent or MouseEvent
 * @returns {Object} {x, y} coordinates or null if invalid
 */
export function getEventPageCoordinates(event) {
  // Handle touch events
  if (event.touches && event.touches.length > 0) {
    return {
      pageX: event.touches[0].pageX,
      pageY: event.touches[0].pageY
    };
  }
  
  // Handle touch end events (use changedTouches)
  if (event.changedTouches && event.changedTouches.length > 0) {
    return {
      pageX: event.changedTouches[0].pageX,
      pageY: event.changedTouches[0].pageY
    };
  }
  
  // Handle mouse events
  if (typeof event.pageX === 'number' && typeof event.pageY === 'number') {
    return {
      pageX: event.pageX,
      pageY: event.pageY
    };
  }
  
  return null;
}

/**
 * Move a single item by delta coordinates
 * 
 * @param {string} id - Item ID
 * @param {number} dx - Delta X movement
 * @param {number} dy - Delta Y movement
 * @param {Object} board - Board instance
 * @param {string} type - Item type ('sticky', 'image', 'connector')
 */
export function moveItem(id, dx, dy, board, type) {
  switch (type) {
    case 'sticky':
      const stickyLocation = board.getStickyLocation(id);
      const newStickyLocation = {
        x: stickyLocation.x + dx,
        y: stickyLocation.y + dy,
      };
      board.moveSticky(id, newStickyLocation);
      break;
      
    case 'image':
      const imageLocation = board.getImageLocation(id);
      const newImageLocation = {
        x: imageLocation.x + dx,
        y: imageLocation.y + dy,
      };
      board.moveImage(id, newImageLocation);
      break;
      
    case 'connector':
      board.moveConnector(id, dx, dy);
      break;
      
    default:
      console.warn(`Unknown item type for movement: ${type}`);
  }
}

/**
 * Move all items in a selection by delta coordinates
 * 
 * @param {number} dx - Delta X movement
 * @param {number} dy - Delta Y movement
 * @param {Object} board - Board instance
 * @param {Object} selectedStickies - Selection management object for stickies
 * @param {Object} selectedImages - Selection management object for images
 * @param {Object} selectedConnectors - Selection management object for connectors
 */
export function moveSelection(dx, dy, board, selectedStickies, selectedImages, selectedConnectors) {
  // Collect IDs and track original locations
  const stickyIds = [];
  const stickyOriginalLocations = new Map();
  selectedStickies.forEach((id) => {
    stickyIds.push(id);
    stickyOriginalLocations.set(id, board.getStickyLocation(id));
  });
  
  const imageIds = [];
  const imageOriginalLocations = new Map();
  selectedImages.forEach((id) => {
    imageIds.push(id);
    imageOriginalLocations.set(id, board.getImageLocation(id));
  });
  
  // Move stickies
  stickyIds.forEach((id) => {
    moveItem(id, dx, dy, board, 'sticky');
  });
  
  // Move images
  imageIds.forEach((id) => {
    moveItem(id, dx, dy, board, 'image');
  });
  
  // Move connectors
  selectedConnectors.forEach((id) => {
    moveItem(id, dx, dy, board, 'connector');
  });
  
  // Calculate actual deltas after movement (accounting for snapping)
  // and move connectors for each item with its actual delta
  // Track which connectors have been moved to avoid double movement
  const movedConnectors = new Set();
  
  stickyIds.forEach((id) => {
    const originalLocation = stickyOriginalLocations.get(id);
    const newLocation = board.getStickyLocation(id);
    const actualDeltaX = newLocation.x - originalLocation.x;
    const actualDeltaY = newLocation.y - originalLocation.y;
    
    // Only move connectors if movement exceeds threshold (same as sticky movement threshold)
    const movementThreshold = 1; // pixels - only move if actual movement is significant
    const movementDistance = Math.sqrt(actualDeltaX * actualDeltaX + actualDeltaY * actualDeltaY);
    
    if (movementDistance > movementThreshold) {
      board.moveConnectorsConnectedToItems([id], [], actualDeltaX, actualDeltaY, movedConnectors);
    }
  });
  
  imageIds.forEach((id) => {
    const originalLocation = imageOriginalLocations.get(id);
    const newLocation = board.getImageLocation(id);
    const actualDeltaX = newLocation.x - originalLocation.x;
    const actualDeltaY = newLocation.y - originalLocation.y;
    
    // Only move connectors if movement exceeds threshold
    const movementThreshold = 1; // pixels - only move if actual movement is significant
    const movementDistance = Math.sqrt(actualDeltaX * actualDeltaX + actualDeltaY * actualDeltaY);
    
    if (movementDistance > movementThreshold) {
      board.moveConnectorsConnectedToItems([], [id], actualDeltaX, actualDeltaY, movedConnectors);
    }
  });
}

/**
 * Calculate movement delta from mouse coordinates
 * Converts pixel movement to board coordinates accounting for zoom
 * 
 * @param {number} startX - Starting X coordinate (pixels)
 * @param {number} startY - Starting Y coordinate (pixels)
 * @param {number} currentX - Current X coordinate (pixels)
 * @param {number} currentY - Current Y coordinate (pixels)
 * @param {number} boardScale - Current board zoom scale
 * @returns {Object} {dx, dy} movement in board coordinates
 */
export function calculateMovementDelta(startX, startY, currentX, currentY, boardScale) {
  const pixelDx = currentX - startX;
  const pixelDy = currentY - startY;
  
  return {
    dx: pixelDx / boardScale,
    dy: pixelDy / boardScale
  };
}

/**
 * Apply grid snapping to coordinates for stickies
 * 
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} gridSize - Grid size in pixels
 * @returns {Object} {x, y} snapped coordinates
 */
export function snapToGrid(x, y, gridSize) {
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize
  };
}

/**
 * Check if coordinates are within board boundaries
 * 
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Object} board - Board instance
 * @returns {boolean} True if within boundaries
 */
export function isWithinBoardBoundaries(x, y, board) {
  const boardSize = board.getBoardSize();
  return x >= 0 && x <= boardSize.width && y >= 0 && y <= boardSize.height;
}

/**
 * Constrain coordinates to board boundaries
 * 
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Object} board - Board instance
 * @returns {Object} {x, y} constrained coordinates
 */
export function constrainToBoardBoundaries(x, y, board) {
  const boardSize = board.getBoardSize();
  return {
    x: Math.max(0, Math.min(x, boardSize.width)),
    y: Math.max(0, Math.min(y, boardSize.height))
  };
}

/**
 * Move item from original location by delta
 * Used for drag operations where we track original position
 * 
 * @param {string} id - Item ID
 * @param {Object} originalLocation - Original location {x, y}
 * @param {number} dx - Delta X movement
 * @param {number} dy - Delta Y movement
 * @param {Object} board - Board instance
 * @param {string} type - Item type ('sticky', 'image', 'connector')
 */
export function moveItemFromOriginal(id, originalLocation, dx, dy, board, type) {
  const newLocation = {
    x: originalLocation.x + dx,
    y: originalLocation.y + dy
  };
  
  switch (type) {
    case 'sticky':
      board.moveSticky(id, newLocation);
      break;
    case 'image':
      board.moveImage(id, newLocation);
      break;
    case 'connector':
      board.moveConnector(id, dx, dy);
      break;
    default:
      console.warn(`Unknown item type for movement: ${type}`);
  }
}
