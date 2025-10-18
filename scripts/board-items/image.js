import { createImageContainerDOM, removePx } from "./image-dom.js";
import { setImageStyles } from "./image-styling.js";
import { setupImageEvents } from "./image-events.js";

export const IMAGE_TYPE = "application/image";

export const createRenderer = (
  board,
  domElement,
  selectionManager,
  imagesMovedByDragging,
  store
) =>
  function renderImage(imageId, image) {
    const selectedImages = selectionManager.getSelection('images');
    const shouldDelete = image === undefined;
    const container = getImageElement(
      domElement,
      imageId,
      board.getImageLocation,
      selectionManager,
      shouldDelete,
      store
    );
    
    if (container) {
      const shouldAnimateMove = !imagesMovedByDragging.includes(imageId);
      const imageIsSelected = !!selectedImages.isSelected(imageId);
      setImageStyles(
        image,
        container,
        shouldAnimateMove,
        imageIsSelected,
        board.getOrigin()
      );
      
      if (!shouldAnimateMove) {
        // mutate the global UI array instead of reassigning the local variable
        const index = imagesMovedByDragging.indexOf(imageId);
        if (index >= 0) {
          imagesMovedByDragging.splice(index, 1);
        }
      }
      
      // ordering - images should be on top of stickies
      const elementsOnBoard = [...domElement.children];
      const activeElement = document.activeElement;
      let shouldRefocus = false;
      if (elementsOnBoard.some((el) => el.contains(activeElement))) {
        shouldRefocus = true;
      }
      elementsOnBoard.sort((a, b) => {
        // Connectors first, then stickies, then images (by position)
        const aIsConnector = a.classList.contains("connector-container");
        const bIsConnector = b.classList.contains("connector-container");
        const aIsImage = a.classList.contains("image-container");
        const bIsImage = b.classList.contains("image-container");
        
        if (aIsConnector && !bIsConnector) return -1;
        if (!aIsConnector && bIsConnector) return 1;
        if (aIsImage && !bIsImage) return 1;
        if (!aIsImage && bIsImage) return -1;
        
        // Both same type - sort by position
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
      // Reorder elements by removing all and adding back in sorted order
      elementsOnBoard.forEach((el) => domElement.removeChild(el));
      elementsOnBoard.forEach((el) => domElement.appendChild(el));
      if (shouldRefocus) {
        activeElement.focus();
      }
    }
  };

function getImageElement(
  boardElement,
  id,
  getImageLocation,
  selectionManager,
  shouldDelete = false,
  store
) {
  const imageIdClass = "image-" + id;
  let container = boardElement[imageIdClass];
  
  if (shouldDelete) {
    delete boardElement[imageIdClass];
    if (container) {
      boardElement.removeChild(container);
    }
    container = undefined;
  } else if (!container) {
    container = createImageContainerDOM(imageIdClass);
    boardElement[imageIdClass] = container;
    boardElement.appendChild(container);
    setupImageEvents(
      container,
      id,
      getImageLocation,
      selectionManager,
      store
    );
  }
  
  return container;
}
