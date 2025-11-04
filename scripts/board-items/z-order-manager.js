import { removePx } from './plugins/sticky/sticky-dom.js';
import { isConnectorElement, isImageElement, isStickyElement, Z_ORDER_LAYERS } from './board-item-interface.js';

/**
 * Reorders board elements to ensure proper layering:
 * Connectors first (lowest z-index), then stickies, then images (highest z-index)
 * Elements within the same layer are sorted by position (top to bottom, left to right)
 * 
 * Only called when elements are added or removed to avoid unnecessary DOM manipulation
 * 
 * @param {HTMLElement} domElement - The board container element
 */
export function reorderBoardElements(domElement) {
  const elementsOnBoard = [...domElement.children];
  const activeElement = document.activeElement;
  let shouldRefocus = false;
  if (elementsOnBoard.some((el) => el.contains(activeElement))) {
    shouldRefocus = true;
  }
  
  elementsOnBoard.sort((a, b) => {
    // First, sort by type (z-order layer)
    const aIsConnector = isConnectorElement(a);
    const bIsConnector = isConnectorElement(b);
    const aIsImage = isImageElement(a);
    const bIsImage = isImageElement(b);
    
    // Connectors first (lowest z-index)
    if (aIsConnector && !bIsConnector) return -1;
    if (!aIsConnector && bIsConnector) return 1;
    
    // Images last (highest z-index)
    if (aIsImage && !bIsImage) return 1;
    if (!aIsImage && bIsImage) return -1;
    
    // Both same type - sort by position
    const aTop = removePx(a.style.top);
    const bTop = removePx(b.style.top);
    const aLeft = removePx(a.style.left);
    const bLeft = removePx(b.style.left);
    
    // Validate that positions are valid numbers
    if (isNaN(aTop) || isNaN(bTop) || isNaN(aLeft) || isNaN(bLeft)) {
      // If positions are invalid, maintain current order
      return 0;
    }
    
    let yDif = aTop - bTop;
    if (yDif === 0) {
      const xDif = aLeft - bLeft;
      if (xDif === 0) {
        return b.className > a.className;
      }
      return xDif;
    }
    return yDif;
  });
  
  // Reorder elements by removing all and adding back in sorted order
  elementsOnBoard.forEach((el) => domElement.removeChild(el));
  elementsOnBoard.forEach((el) => domElement.appendChild(el));
  
  if (shouldRefocus) {
    activeElement.focus();
  }
}

