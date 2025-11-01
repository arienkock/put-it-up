import { StateMachine, GlobalListenerManager } from "./state-machine-base.js";
import { createStateConfig } from "./state-config-pattern.js";
import { moveItemFromOriginal, calculateMovementDelta, getEventCoordinates } from "./movement-utils.js";

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
    
    // Flag to track if we just completed a drag to ignore subsequent clicks
    this.justCompletedDrag = false;

    // rAF throttling for mousemove
    this.rafPending = false;
    this.lastMoveEvent = null;
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
      'mousemove': (e) => {
        // Throttle to once per animation frame
        this.lastMoveEvent = e;
        if (this.rafPending) return;
        this.rafPending = true;
        requestAnimationFrame(() => {
          this.rafPending = false;
          const event = this.lastMoveEvent;
          if (event) {
            this.handleDragMove(event);
          }
        });
      },
      'mouseup': this.handleDragEnd.bind(this),
      'touchmove': (e) => {
        e.preventDefault(); // Prevent scrolling during drag
        // Throttle to once per animation frame
        this.lastMoveEvent = e;
        if (this.rafPending) return;
        this.rafPending = true;
        requestAnimationFrame(() => {
          this.rafPending = false;
          const event = this.lastMoveEvent;
          if (event) {
            this.handleDragMove(event);
          }
        });
      },
      'touchend': (e) => {
        e.preventDefault();
        this.handleDragEnd(e);
      }
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
   * Called by content type handlers when a mousedown/touchstart occurs on a draggable item
   * 
   * @param {string} itemId - The initiating item ID
   * @param {string} itemType - Type of item ('sticky', 'image', 'connector')
   * @param {MouseEvent|TouchEvent} event - Mouse or touch event that triggered the drag
   * @param {Object} options - Additional options for drag start
   */
  startDrag(itemId, itemType, event, options = {}) {
    // Check if we can start drag
    const appState = this.store.getAppState();
    if (!this.canStartDrag(itemId, itemType, appState)) {
      return false;
    }
    
    // Extract coordinates from touch or mouse event
    const coords = getEventCoordinates(event);
    if (!coords) {
      return false;
    }
    
    // Check if item is currently selected
    let stickySelection = this.selectionManager.getSelection('stickies');
    let imageSelection = this.selectionManager.getSelection('images');
    let connectorSelection = this.selectionManager.getSelection('connectors');
    
    // DEBUG: Log current selections
    console.log('[DRAG START] Before checking selection:', {
      itemId,
      itemType,
      selectedStickies: stickySelection ? Object.keys(appState.ui.selection || {}) : [],
      selectedImages: imageSelection ? Object.keys(appState.ui.imageSelection || {}) : [],
      selectedConnectors: connectorSelection ? Object.keys(appState.ui.connectorSelection || {}) : []
    });
    
    const isSelected = 
      (itemType === 'sticky' && stickySelection && stickySelection.isSelected(itemId)) ||
      (itemType === 'image' && imageSelection && imageSelection.isSelected(itemId)) ||
      (itemType === 'connector' && connectorSelection && connectorSelection.isSelected(itemId));
    
    console.log('[DRAG START] Item is selected?', isSelected);
    
    // If not selected, add it to the current selection (don't toggle, just add)
    if (!isSelected) {
      console.log('[DRAG START] Adding item to selection');
      this.selectionManager.addToSelection(itemType, itemId);
      // Re-read selections after potential update
      stickySelection = this.selectionManager.getSelection('stickies');
      imageSelection = this.selectionManager.getSelection('images');
      connectorSelection = this.selectionManager.getSelection('connectors');
    }
    
    // DEBUG: Log selections after potential update
    const appStateAfter = this.store.getAppState();
    console.log('[DRAG START] After processing selection:', {
      selectedStickies: Object.keys(appStateAfter.ui.selection || {}),
      selectedImages: Object.keys(appStateAfter.ui.imageSelection || {}),
      selectedConnectors: Object.keys(appStateAfter.ui.connectorSelection || {})
    });
    
    // Store drag start information
    const boardScale = appState.ui.boardScale || 1;
    this.stateData.initiatingItemId = itemId;
    this.stateData.initiatingItemType = itemType;
    this.stateData.dragStart = { x: coords.clientX, y: coords.clientY };
    this.stateData.lastPosition = { x: coords.clientX, y: coords.clientY };
    this.stateData.boardScale = boardScale;
    this.stateData.originalLocations = {};
    
    // Track last positions for calculating incremental deltas for connectors
    this.stateData.lastLocations = {
      stickies: new Map(),
      images: new Map()
    };
    
    // Collect all selected items across all types and store their original locations
    if (stickySelection && stickySelection.hasItems()) {
      this.stateData.originalLocations.stickies = new Map();
      stickySelection.forEach((id) => {
        const sticky = this.store.getSticky(id);
        if (sticky) {
          const location = { ...sticky.location };
          this.stateData.originalLocations.stickies.set(id, location);
          this.stateData.lastLocations.stickies.set(id, location);
        }
      });
    }
    
    if (imageSelection && imageSelection.hasItems()) {
      this.stateData.originalLocations.images = new Map();
      imageSelection.forEach((id) => {
        const image = this.store.getImage(id);
        if (image) {
          const location = { ...image.location };
          this.stateData.originalLocations.images.set(id, location);
          this.stateData.lastLocations.images.set(id, location);
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
   * Handle mouse/touch move during drag
   * Updates all selected items based on pointer movement
   * 
   * @param {MouseEvent|TouchEvent} event - Mouse or touch event
   */
  handleDragMove(event) {
    if (this.currentState !== DragState.DRAGGING) return;
    
    event.preventDefault();
    
    // Extract coordinates from touch or mouse event
    const coords = getEventCoordinates(event);
    if (!coords) return;
    
    // Calculate movement delta
    const delta = calculateMovementDelta(
      this.stateData.dragStart.x,
      this.stateData.dragStart.y,
      coords.clientX,
      coords.clientY,
      this.stateData.boardScale
    );
    
    // Collect IDs of items being moved
    const stickyIds = [];
    const imageIds = [];
    
    // Move all selected stickies
    if (this.stateData.originalLocations.stickies) {
      this.stateData.originalLocations.stickies.forEach((originalLocation, id) => {
        stickyIds.push(id);
        moveItemFromOriginal(id, originalLocation, delta.dx, delta.dy, this.board, 'sticky');
      });
    }
    
    // Move all selected images
    if (this.stateData.originalLocations.images) {
      this.stateData.originalLocations.images.forEach((originalLocation, id) => {
        imageIds.push(id);
        moveItemFromOriginal(id, originalLocation, delta.dx, delta.dy, this.board, 'image');
      });
    }
    
    // Move all selected connectors (connectors use incremental delta movement)
    if (this.stateData.originalLocations.connectors) {
      // Calculate incremental delta for connectors from last position
      const connectorDelta = calculateMovementDelta(
        this.stateData.lastPosition.x,
        this.stateData.lastPosition.y,
        coords.clientX,
        coords.clientY,
        this.stateData.boardScale
      );
      
      this.stateData.originalLocations.connectors.forEach((_, id) => {
        this.board.moveConnector(id, connectorDelta.dx, connectorDelta.dy);
      });
    }
    
    // Move connectors connected to moved items with actual deltas
    // (accounting for snapping and boundary constraints)
    // Track which connectors have been moved to avoid double movement
    const movedConnectors = new Set();
    
    stickyIds.forEach((id) => {
      const lastLocation = this.stateData.lastLocations.stickies?.get(id);
      if (lastLocation) {
        const newLocation = this.board.getStickyLocation(id);
        // Calculate incremental delta from last position to current position
        const actualDeltaX = newLocation.x - lastLocation.x;
        const actualDeltaY = newLocation.y - lastLocation.y;
        
        // Only move connectors if movement exceeds threshold (same as sticky movement threshold)
        const movementThreshold = 1; // pixels - only move if actual movement is significant
        const movementDistance = Math.sqrt(actualDeltaX * actualDeltaX + actualDeltaY * actualDeltaY);
        
        if (movementDistance > movementThreshold) {
          this.board.moveConnectorsConnectedToItems([id], [], actualDeltaX, actualDeltaY, movedConnectors);
          // Update last position for next incremental calculation
          this.stateData.lastLocations.stickies.set(id, { ...newLocation });
        }
      }
    });
    
    imageIds.forEach((id) => {
      const lastLocation = this.stateData.lastLocations.images?.get(id);
      if (lastLocation) {
        const newLocation = this.board.getImageLocation(id);
        // Calculate incremental delta from last position to current position
        const actualDeltaX = newLocation.x - lastLocation.x;
        const actualDeltaY = newLocation.y - lastLocation.y;
        
        // Only move connectors if movement exceeds threshold
        const movementThreshold = 1; // pixels - only move if actual movement is significant
        const movementDistance = Math.sqrt(actualDeltaX * actualDeltaX + actualDeltaY * actualDeltaY);
        
        if (movementDistance > movementThreshold) {
          this.board.moveConnectorsConnectedToItems([], [id], actualDeltaX, actualDeltaY, movedConnectors);
          // Update last position for next incremental calculation
          this.stateData.lastLocations.images.set(id, { ...newLocation });
        }
      }
    });
    
    // Update last position for next move (used for connectors)
    this.stateData.lastPosition = { x: coords.clientX, y: coords.clientY };
  }
  
  /**
   * Handle mouse/touch up during drag
   * Completes the drag operation
   * 
   * @param {MouseEvent|TouchEvent} event - Mouse or touch event
   */
  handleDragEnd(event) {
    if (this.currentState !== DragState.DRAGGING) return;
    
    event.preventDefault();
    event.stopPropagation(); // Prevent click events from firing after drag
    
    const appState = this.store.getAppState();
    
    // DEBUG: Log selections at drag end
    console.log('[DRAG END] Current selections:', {
      selectedStickies: Object.keys(appState.ui.selection || {}),
      selectedImages: Object.keys(appState.ui.imageSelection || {}),
      selectedConnectors: Object.keys(appState.ui.connectorSelection || {})
    });
    
    // Set flag to ignore click events that fire after drag
    this.justCompletedDrag = true;
    
    // Clear the flag after a short delay to allow click events to be suppressed
    setTimeout(() => {
      this.justCompletedDrag = false;
    }, 100);
    
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
    getActiveListeners: () => stateMachine.getActiveListeners(),
    get justCompletedDrag() { return stateMachine.justCompletedDrag; },
    get selectionManager() { return stateMachine.selectionManager; },
    get store() { return stateMachine.store; }
  };
}

// Export for testing
export {
  DragState,
  DragStateMachine
};

