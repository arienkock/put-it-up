/**
 * Generic interface for board items (stickies, images) that connectors connect to.
 * This abstraction allows connectors to work with any item type without knowing specific details.
 */

import { getAllPlugins } from './plugin-registry.js';

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
 * @deprecated Use getPluginForElement() instead
 */
export function isImageElement(element) {
  if (!element) return false;
  const plugins = getAllPlugins();
  const imagePlugin = plugins.find(p => p.getType() === 'image');
  return imagePlugin ? imagePlugin.isElement(element) : false;
}

/**
 * Determines if a DOM element is a sticky
 * @deprecated Use getPluginForElement() instead
 */
export function isStickyElement(element) {
  if (!element) return false;
  const plugins = getAllPlugins();
  const stickyPlugin = plugins.find(p => p.getType() === 'sticky');
  return stickyPlugin ? stickyPlugin.isElement(element) : false;
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

  // Prefer plugin-provided bounds if available
  try {
    for (const plugin of getAllPlugins()) {
      if (plugin.isItem(item)) {
        return plugin.getBounds(item, boardOrigin, { stickyBaseSize });
      }
    }
  } catch (e) {
    // Plugin registry might not be loaded yet, fall through to legacy logic
  }

  // Fallback to legacy logic
  if (isStickyItem(item)) {
    const location = item.location || { x: 0, y: 0 };
    const size = item.size || { x: 1, y: 1 };
    const width = stickyBaseSize * size.x;
    const height = stickyBaseSize * size.y;
    return { centerX: location.x - boardOrigin.x + width / 2, centerY: location.y - boardOrigin.y + height / 2, width, height };
  } else if (isImageItem(item)) {
    const location = item.location || { x: 0, y: 0 };
    const width = item.width;
    const height = item.height;
    return { centerX: location.x - boardOrigin.x + width / 2, centerY: location.y - boardOrigin.y + height / 2, width, height };
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

// Helpers using plugin system
export function getPluginForItem(item) {
  try {
    for (const plugin of getAllPlugins()) {
      if (plugin.isItem(item)) return plugin;
    }
  } catch (e) {
    // Plugin registry might not be loaded yet
  }
  return null;
}

export function getPluginForElement(element) {
  try {
    for (const plugin of getAllPlugins()) {
      if (plugin.isElement(element)) return plugin;
    }
  } catch (e) {
    // Plugin registry might not be loaded yet
  }
  return null;
}

