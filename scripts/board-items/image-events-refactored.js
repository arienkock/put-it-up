import { StateMachine, GlobalListenerManager } from "../ui/state-machine-base.js";
import { createStateConfig } from "../ui/state-config-pattern.js";
import { calculateMovementDelta } from "../ui/movement-utils.js";

/**
 * Image State Machine
 * Centralized state management for image events
 */
const ImageState = {
  IDLE: 'idle',
  DRAGGING: 'dragging',
  RESIZING: 'resizing'
};

/**
 * Image State Machine Implementation
 * Uses the new StateMachine base class for consistent behavior
 */
class ImageStateMachine extends StateMachine {
  constructor(container, id, getImageLocation, selectionManager, store) {
    const stateConfig = createStateConfig(ImageState);
    
    // Configure each state
    stateConfig[ImageState.IDLE] = {
      setup: (stateData, stateMachine) => {
        if (stateMachine.globalListeners) {
          stateMachine.clearAllListeners();
          stateMachine.resetCursor();
        }
      },
      cleanup: (stateData, stateMachine) => {
        if (stateMachine.globalListeners) {
          stateMachine.clearAllListeners();
        }
      }
    };
    
    stateConfig[ImageState.DRAGGING] = {
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
    
    stateConfig[ImageState.RESIZING] = {
      setup: (stateData, stateMachine) => {
        if (stateMachine.globalListeners) {
          stateMachine.setCursor(stateMachine.getCursorForResizeSide(stateData.resizeSide));
          stateMachine.setupResizeListeners();
        }
      },
      cleanup: (stateData, stateMachine) => {
        if (stateMachine.globalListeners) {
          stateMachine.clearAllListeners();
          stateMachine.resetCursor();
        }
      }
    };
    
    super(ImageState.IDLE, stateConfig);
    
    // Initialize properties after super constructor
    this.container = container;
    this.id = id;
    this.getImageLocation = getImageLocation;
    this.selectionManager = selectionManager;
    this.store = store;
    
    // Global listener manager
    this.globalListeners = new GlobalListenerManager();
    
    this.setupEventListeners();
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
      'mousemove': this.handleImageDrag.bind(this),
      'mouseup': this.handleImageDragEnd.bind(this)
    });
  }
  
  setupResizeListeners() {
    this.globalListeners.setListeners({
      'mousemove': this.handleImageResize.bind(this),
      'mouseup': this.handleImageResizeEnd.bind(this)
    });
  }
  
  /**
   * Helper function to extract resize side from class name
   */
  extractResizeSide(handle) {
    if (!handle) return null;
    
    const classNames = handle.className.split(' ');
    for (const className of classNames) {
      if (className.startsWith('resize-handle-')) {
        return className.replace('resize-handle-', '');
      }
    }
    return null;
  }
  
  /**
   * Helper function to get cursor for resize side
   */
  getCursorForResizeSide(resizeSide) {
    switch (resizeSide) {
      case 'left':
      case 'right':
        return 'ew-resize';
      case 'top':
      case 'bottom':
        return 'ns-resize';
      default:
        return 'default';
    }
  }
  
  /**
   * Event handling wrapper with debug logging
   */
  handleEvent(eventName, event, handlerFn) {
    if (this.isDebugMode()) {
      console.log(`[ImageEvent] ${eventName} in ${this.currentState}`, {
        target: event.target?.className || 'unknown',
        handler: handlerFn.name,
        stateData: { ...this.stateData }
      });
    }
    
    try {
      return handlerFn(event, this.stateData);
    } catch (error) {
      console.error(`[ImageError] in ${handlerFn.name}:`, error);
      // Reset to safe state
      this.transitionTo(ImageState.IDLE, 'error recovery');
      throw error;
    }
  }
  
  /**
   * Sub-handler architecture with explicit precedence
   */
  getImageHandlers() {
    return {
      // Handler for resize operations
      resizeHandler: {
        canHandle: (event, state, appState) => {
          const handle = event.target?.closest?.('.resize-handle');
          return state === ImageState.IDLE && 
                 handle !== null &&
                 !appState.ui.nextClickCreatesConnector;
        },
        
        onMouseDown: (event, stateData) => {
          const handle = event.target.closest('.resize-handle');
          const resizeSide = this.extractResizeSide(handle);
          
          if (!resizeSide) {
            console.error('Could not determine resize side from class name:', handle.className);
            return;
          }
          
          event.preventDefault();
          event.stopPropagation();
          
          stateData.imageId = this.id;
          stateData.resizeSide = resizeSide;
          stateData.resizeStart = { x: event.clientX, y: event.clientY };
          
          const image = this.store.getImage(this.id);
          stateData.originalSize = { width: image.width, height: image.height };
          stateData.aspectRatio = image.naturalWidth / image.naturalHeight;
          
          this.transitionTo(ImageState.RESIZING, 'resize started');
        }
      },
      
      // Handler for dragging
      dragHandler: {
        canHandle: (event, state, appState) => {
          const handle = event.target?.closest?.('.resize-handle');
          return state === ImageState.IDLE && 
                 handle === null &&
                 !appState.ui.nextClickCreatesConnector;
        },
        
        onMouseDown: (event, stateData) => {
          event.preventDefault();
          event.stopPropagation();
          
          stateData.imageId = this.id;
          stateData.dragStart = { x: event.clientX, y: event.clientY };
          stateData.originalLocation = this.getImageLocation(this.id);
          
          // Select this image
          this.selectionManager.clearAllSelections();
          this.selectionManager.getSelection('images').replaceSelection(this.id);
          
          this.transitionTo(ImageState.DRAGGING, 'drag started');
        }
      },
      
      // Handler for selection in connector mode
      selectionHandler: {
        canHandle: (event, state, appState) => {
          return state === ImageState.IDLE && 
                 appState.ui.nextClickCreatesConnector;
        },
        
        onClick: (event, stateData) => {
          event.stopPropagation();
          
          if (!event.shiftKey) {
            this.selectionManager.clearAllSelections();
          }
          
          this.selectionManager.getSelection('images').toggleSelected(this.id);
        }
      },
      
      // Handler for normal selection
      normalSelectionHandler: {
        canHandle: (event, state, appState) => {
          return state === ImageState.IDLE && 
                 !appState.ui.nextClickCreatesConnector;
        },
        
        onClick: (event, stateData) => {
          event.stopPropagation();
          
          if (!event.shiftKey) {
            this.selectionManager.clearAllSelections();
          }
          
          this.selectionManager.getSelection('images').toggleSelected(this.id);
        }
      }
    };
  }
  
  /**
   * Explicit priority order
   */
  getHandlerPriority() {
    return [
      'resizeHandler',     // Highest - resize takes precedence over drag
      'dragHandler',       // Mid priority
      'normalSelectionHandler', // Normal selection (not in connector mode)
      'selectionHandler',  // Lowest - only if in connector mode
    ];
  }
  
  /**
   * Single entry point with routing
   */
  routeMouseDown(event) {
    const appState = this.store.getAppState();
    const handlers = this.getImageHandlers();
    
    // Route to appropriate handler based on current state and context
    for (const handlerName of this.getHandlerPriority()) {
      const handler = handlers[handlerName];
      if (handler.canHandle && handler.canHandle(event, this.currentState, appState)) {
        if (handler.onMouseDown) {
          return this.handleEvent('mousedown', event, handler.onMouseDown);
        }
      }
    }
  }
  
  routeClick(event) {
    const appState = this.store.getAppState();
    const handlers = this.getImageHandlers();
    
    // Route to appropriate handler based on current state and context
    for (const handlerName of this.getHandlerPriority()) {
      const handler = handlers[handlerName];
      if (handler.canHandle && handler.canHandle(event, this.currentState, appState)) {
        if (handler.onClick) {
          return this.handleEvent('click', event, handler.onClick);
        }
      }
    }
  }
  
  // Mouse move handler for dragging
  handleImageDrag(event) {
    if (this.currentState !== ImageState.DRAGGING) return;
    
    const appState = this.store.getAppState();
    const boardScale = appState.ui.boardScale || 1;
    
    const delta = calculateMovementDelta(
      this.stateData.dragStart.x,
      this.stateData.dragStart.y,
      event.clientX,
      event.clientY,
      boardScale
    );
    
    // Convert pixel movement to board coordinates
    const newLocation = {
      x: this.stateData.originalLocation.x + delta.dx,
      y: this.stateData.originalLocation.y + delta.dy
    };
    
    // Move the image using board.moveImage for consistency
    window.board.moveImage(this.stateData.imageId, newLocation);
  }
  
  // Mouse up handler for dragging
  handleImageDragEnd() {
    if (this.currentState !== ImageState.DRAGGING) return;
    
    this.transitionTo(ImageState.IDLE, 'drag ended');
  }
  
  // Mouse move handler for resizing
  handleImageResize(event) {
    if (this.currentState !== ImageState.RESIZING) return;
    
    const appState = this.store.getAppState();
    const boardScale = appState.ui.boardScale || 1;
    
    const dx = event.clientX - this.stateData.resizeStart.x;
    const dy = event.clientY - this.stateData.resizeStart.y;
    
    // Calculate resize based on side, accounting for board scale
    let delta = 0;
    
    switch (this.stateData.resizeSide) {
      case 'left':
        delta = -dx / boardScale;
        break;
      case 'right':
        delta = dx / boardScale;
        break;
      case 'top':
        delta = -dy / boardScale;
        break;
      case 'bottom':
        delta = dy / boardScale;
        break;
    }
    
    // Only resize if there's significant movement (threshold of 5 pixels)
    if (Math.abs(delta) >= 5) {
      const isGrow = delta > 0;
      
      // Resize the image (this will be handled by the board)
      window.board.resizeImage(this.stateData.imageId, isGrow, this.stateData.resizeSide);
      
      // Update resize start to prevent accumulation
      this.stateData.resizeStart = { x: event.clientX, y: event.clientY };
    }
  }
  
  // Mouse up handler for resizing
  handleImageResizeEnd() {
    if (this.currentState !== ImageState.RESIZING) return;
    
    this.transitionTo(ImageState.IDLE, 'resize ended');
  }
  
  setupEventListeners() {
    // Single mousedown handler with routing
    this.container.onmousedown = (event) => {
      this.routeMouseDown(event);
    };

    // Click handler for selection
    this.container.onclick = (event) => {
      this.routeClick(event);
    };
  }
  
  cleanup() {
    this.clearAllListeners();
    this.resetCursor();
    this.transitionTo(ImageState.IDLE, 'cleanup');
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
 * Setup function that creates and returns an ImageStateMachine instance
 */
export function setupImageEvents(
  container,
  id,
  getImageLocation,
  selectionManager,
  store
) {
  const stateMachine = new ImageStateMachine(container, id, getImageLocation, selectionManager, store);
  
  return {
    // Cleanup function
    cleanup: () => stateMachine.cleanup(),
    
    // Debug functions
    getCurrentState: () => stateMachine.getCurrentState(),
    getStateData: () => stateMachine.getStateData(),
    getActiveListeners: () => stateMachine.getActiveListeners()
  };
}

// Export for testing
export {
  ImageState,
  ImageStateMachine
};
