import { fitContentInSticky } from "./text-fitting.js";
import { createStickyContainerDOM } from "./sticky-dom.js";
import { setStickyStyles, DEFAULT_STICKY_COLOR } from "./sticky-styling.js";
import { setupStickyEvents } from "./sticky-events.js";
import { reorderBoardElements } from "./z-order-manager.js";
import { getPlugin } from "./plugin-registry.js";

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
      (id, text) => {
        const plugin = getPlugin('sticky');
        if (plugin) {
          plugin.updateItem(board, id, { text });
          return text;
        }
        return text;
      },
      (id) => board.getBoardItemLocationByType('sticky', id),
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

