import { BoardItemPlugin } from '../plugin-interface.js';
import { createRenderer as createStickyRenderer } from '../sticky.js';

export class StickyPlugin extends BoardItemPlugin {
  getType() { return 'sticky'; }
  getContainerBaseClass() { return 'sticky-container'; }
  getContainerClassPrefix() { return 'sticky-'; }
  getSelectionType() { return 'stickies'; }

  createRenderer(board, domElement, selectionManager, itemsMovedByDragging, store) {
    return createStickyRenderer(board, domElement, selectionManager, itemsMovedByDragging, store);
  }

  createItem(board, itemData) { return board.putSticky(itemData); }
  deleteItem(board, id) { return board.deleteSticky(id); }
  moveItem(board, id, location) { return board.moveSticky(id, location); }
  resizeItem(board, id, params) {
    // Stickies resize via updateSize + setLocation; board exposes update via store operations
    if (params && params.size) {
      if (board?.getStore?.()) {
        const store = board.getStore();
        store.updateSize(id, params.size);
        if (params.location) store.setLocation(id, params.location);
        return true;
      }
    }
    return false;
  }
  getItem(board, id) { return board.getSticky(id); }
  getLocation(board, id) { return board.getStickyLocation(id); }
  updateItem(board, id, updates) {
    if ('text' in updates) board.updateText(id, updates.text);
    if ('color' in updates) board.updateColor(id, updates.color);
  }
  isItem(itemData) { return !!(itemData && typeof itemData.text === 'string'); }
  isElement(element) { return element?.classList?.contains('sticky-container'); }
  getBounds(item, boardOrigin, options) {
    if (!item) return null;
    const size = item.size || { x: 1, y: 1 };
    const width = 70 * size.x;
    const height = 70 * size.y;
    return {
      centerX: item.location.x - boardOrigin.x + width / 2,
      centerY: item.location.y - boardOrigin.y + height / 2,
      width,
      height
    };
  }
}


