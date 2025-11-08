import { getPlugin, getAllPlugins } from '../board-items/plugin-registry.js';
import { getNextZIndex, updateItemZIndex, moveItemsZIndex } from '../ui/z-index-manager.js';

const DEFAULT_BOARD = {
  origin: { x: 0, y: 0 },
  limit: { x: 12000, y: 6750 },
};

export function Board(aStore) {
  let store = aStore;
  let gridSize = 10;
  // Expose store getter for plugins that need direct access
  this.getStore = () => store;
  // Expose helper utilities for plugins
  this.getGridSize = () => gridSize;
  this.getBoardBounds = () => getBoardInternal();
  this.removeNewlines = (text) => removeNewlines(text);
  this.snapLocationWithSize = (location, widthPx, heightPx) => {
    const { origin, limit } = getBoardInternal();
    return snapLocationWithSize(location, gridSize, origin, limit, widthPx, heightPx);
  };


  const removeNewlines = (text) => text.replace(/\n/g, "");

  const getBoardInternal = () => {
    let { origin, limit } = store.getBoard(DEFAULT_BOARD);
    return { origin, limit };
  };

  this.isReadyForUse = () => store.isReadyForUse();

  this.getConnector = (id) => store.getConnector(id);

  this.getConnectorSafe = (id) => {
    let connector;
    try {
      connector = this.getConnector(id);
    } catch (e) {}
    return connector;
  };


  this.putConnector = (connector) => {
    // Validate that types are provided when IDs are provided
    if (connector.originItemId && !connector.originItemType) {
      throw new Error('originItemType is required when originItemId is provided');
    }
    if (connector.destinationItemId && !connector.destinationItemType) {
      throw new Error('destinationItemType is required when destinationItemId is provided');
    }
    
    // Initialize zIndex if not provided
    if (connector.zIndex === undefined) {
      connector.zIndex = getNextZIndex(store);
    }
    const id = store.createConnector(connector);
    return id;
  };

  this.deleteConnector = (id) => {
    store.deleteConnector(id);
  };

  this.updateArrowHead = (id, arrowHead) => {
    store.updateArrowHead(id, arrowHead);
  };

  this.updateConnectorColor = (id, color) => {
    store.updateConnectorColor(id, color);
  };

  this.ensureConnectorHasColor = (id) => {
    store.ensureConnectorHasColor(id);
  };

  this.updateConnectorEndpoint = (id, endpoint, data) => {
    store.updateConnectorEndpoint(id, endpoint, data);
  };

  this.updateCurveControlPoint = (connectorId, point) => {
    store.updateCurveControlPoint(connectorId, point);
  };

  // Generic plugin-based item operations (backward-compatible wrappers kept below)
  this.putBoardItem = (type, data) => {
    const plugin = getPlugin(type);
    if (!plugin) throw new Error(`Unknown board item type: ${type}`);
    return plugin.createItem(this, data);
  };
  this.deleteBoardItem = (type, id) => {
    const plugin = getPlugin(type);
    if (!plugin) throw new Error(`Unknown board item type: ${type}`);
    return plugin.deleteItem(this, id);
  };
  this.moveBoardItem = (type, id, location) => {
    const plugin = getPlugin(type);
    if (!plugin) throw new Error(`Unknown board item type: ${type}`);
    return plugin.moveItem(this, id, location);
  };
  this.resizeBoardItem = (type, id, params) => {
    const plugin = getPlugin(type);
    if (!plugin) throw new Error(`Unknown board item type: ${type}`);
    return plugin.resizeItem(this, id, params);
  };
  this.getBoardItemByType = (type, id) => {
    const plugin = getPlugin(type);
    if (!plugin) throw new Error(`Unknown board item type: ${type}`);
    return plugin.getItem(this, id);
  };
  this.getBoardItemLocationByType = (type, id) => {
    const plugin = getPlugin(type);
    if (!plugin) throw new Error(`Unknown board item type: ${type}`);
    return plugin.getLocation(this, id);
  };

  /**
   * Update a board item's z-index
   * @param {string} type - Item type ('sticky', 'image', 'connector')
   * @param {string} id - Item ID
   * @param {number} zIndex - New z-index value
   */
  this.updateBoardItemZIndex = (type, id, zIndex) => {
    updateItemZIndex(store, type, id, zIndex);
  };

  /**
   * Move a board item's z-index
   * @param {string} type - Item type ('sticky', 'image', 'connector')
   * @param {string} id - Item ID
   * @param {string} direction - 'up', 'down', 'to-top', 'to-back'
   */
  this.moveBoardItemZIndex = (type, id, direction) => {
    moveItemsZIndex(store, [{ type, id }], direction);
  };

  /**
   * Move multiple selected items' z-index together
   * @param {Array} selectedItems - Array of {type, id} objects
   * @param {string} direction - 'up', 'down', 'to-top', 'to-back'
   */
  this.moveSelectedItemsZIndex = (selectedItems, direction) => {
    moveItemsZIndex(store, selectedItems, direction);
  };

  /**
   * Move a connector's curve handle by delta
   * This is a separate method that can be called independently
   * 
   * @param {string} connectorId - Connector ID
   * @param {number} deltaX - Delta X movement
   * @param {number} deltaY - Delta Y movement
   */
  this.moveConnectorCurveHandle = (connectorId, deltaX, deltaY) => {
    const connector = store.getConnector(connectorId);
    
    if (connector.curveControlPoint) {
      const newCurveControlPoint = {
        x: connector.curveControlPoint.x + deltaX,
        y: connector.curveControlPoint.y + deltaY
      };
      store.updateCurveControlPoint(connectorId, newCurveControlPoint);
    }
  };

  this.moveConnector = (id, deltaX, deltaY) => {
    const connector = store.getConnector(id);
    const plugins = getAllPlugins();
    
    // Check if endpoints are connected to any item using plugins
    const isOriginConnected = plugins.some(plugin => plugin.isEndpointConnected(connector, 'origin'));
    const isDestinationConnected = plugins.some(plugin => plugin.isEndpointConnected(connector, 'destination'));
    
    // Only move connectors that have at least one disconnected endpoint
    const hasDisconnectedOrigin = connector.originPoint && !isOriginConnected;
    const hasDisconnectedDestination = connector.destinationPoint && !isDestinationConnected;
    
    if (!hasDisconnectedOrigin && !hasDisconnectedDestination) {
      return; // Connector is fully connected, don't move it
    }
    
    // Move disconnected endpoints
    if (hasDisconnectedOrigin) {
      const newOriginPoint = {
        x: connector.originPoint.x + deltaX,
        y: connector.originPoint.y + deltaY
      };
      store.updateConnectorEndpoint(id, 'origin', { point: newOriginPoint });
    }
    
    if (hasDisconnectedDestination) {
      const newDestinationPoint = {
        x: connector.destinationPoint.x + deltaX,
        y: connector.destinationPoint.y + deltaY
      };
      store.updateConnectorEndpoint(id, 'destination', { point: newDestinationPoint });
    }
    
    // Always move the curve handle if it exists
    this.moveConnectorCurveHandle(id, deltaX, deltaY);
  };

  /**
   * Move curve handles of connectors connected to board items
   * Tracks which connectors have been moved to avoid double movement
   * 
   * @param {Object} itemIdsByType - Map of type to array of IDs, e.g. { 'sticky': ['1', '2'], 'image': ['3'] }
   * @param {number} deltaX - Movement delta X
   * @param {number} deltaY - Movement delta Y
   */
  this.moveConnectorsConnectedToItems = (itemIdsByType, deltaX, deltaY, movedConnectors = new Set()) => {
    const state = store.getState();
    const plugins = getAllPlugins();
    const itemIdSets = {};
    
    // Build sets for each type
    Object.entries(itemIdsByType).forEach(([type, ids]) => {
      itemIdSets[type] = new Set(ids);
    });
    
    // Find all connectors connected to any of the moved items
    Object.entries(state.connectors).forEach(([connectorId, connector]) => {
      // Skip if already moved
      if (movedConnectors.has(connectorId)) return;
      
      // Check if connector is connected to any moved item using plugins
      let isConnected = false;
      
      for (const plugin of plugins) {
        const type = plugin.getType();
        if (itemIdSets[type]) {
          const itemIds = itemIdSets[type];
          for (const itemId of itemIds) {
            if (plugin.isConnectorConnectedToItem(connector, itemId)) {
              isConnected = true;
              break;
            }
          }
          if (isConnected) break;
        }
      }
      
      if (isConnected) {
        // Move the curve handle only once, even if connected to multiple moved items
        this.moveConnectorCurveHandle(connectorId, deltaX, deltaY);
        movedConnectors.add(connectorId);
      }
    });
  };

  this.getState = () => store.getState();

  this.setState = (state) => {
    store.setState(state);
  };

  this.getStickyBaseSize = () => 70;
  this.getGridUnit = () => gridSize;
  this.getBoardSize = () => {
    const { origin, limit } = getBoardInternal();
    return {
      width: limit.x - origin.x,
      height: limit.y - origin.y,
    };
  };

  this.getOrigin = () => {
    const { origin } = getBoardInternal();
    return { x: origin.x, y: origin.y };
  };

  this.addObserver = store.addObserver;

  this.moveInBounds = ({ origin, limit }) => {
    // Temporarily update board bounds for snapping calculations
    const oldBoard = store.getBoard(DEFAULT_BOARD);
    store.updateBoard({ origin, limit });
    
    try {
      // Use plugins to move items in bounds
      const plugins = getAllPlugins();
      plugins.forEach(plugin => {
        const state = store.getState();
        const storageKey = plugin.getSelectionType();
        if (!storageKey) return;
        
        Object.entries(state[storageKey] || {}).forEach(([id, item]) => {
          const oldLocation = item.location;
          // Call moveItem which will snap to current bounds
          plugin.moveItem(this, id, oldLocation);
          // Check if location changed
          const updatedItem = plugin.getItem(this, id);
          const outOfBounds = oldLocation.x !== updatedItem.location.x || oldLocation.y !== updatedItem.location.y;
          // moveItem already updated the store, so we're done
        });
      });
    } finally {
      // Restore original board bounds
      store.updateBoard(oldBoard);
    }
  };
}

function snapDimension(x, gridSize) {
  const remainder = x % gridSize;
  x -= remainder;
  if (remainder >= gridSize / 2) {
    x += gridSize;
  }
  return x;
}

function snapLocationWithSize(location, gridSize, origin, limit, widthPx, heightPx) {
  // Snap to grid boundaries for fine positioning
  return {
    x: Math.min(
      limit.x - widthPx,
      Math.max(origin.x, snapDimension(Math.floor(location.x), gridSize))
    ),
    y: Math.min(
      limit.y - heightPx,
      Math.max(origin.y, snapDimension(Math.floor(location.y), gridSize))
    ),
  };
}
