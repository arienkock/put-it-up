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

export function registerPlugin(type, pluginInstance) {
  registry.set(type, pluginInstance);
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

/**
 * Get all storage keys from all registered plugins.
 * @returns {Array<string>} Array of storage keys
 */
export function getAllStorageKeys() {
  return getAllPlugins().map(plugin => plugin.getSelectionType());
}

/**
 * Get all registered plugin types.
 * @returns {Array<string>} Array of plugin type strings
 */
export function getAllPluginTypes() {
  return Array.from(registry.keys());
}

/**
 * Find the plugin that owns a given DOM element.
 * @param {HTMLElement} element - DOM element to check
 * @returns {BoardItemPlugin|null} Plugin instance or null if not found
 */
export function getPluginForElement(element) {
  if (!element) return null;
  
  // Check each plugin to see if it owns this element
  for (const plugin of getAllPlugins()) {
    if (plugin.isElement(element)) {
      return plugin;
    }
  }
  
  return null;
}

/**
 * Get the CSS selector for all containers of a given plugin type.
 * @param {string} type - Plugin type (e.g., 'sticky')
 * @returns {string|null} CSS selector (e.g., '.sticky-container') or null if not found
 */
export function getContainerSelectorForType(type) {
  const plugin = getPlugin(type);
  if (!plugin) return null;
  const baseClass = plugin.getContainerBaseClass();
  return baseClass ? `.${baseClass}` : null;
}

/**
 * Get all container selectors for all registered plugins.
 * @returns {Array<string>} Array of CSS selectors
 */
export function getAllContainerSelectors() {
  return getAllPlugins()
    .map(plugin => {
      const baseClass = plugin.getContainerBaseClass();
      return baseClass ? `.${baseClass}` : null;
    })
    .filter(selector => selector !== null);
}

/**
 * Find the plugin type for a given container CSS class.
 * @param {string} className - CSS class name (e.g., 'sticky-container')
 * @returns {string|null} Plugin type (e.g., 'sticky') or null if not found
 */
export function getTypeForContainerClass(className) {
  for (const plugin of getAllPlugins()) {
    if (plugin.getContainerBaseClass() === className) {
      return plugin.getType();
    }
  }
  return null;
}


