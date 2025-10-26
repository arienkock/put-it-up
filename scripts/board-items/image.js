import { createImageContainerDOM } from "./image-dom.js";
import { setImageStyles } from "./image-styling.js";
import { setupImageEvents } from "./image-events.js";
import { reorderBoardElements } from "./z-order-manager.js";

export const IMAGE_TYPE = "application/image";

export const createRenderer = (
  board,
  domElement,
  selectionManager,
  imagesMovedByDragging,
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
  
  return function renderImage(imageId, image) {
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
          // Schedule reorder for next frame to batch multiple DOM manipulations
          requestReorder();
        }
      }
    }
  };
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
    // Reorder elements after deletion
    reorderBoardElements(boardElement);
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
    // Don't reorder here - position hasn't been set yet  
    // Reordering happens on next render after drag ends
  }
  
  return container;
}

