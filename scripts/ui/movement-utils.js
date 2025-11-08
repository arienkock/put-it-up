/**
 * Movement Utilities
 * Centralized movement logic for all board items (plugins and connectors)
 * Extracted from keyboard handlers to be reused by drag implementations
 */

import { getAllPlugins } from '../board-items/plugin-registry.js';

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
  if (type === 'connector') {
    board.moveConnector(id, dx, dy);
    return;
  }
  
  // Plugin item - use generic board methods
  const plugins = getAllPlugins();
  const plugin = plugins.find(p => p.getType() === type);
  if (plugin) {
    const location = board.getBoardItemLocationByType(type, id);
    const newLocation = {
      x: location.x + dx,
      y: location.y + dy,
    };
    board.moveBoardItem(type, id, newLocation);
  } else {
    console.warn(`Unknown item type for movement: ${type}`);
  }
}

/**
 * Move all items in a selection by delta coordinates
 * 
 * @param {number} dx - Delta X movement
 * @param {number} dy - Delta Y movement
 * @param {Object} board - Board instance
 * @param {Object} selectedStickies - Selection management object for stickies (for backward compat)
 * @param {Object} selectedImages - Selection management object for images (for backward compat)
 * @param {Object} selectedConnectors - Selection management object for connectors
 */
export function moveSelection(dx, dy, board, selectedStickies, selectedImages, selectedConnectors) {
  const plugins = getAllPlugins();
  const itemIdsByType = {};
  const originalLocationsByType = {};
  
  // Collect IDs and track original locations for all plugin types
  plugins.forEach(plugin => {
    const type = plugin.getType();
    const selectionType = plugin.getSelectionType();
    
    // Get selection - try selectionType first, then type, then fallback to backward compat
    let selection = null;
    if (selectionType === 'stickies' && selectedStickies) {
      selection = selectedStickies;
    } else if (selectionType === 'images' && selectedImages) {
      selection = selectedImages;
    }
    
    if (selection && selection.hasItems && selection.hasItems()) {
      itemIdsByType[type] = [];
      originalLocationsByType[type] = new Map();
      
      selection.forEach((id) => {
        itemIdsByType[type].push(id);
        originalLocationsByType[type].set(id, board.getBoardItemLocationByType(type, id));
      });
    }
  });
  
  // Move all plugin items
  Object.entries(itemIdsByType).forEach(([type, ids]) => {
    ids.forEach((id) => {
      moveItem(id, dx, dy, board, type);
    });
  });
  
  // Move connectors
  if (selectedConnectors && selectedConnectors.hasItems && selectedConnectors.hasItems()) {
    selectedConnectors.forEach((id) => {
      moveItem(id, dx, dy, board, 'connector');
    });
  }
  
  // Calculate actual deltas after movement (accounting for snapping)
  // and move connectors for each item with its actual delta
  // Track which connectors have been moved to avoid double movement
  const movedConnectors = new Set();
  
  // Process each plugin type
  Object.entries(originalLocationsByType).forEach(([type, originalLocations]) => {
    originalLocations.forEach((originalLocation, id) => {
      const newLocation = board.getBoardItemLocationByType(type, id);
      const actualDeltaX = newLocation.x - originalLocation.x;
      const actualDeltaY = newLocation.y - originalLocation.y;
      
      // Only move connectors if movement exceeds threshold
      const movementThreshold = 1; // pixels - only move if actual movement is significant
      const movementDistance = Math.sqrt(actualDeltaX * actualDeltaX + actualDeltaY * actualDeltaY);
      
      if (movementDistance > movementThreshold) {
        board.moveConnectorsConnectedToItems({ [type]: [id] }, actualDeltaX, actualDeltaY, movedConnectors);
      }
    });
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
  if (type === 'connector') {
    board.moveConnector(id, dx, dy);
    return;
  }
  
  // Plugin item - use generic board methods
  const newLocation = {
    x: originalLocation.x + dx,
    y: originalLocation.y + dy
  };
  
  const plugins = getAllPlugins();
  const plugin = plugins.find(p => p.getType() === type);
  if (plugin) {
    board.moveBoardItem(type, id, newLocation);
  } else {
    console.warn(`Unknown item type for movement: ${type}`);
  }
}
