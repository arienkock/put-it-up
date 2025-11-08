import { getAllPlugins } from '../board-items/plugin-registry.js';

/**
 * Detects if a state object is in the old format (has direct stickies/images properties).
 * @param {Object} state - State object to check
 * @returns {boolean} True if state appears to be in old format
 */
function isOldFormat(state) {
  if (!state || typeof state !== 'object') {
    return false;
  }
  
  // Old format has direct 'stickies' or 'images' properties at the top level
  // New format uses plugin registry to determine storage keys
  return 'stickies' in state || 'images' in state;
}

/**
 * Gets the idGen key for a plugin type.
 * @param {string} type - Plugin type (e.g., 'sticky', 'image')
 * @returns {string} The idGen key name
 */
function getIdGenKeyForType(type) {
  // Sticky uses 'idGen', others use 'typeIdGen'
  if (type === 'sticky') {
    return 'idGen';
  }
  return `${type}IdGen`;
}

/**
 * Converts old data format to new plugin-based format.
 * 
 * Old format has direct properties: stickies, images, idGen, imageIdGen
 * New format uses plugin registry: plugin.getSelectionType() for storage keys,
 * and dynamic idGen keys (sticky → 'idGen', others → 'typeIdGen')
 * 
 * @param {Object} state - State object (may be old or new format)
 * @returns {Object} State object in new format
 */
export function convertOldFormatToNewFormat(state) {
  if (!state || typeof state !== 'object') {
    return state || {};
  }
  
  // If already in new format, return as-is
  if (!isOldFormat(state)) {
    return state;
  }
  
  // Create new state object with connectors (unchanged)
  const newState = {
    connectors: state.connectors || {},
    connectorIdGen: state.connectorIdGen || 0
  };
  
  // Get all plugins to determine storage keys
  const plugins = getAllPlugins();
  
  // Map old format properties to new format using plugin registry
  plugins.forEach(plugin => {
    const type = plugin.getType();
    const storageKey = plugin.getSelectionType();
    const idGenKey = getIdGenKeyForType(type);
    
    // Convert storage: old format may have direct property, new format uses storageKey
    if (state[storageKey] !== undefined) {
      // Already in new format for this plugin
      newState[storageKey] = state[storageKey];
    } else if (type === 'sticky' && state.stickies !== undefined) {
      // Old format: stickies → new format: stickies (same key, but ensure it's set)
      newState[storageKey] = state.stickies;
    } else if (type === 'image' && state.images !== undefined) {
      // Old format: images → new format: images (same key, but ensure it's set)
      newState[storageKey] = state.images;
    } else {
      // No data for this plugin
      newState[storageKey] = {};
    }
    
    // Convert idGen: old format may have idGen/imageIdGen, new format uses dynamic keys
    if (state[idGenKey] !== undefined) {
      // Already in new format for this plugin
      newState[idGenKey] = state[idGenKey];
    } else if (type === 'sticky' && state.idGen !== undefined) {
      // Old format: idGen → new format: idGen (same key)
      newState[idGenKey] = state.idGen;
    } else if (type === 'image' && state.imageIdGen !== undefined) {
      // Old format: imageIdGen → new format: imageIdGen (same key)
      newState[idGenKey] = state.imageIdGen;
    } else {
      // Default to 0 if not present
      newState[idGenKey] = 0;
    }
  });
  
  // Preserve any other properties that might exist (e.g., board metadata)
  Object.keys(state).forEach(key => {
    if (!(key in newState) && key !== 'stickies' && key !== 'images' && key !== 'idGen' && key !== 'imageIdGen') {
      newState[key] = state[key];
    }
  });
  
  return newState;
}

