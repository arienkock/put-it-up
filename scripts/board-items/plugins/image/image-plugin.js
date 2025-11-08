import { BoardItemPlugin } from '../../plugin-interface.js';
import { createRenderer as createImageRenderer } from './image.js';
import { getNextZIndex } from '../../../ui/z-index-manager.js';

export class ImagePlugin extends BoardItemPlugin {
  getType() { return 'image'; }
  getContainerBaseClass() { return 'image-container'; }
  getContainerClassPrefix() { return 'image-'; }
  getSelectionType() { return 'images'; }

  createRenderer(board, domElement, selectionManager, itemsMovedByDragging, store) {
    return createImageRenderer(board, domElement, selectionManager, itemsMovedByDragging, store);
  }

  createItem(board, itemData) {
    const store = board.getStore();
    const type = this.getType();
    
    // Validate image data
    if (!itemData.dataUrl || !itemData.naturalWidth || !itemData.naturalHeight) {
      throw new Error("Invalid image data");
    }
    
    // Set initial size capped at 75% of viewport, maintaining aspect ratio
    const maxWidth = window.innerWidth * 0.75;
    const maxHeight = window.innerHeight * 0.75;
    const aspectRatio = itemData.naturalWidth / itemData.naturalHeight;
    
    let width = itemData.naturalWidth;
    let height = itemData.naturalHeight;
    
    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
    
    itemData.width = width;
    itemData.height = height;
    itemData.location = itemData.location || { x: 0, y: 0 };
    
    // Initialize zIndex if not provided
    if (itemData.zIndex === undefined) {
      itemData.zIndex = getNextZIndex(store);
    }
    
    return store.createBoardItem(type, itemData);
  }

  deleteItem(board, id) {
    const store = board.getStore();
    const type = this.getType();
    
    // Delete all connectors attached to this image
    const state = store.getState();
    Object.entries(state.connectors).forEach(([connectorId, connector]) => {
      if ((connector.originItemId == id && connector.originItemType === 'image') ||
          (connector.destinationItemId == id && connector.destinationItemType === 'image')) {
        store.deleteConnector(connectorId);
      }
    });
    
    store.deleteBoardItem(type, id);
  }

  moveItem(board, id, location) {
    const store = board.getStore();
    const type = this.getType();
    
    const image = store.getBoardItem(type, id);
    const widthPx = image.width;
    const heightPx = image.height;

    // Snap images to grid just like stickies, while respecting boundaries
    const snappedLocation = board.snapLocationWithSize(
      location || { x: 0, y: 0 },
      widthPx,
      heightPx
    );
    
    store.updateBoardItem(type, id, { location: snappedLocation });
  }

  resizeItem(board, id, params) {
    if (params && typeof params === 'object' && params.isGrow !== undefined && params.side) {
      const store = board.getStore();
      const type = this.getType();
      const image = store.getBoardItem(type, id);
      const aspectRatio = image.naturalWidth / image.naturalHeight;
      const sizeIncrement = 20; // pixels
      const factor = params.isGrow ? 1 : -1;
      const increment = sizeIncrement * factor;
      
      let newWidth = image.width;
      let newHeight = image.height;
      let location = { x: image.location.x, y: image.location.y };
      
      // Calculate new dimensions maintaining aspect ratio
      switch (params.side) {
        case "left":
          newWidth += increment;
          newHeight = newWidth / aspectRatio;
          location.x -= (newWidth - image.width);
          break;
        case "right":
          newWidth += increment;
          newHeight = newWidth / aspectRatio;
          break;
        case "top":
          newHeight += increment;
          newWidth = newHeight * aspectRatio;
          location.y -= (newHeight - image.height);
          break;
        case "bottom":
          newHeight += increment;
          newWidth = newHeight * aspectRatio;
          break;
        default:
          return false;
      }
      
      // Enforce minimum size
      newWidth = Math.max(20, newWidth);
      newHeight = Math.max(20, newHeight);
      
      // Check board boundaries
      const { origin, limit } = board.getBoardBounds();
      if (location.x < origin.x) {
        location.x = origin.x;
      }
      if (location.y < origin.y) {
        location.y = origin.y;
      }
      if (location.x + newWidth > limit.x) {
        newWidth = limit.x - location.x;
        newHeight = newWidth / aspectRatio;
      }
      if (location.y + newHeight > limit.y) {
        newHeight = limit.y - location.y;
        newWidth = newHeight * aspectRatio;
      }
      
      store.updateBoardItem(type, id, { width: newWidth, height: newHeight, location });
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
    
    if ('width' in updates) updateData.width = updates.width;
    if ('height' in updates) updateData.height = updates.height;
    if ('location' in updates) updateData.location = updates.location;
    
    if (Object.keys(updateData).length > 0) {
      store.updateBoardItem(type, id, updateData);
    }
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

  isConnectorConnectedToItem(connector, itemId) {
    return ((connector.originItemId == itemId && connector.originItemType === 'image') ||
            (connector.destinationItemId == itemId && connector.destinationItemType === 'image'));
  }

  isEndpointConnected(connector, endpoint) {
    if (endpoint === 'origin') {
      return !!(connector.originItemId && connector.originItemType === 'image');
    } else if (endpoint === 'destination') {
      return !!(connector.destinationItemId && connector.destinationItemType === 'image');
    }
    return false;
  }

  getConnectorEndpointData(id) {
    return { imageId: id };
  }

  // UI Integration Methods

  getDefaultColor() {
    return "#ffffff"; // Images don't have colors, but return a default
  }

  getColorPalette() {
    return []; // Images don't have color palettes
  }

  getMenuItems() {
    return []; // Images don't have a creation menu item (they're created via paste)
  }

  getEditingSelector() {
    return null; // Images don't have editing mode
  }

  isEditingElement(element) {
    return false; // Images don't have editing mode
  }

  canHandlePaste(items) {
    if (!items || items.length === 0) return false;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        return true;
      }
    }
    return false;
  }

  handlePaste(items, board, location) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const imageData = {
                dataUrl: e.target.result,
                naturalWidth: img.naturalWidth,
                naturalHeight: img.naturalHeight,
                location: location
              };
              const id = board.putBoardItem('image', imageData);
              resolve(id);
            };
            img.src = e.target.result;
          };
          reader.readAsDataURL(file);
        });
      }
    }
    return null;
  }

  getCreationModeFlag() {
    return null; // Images are created via paste, not click
  }
}


