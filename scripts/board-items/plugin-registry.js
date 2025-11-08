import { StickyPlugin } from './plugins/sticky/sticky-plugin.js';
import { ImagePlugin } from './plugins/image/image-plugin.js';

const registry = new Map();

// Register built-in plugins statically
registry.set('sticky', new StickyPlugin());
registry.set('image', new ImagePlugin());

export function getPlugin(type) {
  return registry.get(type);
}

export function getAllPlugins() {
  return Array.from(registry.values());
}

/**
 * Get the storage key (selection type) for a plugin type.
 * @param {string} type - Plugin type (e.g., 'sticky')
 * @returns {string|null} Storage key (e.g., 'stickies') or null if not found
 */
export function getStorageKeyForType(type) {
  const plugin = getPlugin(type);
  return plugin ? plugin.getSelectionType() : null;
}


