/**
 * Z-Index Management Module
 * Handles z-index operations for board items (stickies, images, connectors)
 */

// Z-index range: 1000-9999 to allow plenty of room for reordering
const Z_INDEX_MIN = 1000;
const Z_INDEX_MAX = 9999;
const Z_INDEX_STEP = 10; // Gap between items to allow insertions

/**
 * Gets all board items with their z-index values
 * @param {Object} store - Datastore instance
 * @returns {Array} Array of {type, id, zIndex, item} objects sorted by zIndex
 */
export function getAllItemsWithZIndex(store) {
  const state = store.getState();
  const items = [];
  
  // Add stickies
  Object.entries(state.stickies || {}).forEach(([id, item]) => {
    items.push({
      type: 'sticky',
      id,
      zIndex: item.zIndex || Z_INDEX_MIN,
      item
    });
  });
  
  // Add images
  Object.entries(state.images || {}).forEach(([id, item]) => {
    items.push({
      type: 'image',
      id,
      zIndex: item.zIndex || Z_INDEX_MIN,
      item
    });
  });
  
  // Add connectors
  Object.entries(state.connectors || {}).forEach(([id, item]) => {
    items.push({
      type: 'connector',
      id,
      zIndex: item.zIndex || Z_INDEX_MIN,
      item
    });
  });
  
  // Sort by zIndex
  items.sort((a, b) => a.zIndex - b.zIndex);
  
  return items;
}

/**
 * Calculates the next available z-index for a new item
 * @param {Object} store - Datastore instance
 * @returns {number} Next available z-index value
 */
export function getNextZIndex(store) {
  const items = getAllItemsWithZIndex(store);
  
  if (items.length === 0) {
    return Z_INDEX_MIN;
  }
  
  // Find the highest z-index
  const maxZIndex = items[items.length - 1].zIndex;
  
  // Return next value with step gap
  const nextZIndex = maxZIndex + Z_INDEX_STEP;
  
  // If we've exceeded max, renumber all items
  if (nextZIndex > Z_INDEX_MAX) {
    return renumberAllZIndices(store);
  }
  
  return nextZIndex;
}

/**
 * Renumbers all items to fit within the z-index range
 * @param {Object} store - Datastore instance
 * @returns {number} Next available z-index after renumbering
 */
function renumberAllZIndices(store) {
  const items = getAllItemsWithZIndex(store);
  
  // Renumber all items starting from Z_INDEX_MIN with step gaps
  items.forEach((itemInfo, index) => {
    const newZIndex = Z_INDEX_MIN + (index * Z_INDEX_STEP);
    updateItemZIndex(store, itemInfo.type, itemInfo.id, newZIndex);
  });
  
  // Return next available
  return Z_INDEX_MIN + (items.length * Z_INDEX_STEP);
}

/**
 * Updates an item's z-index
 * @param {Object} store - Datastore instance
 * @param {string} type - Item type ('sticky', 'image', 'connector')
 * @param {string} id - Item ID
 * @param {number} zIndex - New z-index value
 */
export function updateItemZIndex(store, type, id, zIndex) {
  if (type === 'sticky' || type === 'image') {
    if (store.updateBoardItemZIndex) {
      store.updateBoardItemZIndex(type, id, zIndex);
    } else {
      store.updateBoardItem(type, id, { zIndex });
    }
  } else if (type === 'connector') {
    if (store.updateConnectorZIndex) {
      store.updateConnectorZIndex(id, zIndex);
    } else {
      // Fallback for stores without updateConnectorZIndex
      const connector = store.getConnector(id);
      connector.zIndex = zIndex;
      store.notifyConnectorChange(id);
    }
  }
}

/**
 * Moves items in z-index
 * @param {Object} store - Datastore instance
 * @param {Array} itemsToMove - Array of {type, id} objects
 * @param {string} direction - 'up', 'down', 'to-top', 'to-back'
 */
export function moveItemsZIndex(store, itemsToMove, direction) {
  if (itemsToMove.length === 0) return;
  
  const allItems = getAllItemsWithZIndex(store);
  
  // Get current z-index values for items to move
  const itemsWithZIndex = itemsToMove.map(({ type, id }) => {
    const itemInfo = allItems.find(item => item.type === type && item.id === id);
    return {
      type,
      id,
      currentZIndex: itemInfo ? itemInfo.zIndex : Z_INDEX_MIN
    };
  });
  
  // Sort by current z-index to maintain relative order
  itemsWithZIndex.sort((a, b) => a.currentZIndex - b.currentZIndex);
  
  if (direction === 'to-top') {
    // Move to highest z-index positions
    const nonMovingItems = allItems.filter(item => 
      !itemsToMove.some(move => move.type === item.type && move.id === item.id)
    );
    
    const highestZIndex = nonMovingItems.length > 0 
      ? nonMovingItems[nonMovingItems.length - 1].zIndex 
      : Z_INDEX_MIN - Z_INDEX_STEP;
    
    itemsWithZIndex.forEach((item, index) => {
      const newZIndex = highestZIndex + ((index + 1) * Z_INDEX_STEP);
      updateItemZIndex(store, item.type, item.id, newZIndex);
    });
    
  } else if (direction === 'to-back') {
    // Move to lowest z-index positions
    const nonMovingItems = allItems.filter(item => 
      !itemsToMove.some(move => move.type === item.type && move.id === item.id)
    );
    
    const lowestZIndex = nonMovingItems.length > 0 
      ? nonMovingItems[0].zIndex 
      : Z_INDEX_MIN + (itemsWithZIndex.length * Z_INDEX_STEP);
    
    itemsWithZIndex.forEach((item, index) => {
      const newZIndex = lowestZIndex - ((itemsWithZIndex.length - index) * Z_INDEX_STEP);
      const finalZIndex = Math.max(Z_INDEX_MIN, newZIndex);
      updateItemZIndex(store, item.type, item.id, finalZIndex);
    });
    
    // If we went below minimum, renumber all items
    if (lowestZIndex - (itemsWithZIndex.length * Z_INDEX_STEP) < Z_INDEX_MIN) {
      renumberAllZIndices(store);
    }
    
  } else if (direction === 'up') {
    // Move up by one position - move past the item directly above
    const nonMovingItems = allItems.filter(item => 
      !itemsToMove.some(move => move.type === item.type && move.id === item.id)
    );
    
    // Find the next higher z-index after the highest moving item
    const highestMovingZIndex = itemsWithZIndex[itemsWithZIndex.length - 1].currentZIndex;
    const nextHigherItems = nonMovingItems.filter(item => item.zIndex > highestMovingZIndex);
    
    if (nextHigherItems.length > 0) {
      // Sort to find the closest item above
      nextHigherItems.sort((a, b) => a.zIndex - b.zIndex);
      const closestAbove = nextHigherItems[0];
      
      // We want to move our group to be above the closest item above
      // So place items starting from closestAbove.zIndex + Z_INDEX_STEP, going up
      const startZIndex = closestAbove.zIndex + Z_INDEX_STEP;
      let needsRenumber = false;
      itemsWithZIndex.forEach((item, index) => {
        const newZIndex = startZIndex + (index * Z_INDEX_STEP);
        if (newZIndex <= Z_INDEX_MAX) {
          updateItemZIndex(store, item.type, item.id, newZIndex);
        } else {
          needsRenumber = true;
        }
      });
      if (needsRenumber) {
        renumberAllZIndices(store);
      }
    } else {
      // Already at top, move to absolute top
      const maxZIndex = allItems.length > 0 ? allItems[allItems.length - 1].zIndex : Z_INDEX_MIN;
      let needsRenumber = false;
      itemsWithZIndex.forEach((item, index) => {
        const newZIndex = maxZIndex + ((index + 1) * Z_INDEX_STEP);
        if (newZIndex <= Z_INDEX_MAX) {
          updateItemZIndex(store, item.type, item.id, newZIndex);
        } else {
          needsRenumber = true;
        }
      });
      if (needsRenumber) {
        renumberAllZIndices(store);
      }
    }
    
  } else if (direction === 'down') {
    // Move down by one position - move past the item directly below
    const nonMovingItems = allItems.filter(item => 
      !itemsToMove.some(move => move.type === item.type && move.id === item.id)
    );
    
    // Find the next lower z-index before the lowest moving item
    const lowestMovingZIndex = itemsWithZIndex[0].currentZIndex;
    const nextLowerItems = nonMovingItems.filter(item => item.zIndex < lowestMovingZIndex);
    
    if (nextLowerItems.length > 0) {
      // Sort to find the closest item below (highest z-index among items below us)
      nextLowerItems.sort((a, b) => b.zIndex - a.zIndex);
      const closestBelow = nextLowerItems[0];
      
      // We want to move our group to be below the closest item below
      // So place items starting from closestBelow.zIndex - Z_INDEX_STEP, going down
      const startZIndex = closestBelow.zIndex - Z_INDEX_STEP;
      let needsRenumber = false;
      itemsWithZIndex.forEach((item, index) => {
        const newZIndex = startZIndex - (index * Z_INDEX_STEP);
        const finalZIndex = Math.max(Z_INDEX_MIN, newZIndex);
        if (finalZIndex >= Z_INDEX_MIN) {
          updateItemZIndex(store, item.type, item.id, finalZIndex);
        } else {
          needsRenumber = true;
        }
      });
      
      // If we went below minimum, renumber all items
      if (needsRenumber || startZIndex - ((itemsWithZIndex.length - 1) * Z_INDEX_STEP) < Z_INDEX_MIN) {
        renumberAllZIndices(store);
      }
    } else {
      // Already at bottom, move to absolute bottom
      const minZIndex = allItems.length > 0 ? allItems[0].zIndex : Z_INDEX_MIN;
      itemsWithZIndex.forEach((item, index) => {
        const newZIndex = minZIndex - ((itemsWithZIndex.length - index) * Z_INDEX_STEP);
        const finalZIndex = Math.max(Z_INDEX_MIN, newZIndex);
        updateItemZIndex(store, item.type, item.id, finalZIndex);
      });
      
      // If we went below minimum, renumber all items
      if (minZIndex - (itemsWithZIndex.length * Z_INDEX_STEP) < Z_INDEX_MIN) {
        renumberAllZIndices(store);
      }
    }
  }
}

/**
 * Ensures all items have unique z-index values
 * Called during migration or when z-index conflicts are detected
 * @param {Object} store - Datastore instance
 */
export function ensureUniqueZIndices(store) {
  const items = getAllItemsWithZIndex(store);
  
  // Group by z-index to find duplicates
  const zIndexGroups = new Map();
  items.forEach(itemInfo => {
    const zIndex = itemInfo.zIndex;
    if (!zIndexGroups.has(zIndex)) {
      zIndexGroups.set(zIndex, []);
    }
    zIndexGroups.get(zIndex).push(itemInfo);
  });
  
  // Renumber if there are duplicates
  const hasDuplicates = Array.from(zIndexGroups.values()).some(group => group.length > 1);
  if (hasDuplicates) {
    renumberAllZIndices(store);
  }
}

