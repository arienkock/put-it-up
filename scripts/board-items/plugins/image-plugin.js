import { BoardItemPlugin } from '../plugin-interface.js';
import { createRenderer as createImageRenderer } from '../image.js';

export class ImagePlugin extends BoardItemPlugin {
  getType() { return 'image'; }
  getContainerBaseClass() { return 'image-container'; }
  getContainerClassPrefix() { return 'image-'; }
  getSelectionType() { return 'images'; }

  createRenderer(board, domElement, selectionManager, itemsMovedByDragging, store) {
    return createImageRenderer(board, domElement, selectionManager, itemsMovedByDragging, store);
  }

  createItem(board, itemData) { return board.putImage(itemData); }
  deleteItem(board, id) { return board.deleteImage(id); }
  moveItem(board, id, location) { return board.moveImage(id, location); }
  resizeItem(board, id, params) {
    if (params && typeof params === 'object') {
      if (typeof board.resizeImage === 'function') {
        return board.resizeImage(id, params.isGrow, params.side);
      }
    }
    return false;
  }
  getItem(board, id) { return board.getImage(id); }
  getLocation(board, id) { return board.getImageLocation(id); }
  updateItem(board, id, updates) {
    // Currently images have no generic updates here
  }
  isItem(itemData) { return !!(itemData && typeof itemData.width === 'number' && typeof itemData.height === 'number'); }
  isElement(element) { return element?.classList?.contains('image-container'); }
  getBounds(item, boardOrigin) {
    if (!item) return null;
    const width = item.width;
    const height = item.height;
    return {
      centerX: item.location.x - boardOrigin.x + width / 2,
      centerY: item.location.y - boardOrigin.y + height / 2,
      width,
      height
    };
  }
}


