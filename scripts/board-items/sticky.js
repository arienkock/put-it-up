import { fitContentInSticky } from "./text-fitting.js";
import { createStickyContainerDOM, removePx } from "./sticky-dom.js";
import { setStickyStyles, DEFAULT_STICKY_COLOR } from "./sticky-styling.js";
import { setupStickyEvents } from "./sticky-events.js";

export const STICKY_TYPE = "application/sticky";
export { DEFAULT_STICKY_COLOR };

export const createRenderer = (
  board,
  domElement,
  selectionManager,
  stickiesMovedByDragging,
  store
) =>
  function renderSticky(stickyId, sticky) {
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
        }
      }
      const textarea = container.inputElement;
      if (textarea.value !== sticky.text) {
        textarea.value = sticky.text;
        fitContentInSticky(container.sticky, textarea);
      }
      // ordering
      const elementsOnBoard = [...domElement.children];
      const activeElement = document.activeElement;
      let shouldRefocus = false;
      if (elementsOnBoard.some((el) => el.contains(activeElement))) {
        shouldRefocus = true;
      }
      elementsOnBoard.sort((a, b) => {
        const aTop = removePx(a.style.top);
        const bTop = removePx(b.style.top);
        const aLeft = removePx(a.style.left);
        const bLeft = removePx(b.style.left);
        
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
  }
  return container;
}
