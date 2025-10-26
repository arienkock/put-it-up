/**
 * Generic interface for board items (stickies, images) that connectors connect to.
 * This abstraction allows connectors to work with any item type without knowing specific details.
 */

/**
 * Z-order layers for board elements
 * Connectors should be rendered first (lowest z-index), then content items (stickies/images)
 */
export const Z_ORDER_LAYERS = {
  CONNECTOR: 0,
  CONTENT: 1
};

/**
 * Determines if a DOM element is a connector
 */
export function isConnectorElement(element) {
  return element.classList.contains("connector-container");
}

/**
 * Determines if a DOM element is an image container
 */
export function isImageElement(element) {
  return element.classList.contains("image-container");
}

/**
 * Determines if a DOM element is a sticky
 */
export function isStickyElement(element) {
  return element.classList.contains("sticky-container");
}

/**
 * Returns the z-order layer for a given DOM element
 */
export function getElementLayer(element) {
  if (isConnectorElement(element)) {
    return Z_ORDER_LAYERS.CONNECTOR;
  }
  return Z_ORDER_LAYERS.CONTENT;
}

/**
 * Checks if an item is a sticky by examining its data structure
 * @param {*} item - Item data from the board
 * @returns {boolean}
 */
export function isStickyItem(item) {
  // Stickies have a `text` property and optional `size` property
  return item && typeof item.text === 'string';
}

/**
 * Checks if an item is an image by examining its data structure
 * @param {*} item - Item data from the board
 * @returns {boolean}
 */
export function isImageItem(item) {
  // Images have `width` and `height` properties (in pixels, not units)
  return item && typeof item.width === 'number' && typeof item.height === 'number';
}

/**
 * Gets normalized bounds for any board item type.
 * Returns center coordinates and dimensions in board pixels.
 * 
 * @param {Object|null} item - Item data (sticky or image)
 * @param {Object} boardOrigin - Board origin {x, y}
 * @param {number} stickyBaseSize - Base size for stickies in pixels
 * @returns {Object|null} Bounds object with {centerX, centerY, width, height} or null if item is null
 */
export function getBoardItemBounds(item, boardOrigin, stickyBaseSize = 70) {
  if (!item) {
    return null;
  }

  if (isStickyItem(item)) {
    // Calculate sticky bounds
    const location = item.location || { x: 0, y: 0 };
    const size = item.size || { x: 1, y: 1 };
    const width = stickyBaseSize * size.x;
    const height = stickyBaseSize * size.y;
    
    return {
      centerX: location.x - boardOrigin.x + width / 2,
      centerY: location.y - boardOrigin.y + height / 2,
      width,
      height
    };
  } else if (isImageItem(item)) {
    // Calculate image bounds
    const location = item.location || { x: 0, y: 0 };
    const width = item.width;
    const height = item.height;
    
    return {
      centerX: location.x - boardOrigin.x + width / 2,
      centerY: location.y - boardOrigin.y + height / 2,
      width,
      height
    };
  }

  return null;
}

/**
 * Gets the location of an item, normalized to board coordinates relative to origin.
 * 
 * @param {Object|null} item - Item data (sticky or image)
 * @returns {Object|null} Location object with {x, y} or null
 */
export function getBoardItemLocation(item) {
  if (!item) {
    return null;
  }

  if (isStickyItem(item) || isImageItem(item)) {
    return item.location || { x: 0, y: 0 };
  }

  return null;
}

/**
 * Gets the size of an item (for stickies, returns the size in units; for images, returns dimensions in pixels).
 * 
 * @param {Object|null} item - Item data (sticky or image)
 * @returns {Object|null} Size object with {x, y} for stickies or {width, height} for images
 */
export function getBoardItemSize(item) {
  if (!item) {
    return null;
  }

  if (isStickyItem(item)) {
    return item.size || { x: 1, y: 1 };
  } else if (isImageItem(item)) {
    return { width: item.width, height: item.height };
  }

  return null;
}

