import { BoardItemPlugin } from '../../plugin-interface.js';
import { createRenderer as createStickyRenderer } from './sticky.js';
import { getNextZIndex } from '../../../ui/z-index-manager.js';
import { DEFAULT_STICKY_COLOR } from './sticky-styling.js';
import { stickyColorPalette } from '../../../ui/color-management.js';

export class StickyPlugin extends BoardItemPlugin {
  getType() { return 'sticky'; }
  getContainerBaseClass() { return 'sticky-container'; }
  getContainerClassPrefix() { return 'sticky-'; }
  getSelectionType() { return 'stickies'; }

  createRenderer(board, domElement, selectionManager, itemsMovedByDragging, store) {
    return createStickyRenderer(board, domElement, selectionManager, itemsMovedByDragging, store);
  }

  createItem(board, itemData) {
    const store = board.getStore();
    const type = this.getType();
    
    // Normalize text
    itemData.text = itemData.text || "";
    itemData.text = board.removeNewlines(itemData.text);
    
    // Calculate size
    const sizeUnits = (itemData.size && { x: itemData.size.x || 1, y: itemData.size.y || 1 }) || { x: 1, y: 1 };
    const sizeIncrements = { x: 70, y: 70 };
    const widthPx = sizeIncrements.x * sizeUnits.x;
    const heightPx = sizeIncrements.y * sizeUnits.y;
    
    // Snap location
    itemData.location = board.snapLocationWithSize(
      itemData.location || { x: 0, y: 0 },
      widthPx,
      heightPx
    );
    
    // Initialize zIndex if not provided
    if (itemData.zIndex === undefined) {
      itemData.zIndex = getNextZIndex(store);
    }
    
    return store.createBoardItem(type, itemData);
  }

  deleteItem(board, id) {
    const store = board.getStore();
    const type = this.getType();
    
    // Delete all connectors attached to this sticky
    const state = store.getState();
    Object.entries(state.connectors).forEach(([connectorId, connector]) => {
      if ((connector.originItemId == id && connector.originItemType === 'sticky') ||
          (connector.destinationItemId == id && connector.destinationItemType === 'sticky')) {
        store.deleteConnector(connectorId);
      }
    });
    
    store.deleteBoardItem(type, id);
  }

  moveItem(board, id, location) {
    const store = board.getStore();
    const type = this.getType();
    
    const sticky = store.getBoardItem(type, id);
    const sizeUnits = (sticky.size && { x: sticky.size.x || 1, y: sticky.size.y || 1 }) || { x: 1, y: 1 };
    const sizeIncrements = { x: 70, y: 70 };
    const widthPx = sizeIncrements.x * sizeUnits.x;
    const heightPx = sizeIncrements.y * sizeUnits.y;
    
    const snappedLocation = board.snapLocationWithSize(
      location || { x: 0, y: 0 },
      widthPx,
      heightPx
    );
    
    store.updateBoardItem(type, id, { location: snappedLocation });
  }

  resizeItem(board, id, params) {
    if (params && params.size) {
      const store = board.getStore();
      const type = this.getType();
      store.updateBoardItem(type, id, { size: params.size });
      if (params.location) {
        store.updateBoardItem(type, id, { location: params.location });
      }
      return true;
    }
    return false;
  }

  getItem(board, id) {
    const store = board.getStore();
    const type = this.getType();
    return store.getBoardItem(type, id);
  }

  getLocation(board, id) {
    const item = this.getItem(board, id);
    return item.location;
  }

  updateItem(board, id, updates) {
    const store = board.getStore();
    const type = this.getType();
    const updateData = {};
    
    if ('text' in updates) {
      let text = updates.text || "";
      text = board.removeNewlines(text);
      updateData.text = text;
    }
    if ('color' in updates) {
      updateData.color = updates.color;
    }
    if ('size' in updates) {
      updateData.size = updates.size;
    }
    if ('location' in updates) {
      updateData.location = updates.location;
    }
    
    if (Object.keys(updateData).length > 0) {
      store.updateBoardItem(type, id, updateData);
    }
  }

  isItem(itemData) { return !!(itemData && typeof itemData.text === 'string'); }
  isElement(element) { return element?.classList?.contains('sticky-container'); }
  getBounds(item, boardOrigin) {
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

  isConnectorConnectedToItem(connector, itemId) {
    return ((connector.originItemId == itemId && connector.originItemType === 'sticky') ||
            (connector.destinationItemId == itemId && connector.destinationItemType === 'sticky'));
  }

  isEndpointConnected(connector, endpoint) {
    if (endpoint === 'origin') {
      return !!(connector.originItemId && connector.originItemType === 'sticky');
    } else if (endpoint === 'destination') {
      return !!(connector.destinationItemId && connector.destinationItemType === 'sticky');
    }
    return false;
  }

  getConnectorEndpointData(id) {
    return { stickyId: id };
  }

  // UI Integration Methods

  getDefaultColor() {
    return DEFAULT_STICKY_COLOR;
  }

  getColorPalette() {
    return stickyColorPalette;
  }

  getMenuItems() {
    return [
      {
        itemLabel: "New Sticky",
        className: "new-sticky",
        icon: "images/new-sticky-icon.svg",
        itemClickHandler: (appState, renderCallback) => {
          appState.ui.nextClickCreatesNewSticky = true;
          appState.ui.nextClickCreatesConnector = false;
          appState.ui.connectorOriginId = null;
          renderCallback();
        }
      }
    ];
  }

  getEditingSelector() {
    return '.sticky-container.editing';
  }

  isEditingElement(element) {
    return element?.classList?.contains('sticky-container') && 
           element?.classList?.contains('editing');
  }

  canHandlePaste(items) {
    return false; // Stickies don't handle paste
  }

  handlePaste(items, board, location) {
    return null;
  }

  getCreationModeFlag() {
    return 'nextClickCreatesNewSticky';
  }
}



