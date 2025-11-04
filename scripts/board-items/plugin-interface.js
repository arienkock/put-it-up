/**
 * Board Item Plugin Interface
 * Defines the contract for draggable/resizable board content types.
 * Implementations should prefer delegating to existing modules (DOM/events/styling)
 * and Board/Store APIs for persistence and movement.
 */

export class BoardItemPlugin {
  /** @returns {string} unique type id, e.g. 'sticky', 'image' */
  getType() { throw new Error('Not implemented'); }

  /**
   * Create renderer bound to this plugin type.
   * @param {object} board
   * @param {HTMLElement} domElement
   * @param {object} selectionManager
   * @param {Array<string>} itemsMovedByDragging
   * @param {object} store
   * @returns {(id: string, item: object|undefined) => void}
   */
  createRenderer(board, domElement, selectionManager, itemsMovedByDragging, store) {
    throw new Error('Not implemented');
  }

  /** @returns {string} CSS class for container base, e.g. 'sticky-container' */
  getContainerBaseClass() { throw new Error('Not implemented'); }

  /** @returns {string} CSS class prefix for id, e.g. 'sticky-' */
  getContainerClassPrefix() { throw new Error('Not implemented'); }

  /** @returns {string} selection type key, e.g. 'stickies' */
  getSelectionType() { throw new Error('Not implemented'); }

  /** Create new item on the board, return id */
  createItem(board, itemData) { throw new Error('Not implemented'); }

  /** Delete item and perform cascading cleanup if needed */
  deleteItem(board, id) { throw new Error('Not implemented'); }

  /** Move item to location */
  moveItem(board, id, location) { throw new Error('Not implemented'); }

  /** Optional: resize item by params. Return boolean if handled */
  resizeItem(board, id, params) { return false; }

  /** Get raw item data */
  getItem(board, id) { throw new Error('Not implemented'); }

  /** Get item location */
  getLocation(board, id) { throw new Error('Not implemented'); }

  /** Update item fields */
  updateItem(board, id, updates) { throw new Error('Not implemented'); }

  /** Check if raw data is this plugin's item */
  isItem(itemData) { throw new Error('Not implemented'); }

  /** Check if DOM element belongs to this plugin's item */
  isElement(element) { throw new Error('Not implemented'); }

  /**
   * Compute bounds used by connectors.
   * @param {object} item
   * @param {{x:number,y:number}} boardOrigin
   * @param {object} options
   * @returns {{centerX:number, centerY:number, width:number, height:number}|null}
   */
  getBounds(item, boardOrigin, options) { throw new Error('Not implemented'); }

  /**
   * Check if a connector is connected to an item of this plugin type.
   * @param {object} connector - The connector object
   * @param {string} itemId - The item ID to check
   * @returns {boolean} True if the connector references this item
   */
  isConnectorConnectedToItem(connector, itemId) { throw new Error('Not implemented'); }

  /**
   * Check if a connector endpoint is connected to any item of this plugin type.
   * @param {object} connector - The connector object
   * @param {string} endpoint - Either 'origin' or 'destination'
   * @returns {boolean} True if the endpoint is connected to an item of this plugin type
   */
  isEndpointConnected(connector, endpoint) { throw new Error('Not implemented'); }
}


