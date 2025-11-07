/**
 * Z-Index Management for Board Elements
 * Applies z-index CSS to board elements based on their stored zIndex property.
 */

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
  
  // Apply z-index to all elements based on their stored zIndex property
  const elementsOnBoard = [...domElement.children];
  elementsOnBoard.forEach((el) => {
    let zIndex = null;
    
    // Extract ID from element class or data attribute
    const stickyMatch = el.className.match(/sticky-(\d+)/);
    const imageMatch = el.className.match(/image-(\d+)/);
    const connectorMatch = el.className.match(/connector-(\d+)/);
    
    if (stickyMatch) {
      const id = stickyMatch[1];
      const sticky = state.stickies?.[id];
      if (sticky && sticky.zIndex !== undefined) {
        zIndex = sticky.zIndex;
      }
    } else if (imageMatch) {
      const id = imageMatch[1];
      const image = state.images?.[id];
      if (image && image.zIndex !== undefined) {
        zIndex = image.zIndex;
      }
    } else if (connectorMatch) {
      const id = connectorMatch[1];
      const connector = state.connectors?.[id];
      if (connector && connector.zIndex !== undefined) {
        zIndex = connector.zIndex;
      }
    }
    
    // Apply z-index if found, otherwise use default
    if (zIndex !== null) {
      el.style.zIndex = zIndex.toString();
    }
  });
}

/**
 * Legacy function for backward compatibility.
 * Now just applies z-index instead of reordering DOM.
 * 
 * @param {HTMLElement} domElement - The board container element
 * @deprecated Use applyZIndexToElements instead
 */
export function reorderBoardElements(domElement) {
  // This function is kept for backward compatibility but no longer reorders DOM.
  // Z-index is now applied directly in renderers based on item's zIndex property.
  // This is a no-op now, but kept to avoid breaking existing code.
}
