import { fitContentInSticky } from "./text-fitting.js";
import { createStickyContainerDOM, removePx } from "./sticky-dom.js";
import { setStickyStyles, DEFAULT_STICKY_COLOR } from "./sticky-styling.js";
import { setupStickyEvents } from "./sticky-events-refactored.js";

export { DEFAULT_STICKY_COLOR };

export const createRenderer = (
  board,
  domElement,
  selectionManager,
  stickiesMovedByDragging,
  store
) => {
  let reorderScheduled = false;
  
  function requestReorder() {
    if (!reorderScheduled) {
      reorderScheduled = true;
      requestAnimationFrame(() => {
        reorderBoardElements(domElement);
        reorderScheduled = false;
      });
    }
  }
  
  return function renderSticky(stickyId, sticky) {
    const selectedStickies = selectionManager.getSelection('stickies');
    const shouldDelete = sticky === undefined;
    const container = getStickyElement(
      domElement,
      stickyId,
      board.updateText,
      board.getStickyLocation,
      selectionManager,
      shouldDelete,
      store
    );
    // if container is falsy, then sticky was deleted
    if (container) {
      const shouldAnimateMove = !stickiesMovedByDragging.includes(stickyId);
      const stickyIsSelected = !!selectedStickies.isSelected(stickyId);
      setStickyStyles(
        sticky,
        container,
        shouldAnimateMove,
        stickyIsSelected,
        board.getOrigin()
      );
      if (!shouldAnimateMove) {
        // mutate the global UI array instead of reassigning the local variable
        const index = stickiesMovedByDragging.indexOf(stickyId);
        if (index >= 0) {
          stickiesMovedByDragging.splice(index, 1);
          // Schedule reorder for next frame to batch multiple DOM manipulations
          requestReorder();
        }
      }
      const textarea = container.inputElement;
      const textChanged = textarea.value !== sticky.text;
      const sizeChanged = container.lastKnownSize !== JSON.stringify(sticky.size || { x: 1, y: 1 });
      
      if (textChanged) {
        textarea.value = sticky.text;
        fitContentInSticky(container.sticky, textarea);
      } else if (sizeChanged) {
        // Size changed but text didn't - re-evaluate text fitting for new dimensions
        fitContentInSticky(container.sticky, textarea);
      }
      
      // Track the current size for future comparisons
      container.lastKnownSize = JSON.stringify(sticky.size || { x: 1, y: 1 });
    }
  };
};

function getStickyElement(
  boardElement,
  id,
  updateTextById,
  getStickyLocation,
  selectionManager,
  shouldDelete = false,
  store
) {
  const stickyIdClass = "sticky-" + id;
  let container = boardElement[stickyIdClass];
  if (shouldDelete) {
    delete boardElement[stickyIdClass];
    if (container) {
      boardElement.removeChild(container);
    }
    container = undefined;
    // Reorder elements after deletion
    reorderBoardElements(boardElement);
  } else if (!container) {
    container = createStickyContainerDOM(stickyIdClass);
    boardElement[stickyIdClass] = container;
    boardElement.appendChild(container);
    setupStickyEvents(
      container,
      id,
      updateTextById,
      getStickyLocation,
      selectionManager,
      store
    );
    // Don't reorder here - position hasn't been set yet
    // Reordering happens on next render after drag ends
  }
  return container;
}

/**
 * Reorders board elements to ensure proper z-order:
 * Connectors first, then stickies (by position)
 * Only called when elements are added or removed to avoid unnecessary DOM manipulation
 */
function reorderBoardElements(domElement) {
  const elementsOnBoard = [...domElement.children];
  const activeElement = document.activeElement;
  let shouldRefocus = false;
  if (elementsOnBoard.some((el) => el.contains(activeElement))) {
    shouldRefocus = true;
  }
  elementsOnBoard.sort((a, b) => {
    const aIsConnector = a.classList.contains("connector-container");
    const bIsConnector = b.classList.contains("connector-container");
    const aIsImage = a.classList.contains("image-container");
    const bIsImage = b.classList.contains("image-container");
    
    // Connectors first, then stickies, then images
    if (aIsConnector && !bIsConnector) return -1;
    if (!aIsConnector && bIsConnector) return 1;
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
