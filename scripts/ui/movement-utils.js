/**
 * Movement Utilities
 * Centralized movement logic for all board items (stickies, images, connectors)
 * Extracted from keyboard handlers to be reused by drag implementations
 */

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
  // Move stickies
  selectedStickies.forEach((id) => {
    moveItem(id, dx, dy, board, 'sticky');
  });
  
  // Move images
  selectedImages.forEach((id) => {
    moveItem(id, dx, dy, board, 'image');
  });
  
  // Move connectors
  selectedConnectors.forEach((id) => {
    moveItem(id, dx, dy, board, 'connector');
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
