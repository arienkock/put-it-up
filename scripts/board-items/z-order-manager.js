/**
 * Z-Index Management for Board Elements
 * Applies z-index CSS to board elements based on their stored zIndex property.
 */

import { getAllPlugins } from './plugin-registry.js';

/**
 * Applies z-index to board elements based on their stored zIndex property.
 * This function is called to ensure DOM elements have the correct z-index CSS applied.
 * 
 * @param {HTMLElement} domElement - The board container element
 * @param {Object} store - Datastore instance to get z-index values
 */
export function applyZIndexToElements(domElement, store) {
  if (!store) return;
  
  const state = store.getState();
  const plugins = getAllPlugins();
  
  // Build regex patterns for each plugin
  const pluginPatterns = plugins.map(plugin => ({
    plugin,
    regex: new RegExp(`${plugin.getContainerClassPrefix()}(\\d+)`),
    storageKey: plugin.getSelectionType()
  }));
  
  // Connector pattern (not a plugin)
  const connectorPattern = /connector-(\d+)/;
  
  // Apply z-index to all elements based on their stored zIndex property
  const elementsOnBoard = [...domElement.children];
  elementsOnBoard.forEach((el) => {
    let zIndex = null;
    
    // Try plugin patterns first
    for (const { plugin, regex, storageKey } of pluginPatterns) {
      const match = el.className.match(regex);
      if (match) {
        const id = match[1];
        const items = state[storageKey];
        const item = items?.[id];
        if (item && item.zIndex !== undefined) {
          zIndex = item.zIndex;
        }
        break;
      }
    }
    
    // Try connector pattern if no plugin matched
    if (zIndex === null) {
      const connectorMatch = el.className.match(connectorPattern);
      if (connectorMatch) {
        const id = connectorMatch[1];
        const connector = state.connectors?.[id];
        if (connector && connector.zIndex !== undefined) {
          zIndex = connector.zIndex;
        }
      }
    }
    
    // Apply z-index if found, otherwise use default
    if (zIndex !== null) {
      el.style.zIndex = zIndex.toString();
    }
  });
}
