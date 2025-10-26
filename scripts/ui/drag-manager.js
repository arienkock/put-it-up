import { StateMachine, GlobalListenerManager } from "./state-machine-base.js";
import { createStateConfig } from "./state-config-pattern.js";
import { moveItemFromOriginal, calculateMovementDelta } from "./movement-utils.js";

/**
 * Drag State Machine
 * Centralized state management for drag-and-drop movement across all content types
 * Handles multi-item, multi-type dragging via SelectionManager
 */
const DragState = {
  IDLE: 'idle',
  DRAGGING: 'dragging'
};

/**
 * Drag State Machine Implementation
 * Uses the new StateMachine base class for consistent behavior
 */
class DragStateMachine extends StateMachine {
  constructor(boardElement, board, selectionManager, store, renderCallback) {
    const stateConfig = createStateConfig(DragState);
    
    // Configure each state
    stateConfig[DragState.IDLE] = {
      setup: (stateData, stateMachine) => {
        if (stateMachine.globalListeners) {
          stateMachine.clearAllListeners();
          stateMachine.resetCursor();
        }
      },
      cleanup: (stateData, stateMachine) => {
        if (stateMachine.globalListeners) {
          stateMachine.clearAllListeners();
          stateMachine.resetCursor();
        }
      }
    };
    
    stateConfig[DragState.DRAGGING] = {
      setup: (stateData, stateMachine) => {
        if (stateMachine.globalListeners) {
          stateMachine.setCursor('grabbing');
          stateMachine.setupDragListeners();
        }
      },
      cleanup: (stateData, stateMachine) => {
        if (stateMachine.globalListeners) {
          stateMachine.clearAllListeners();
          stateMachine.resetCursor();
        }
      }
    };
    
    super(DragState.IDLE, stateConfig);
    
    // Initialize properties after super constructor
    this.boardElement = boardElement;
    this.board = board;
    this.selectionManager = selectionManager;
    this.store = store;
    this.renderCallback = renderCallback;
    
    // Global listener manager
    this.globalListeners = new GlobalListenerManager();
  }
  
  clearAllListeners() {
    this.globalListeners.clearAll();
  }
  
  resetCursor() {
    document.body.style.cursor = '';
  }
  
  setCursor(cursor) {
    document.body.style.cursor = cursor;
  }
  
  setupDragListeners() {
    this.globalListeners.setListeners({
      'mousemove': this.handleDragMove.bind(this),
      'mouseup': this.handleDragEnd.bind(this)
    });
  }
  
  /**
   * Check if a drag operation can start
   * Validates that we're not in a special mode that prevents dragging
   * 
   * @param {string} itemId - The item being dragged
   * @param {string} itemType - Type of item ('sticky', 'image', 'connector')
   * @param {Object} appState - Current application state
   * @returns {boolean} True if drag can start
   */
  canStartDrag(itemId, itemType, appState) {
    // Can't start drag if we're in connector creation mode
    if (appState.ui.nextClickCreatesConnector) {
      return false;
    }
    
    // Validate item exists
    let item = null;
    switch (itemType) {
      case 'sticky':
        item = this.store.getSticky(itemId);
        // Can't drag if sticky is being edited
        const container = document.querySelector(`[data-sticky-id="${itemId}"]`);
        if (container && container.classList.contains('editing')) {
          return false;
        }
        break;
      case 'image':
        item = this.store.getImage(itemId);
        break;
      case 'connector':
        item = this.store.getConnector(itemId);
        break;
    }
    
    return item !== null;
  }
  
  /**
   * Start a drag operation
   * Called by content type handlers when a mousedown occurs on a draggable item
   * 
   * @param {string} itemId - The initiating item ID
   * @param {string} itemType - Type of item ('sticky', 'image', 'connector')
   * @param {MouseEvent} event - Mouse event that triggered the drag
   * @param {Object} options - Additional options for drag start
   */
  startDrag(itemId, itemType, event, options = {}) {
    // Check if we can start drag
    const appState = this.store.getAppState();
    if (!this.canStartDrag(itemId, itemType, appState)) {
      return false;
    }
    
    // Check if item is currently selected
    const stickySelection = this.selectionManager.getSelection('stickies');
    const imageSelection = this.selectionManager.getSelection('images');
    const connectorSelection = this.selectionManager.getSelection('connectors');
    
    const isSelected = 
      (itemType === 'sticky' && stickySelection && stickySelection.isSelected(itemId)) ||
      (itemType === 'image' && imageSelection && imageSelection.isSelected(itemId)) ||
      (itemType === 'connector' && connectorSelection && connectorSelection.isSelected(itemId));
    
    // If not selected, select it (and clear other selections)
    if (!isSelected) {
      this.selectionManager.selectItem(itemType, itemId, { addToSelection: false });
      // Re-read selections after potential update
      stickySelection = this.selectionManager.getSelection('stickies');
      imageSelection = this.selectionManager.getSelection('images');
      connectorSelection = this.selectionManager.getSelection('connectors');
    }
    
    // Store drag start information
    const boardScale = appState.ui.boardScale || 1;
    this.stateData.initiatingItemId = itemId;
    this.stateData.initiatingItemType = itemType;
    this.stateData.dragStart = { x: event.clientX, y: event.clientY };
    this.stateData.lastPosition = { x: event.clientX, y: event.clientY };
    this.stateData.boardScale = boardScale;
    this.stateData.originalLocations = {};
    
    // Collect all selected items across all types and store their original locations
    if (stickySelection && stickySelection.hasItems()) {
      this.stateData.originalLocations.stickies = new Map();
      stickySelection.forEach((id) => {
        const sticky = this.store.getSticky(id);
        if (sticky) {
          this.stateData.originalLocations.stickies.set(id, { ...sticky.location });
        }
      });
    }
    
    if (imageSelection && imageSelection.hasItems()) {
      this.stateData.originalLocations.images = new Map();
      imageSelection.forEach((id) => {
        const image = this.store.getImage(id);
        if (image) {
          this.stateData.originalLocations.images.set(id, { ...image.location });
        }
      });
    }
    
    if (connectorSelection && connectorSelection.hasItems()) {
      this.stateData.originalLocations.connectors = new Map();
      connectorSelection.forEach((id) => {
        this.stateData.originalLocations.connectors.set(id, { id }); // Connectors don't have location
      });
    }
    
    // Transition to dragging state
    this.transitionTo(DragState.DRAGGING, 'drag started');
    
    return true;
  }
  
  /**
   * Handle mouse move during drag
   * Updates all selected items based on mouse movement
   * 
   * @param {MouseEvent} event - Mouse event
   */
  handleDragMove(event) {
    if (this.currentState !== DragState.DRAGGING) return;
    
    event.preventDefault();
    
    // Calculate movement delta
    const delta = calculateMovementDelta(
      this.stateData.dragStart.x,
      this.stateData.dragStart.y,
      event.clientX,
      event.clientY,
      this.stateData.boardScale
    );
    
    // Move all selected stickies
    if (this.stateData.originalLocations.stickies) {
      this.stateData.originalLocations.stickies.forEach((originalLocation, id) => {
        moveItemFromOriginal(id, originalLocation, delta.dx, delta.dy, this.board, 'sticky');
      });
    }
    
    // Move all selected images
    if (this.stateData.originalLocations.images) {
      this.stateData.originalLocations.images.forEach((originalLocation, id) => {
        moveItemFromOriginal(id, originalLocation, delta.dx, delta.dy, this.board, 'image');
      });
    }
    
    // Move all selected connectors (connectors use incremental delta movement)
    if (this.stateData.originalLocations.connectors) {
      // Calculate incremental delta for connectors from last position
      const connectorDelta = calculateMovementDelta(
        this.stateData.lastPosition.x,
        this.stateData.lastPosition.y,
        event.clientX,
        event.clientY,
        this.stateData.boardScale
      );
      
      this.stateData.originalLocations.connectors.forEach((_, id) => {
        this.board.moveConnector(id, connectorDelta.dx, connectorDelta.dy);
      });
    }
    
    // Update last position for next move (used for connectors)
    this.stateData.lastPosition = { x: event.clientX, y: event.clientY };
  }
  
  /**
   * Handle mouse up during drag
   * Completes the drag operation
   * 
   * @param {MouseEvent} event - Mouse event
   */
  handleDragEnd(event) {
    if (this.currentState !== DragState.DRAGGING) return;
    
    event.preventDefault();
    
    const appState = this.store.getAppState();
    
    // Mark items as moved by dragging (for sticky resizing behavior)
    if (this.stateData.originalLocations.stickies) {
      this.stateData.originalLocations.stickies.forEach((_, id) => {
        appState.ui.stickiesMovedByDragging.push(id);
      });
    }
    
    // Mark items as moved by dragging (for images)
    if (this.stateData.originalLocations.images) {
      this.stateData.originalLocations.images.forEach((_, id) => {
        // Could add similar tracking here if needed
      });
    }
    
    // Transition back to idle
    this.transitionTo(DragState.IDLE, 'drag ended');
  }
  
  cleanup() {
    this.clearAllListeners();
    this.resetCursor();
    this.transitionTo(DragState.IDLE, 'cleanup');
  }
  
  // Debug functions
  getCurrentState() {
    return this.currentState;
  }
  
  getStateData() {
    return { ...this.stateData };
  }
  
  getActiveListeners() {
    return this.globalListeners.getActiveListeners();
  }
}

/**
 * Create and return a DragStateMachine instance
 * 
 * @param {HTMLElement} boardElement - The board DOM element
 * @param {Object} board - Board instance
 * @param {SelectionManager} selectionManager - Selection manager instance
 * @param {Object} store - Store instance
 * @param {Function} renderCallback - Render callback function
 * @returns {Object} Object with drag manager interface
 */
export function createDragManager(boardElement, board, selectionManager, store, renderCallback) {
  const stateMachine = new DragStateMachine(boardElement, board, selectionManager, store, renderCallback);
  
  return {
    startDrag: (itemId, itemType, event, options) => stateMachine.startDrag(itemId, itemType, event, options),
    cleanup: () => stateMachine.cleanup(),
    getCurrentState: () => stateMachine.getCurrentState(),
    getStateData: () => stateMachine.getStateData(),
    getActiveListeners: () => stateMachine.getActiveListeners()
  };
}

// Export for testing
export {
  DragState,
  DragStateMachine
};

