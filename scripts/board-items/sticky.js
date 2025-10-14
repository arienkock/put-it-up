import { fitContentInSticky } from "./text-fitting.js";
import { createStickyContainerDOM, removePx } from "./sticky-dom.js";
import { setStickyStyles, DEFAULT_STICKY_COLOR } from "./sticky-styling.js";
import { setupStickyEvents } from "./sticky-events.js";

export const STICKY_TYPE = "application/sticky";
export { DEFAULT_STICKY_COLOR };

export const createRenderer = (
  board,
  domElement,
  getSelectedStickies,
  stickiesMovedByDragging
) =>
  function renderSticky(stickyId, sticky) {
    const selectedStickies = getSelectedStickies();
    const shouldDelete = sticky === undefined;
    const container = getStickyElement(
      domElement,
      stickyId,
      board.updateText,
      board.getStickyLocation,
      selectedStickies,
      shouldDelete
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
        let yDif = removePx(a.style.top) - removePx(b.style.top);
        if (yDif === 0) {
          const xDif = removePx(a.style.left) - removePx(b.style.left);
          if (xDif === 0) {
            return b.className > a.className;
          }
          return xDif;
        }
        return yDif;
      });
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
  selectedStickies,
  shouldDelete = false
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
      selectedStickies
    );
  }
  return container;
}
