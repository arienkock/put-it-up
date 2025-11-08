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
 * Returns the z-order layer for a given DOM element
 */
export function getElementLayer(element) {
  if (isConnectorElement(element)) {
    return Z_ORDER_LAYERS.CONNECTOR;
  }
  return Z_ORDER_LAYERS.CONTENT;
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
export function getBoardItemBounds(item, boardOrigin) {
  if (!item) {
    return null;
  }

  // Prefer plugin-provided bounds if available
  try {
    for (const plugin of getAllPlugins()) {
      if (plugin.isItem(item)) {
        return plugin.getBounds(item, boardOrigin);
      }
    }
  } catch (e) {
    // Plugin registry might not be loaded yet, fall through to legacy logic
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

