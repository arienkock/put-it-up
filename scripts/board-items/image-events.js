import { StateMachine, GlobalListenerManager } from "../ui/state-machine-base.js";
import { createStateConfig } from "../ui/state-config-pattern.js";
import { getEventCoordinates, getEventPageCoordinates } from "../ui/movement-utils.js";

/**
 * Image State Machine
 * Centralized state management for image events
 */
const ImageState = {
  IDLE: 'idle',
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
        
        // Clean up any leftover pointer listeners
        if (stateData.mouseMoveListener) {
          document.removeEventListener('mousemove', stateData.mouseMoveListener);
          stateData.mouseMoveListener = null;
        }
        if (stateData.touchMoveListener) {
          document.removeEventListener('touchmove', stateData.touchMoveListener);
          stateData.touchMoveListener = null;
        }
        stateData.pointerDownPos = null;
        stateData.dragStarted = false;
      },
      cleanup: (stateData, stateMachine) => {
        if (stateMachine.globalListeners) {
          stateMachine.clearAllListeners();
        }
        
        // Clean up any leftover pointer listeners
        if (stateData.mouseMoveListener) {
          document.removeEventListener('mousemove', stateData.mouseMoveListener);
          stateData.mouseMoveListener = null;
        }
        if (stateData.touchMoveListener) {
          document.removeEventListener('touchmove', stateData.touchMoveListener);
          stateData.touchMoveListener = null;
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
  
  setupResizeListeners() {
    this.globalListeners.setListeners({
      'mousemove': this.handleImageResize.bind(this),
      'mouseup': this.handleImageResizeEnd.bind(this),
      'touchmove': (e) => {
        e.preventDefault(); // Prevent scrolling during resize
        this.handleImageResize(e);
      },
      'touchend': (e) => {
        e.preventDefault();
        this.handleImageResizeEnd(e);
      }
    });
  }
  
  handleImageResizeEnd(event) {
    if (this.currentState !== ImageState.RESIZING) return;
    
    event.preventDefault();
    event.stopPropagation(); // Prevent click events from firing after resize
    
    this.transitionTo(ImageState.IDLE, 'resize ended');
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
          
          // Extract coordinates from touch or mouse event
          const coords = getEventCoordinates(event);
          if (!coords) return;
          
          stateData.imageId = this.id;
          stateData.resizeSide = resizeSide;
          stateData.resizeStart = { x: coords.clientX, y: coords.clientY };
          
          const image = this.store.getBoardItem('image', this.id);
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
                 !appState.ui.nextClickCreatesConnector &&
                 window.dragManager;
        },
        
        onMouseDown: (event, stateData) => {
          // Extract page coordinates from touch or mouse event
          const pageCoords = getEventPageCoordinates(event);
          if (!pageCoords) return;
          
          // Store pointer down position for drag detection
          stateData.pointerDownPos = { x: pageCoords.pageX, y: pageCoords.pageY };
          stateData.dragStarted = false;
          
          console.log('[IMAGE POINTERDOWN] Tracking pointer position', stateData.pointerDownPos);
          
          // Add pointer move listeners to detect drag
          stateData.mouseMoveListener = (moveEvent) => {
            const moveCoords = getEventPageCoordinates(moveEvent);
            if (!moveCoords) return;
            
            const movedX = Math.abs(moveCoords.pageX - stateData.pointerDownPos.x);
            const movedY = Math.abs(moveCoords.pageY - stateData.pointerDownPos.y);
            
            // Only start drag if pointer has moved more than 5 pixels
            if (movedX > 5 || movedY > 5) {
              console.log('[IMAGE POINTERMOVE] Starting drag', { movedX, movedY });
              document.removeEventListener('mousemove', stateData.mouseMoveListener);
              if (stateData.touchMoveListener) {
                document.removeEventListener('touchmove', stateData.touchMoveListener);
              }
              
              stateData.dragStarted = true; // Mark that we started a drag
              
              // Start the drag
              if (window.dragManager && window.dragManager.startDrag(this.id, 'image', moveEvent)) {
                moveEvent.preventDefault();
                moveEvent.stopPropagation();
              }
            }
          };
          
          stateData.touchMoveListener = (moveEvent) => {
            moveEvent.preventDefault(); // Prevent scrolling
            stateData.mouseMoveListener(moveEvent);
          };
          
          document.addEventListener('mousemove', stateData.mouseMoveListener);
          document.addEventListener('touchmove', stateData.touchMoveListener, { passive: false });
        }
      },
      
      // Handler for selection in connector mode
      selectionHandler: {
        canHandle: (event, state, appState) => {
          return state === ImageState.IDLE && 
                 appState.ui.nextClickCreatesConnector;
        },
        
        onClick: (event, stateData) => {
          console.log('[IMAGE CLICK] Click event fired (connector mode)', { id: this.id, shiftKey: event.shiftKey, target: event.target });
          
          // Clean up pointer listeners if they exist
          if (stateData.mouseMoveListener) {
            document.removeEventListener('mousemove', stateData.mouseMoveListener);
            stateData.mouseMoveListener = null;
          }
          if (stateData.touchMoveListener) {
            document.removeEventListener('touchmove', stateData.touchMoveListener);
            stateData.touchMoveListener = null;
          }
          
          // Check if this was actually a drag - only return early if a drag actually started
          if (stateData.dragStarted) {
            console.log('[IMAGE CLICK] This was a drag, not a click');
            stateData.pointerDownPos = null;
            stateData.dragStarted = false;
            return;
          }
          
          stateData.pointerDownPos = null;
          
          // Ignore click if we just completed a drag
          if (window.dragManager && window.dragManager.justCompletedDrag) {
            console.log('[IMAGE CLICK] Ignoring click after drag');
            return;
          }
          
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
          console.log('[IMAGE CLICK] Click event fired', { id: this.id, shiftKey: event.shiftKey, target: event.target });
          
          // Clean up pointer listeners if they exist
          if (stateData.mouseMoveListener) {
            document.removeEventListener('mousemove', stateData.mouseMoveListener);
            stateData.mouseMoveListener = null;
          }
          if (stateData.touchMoveListener) {
            document.removeEventListener('touchmove', stateData.touchMoveListener);
            stateData.touchMoveListener = null;
          }
          
          // Check if this was actually a drag - only return early if a drag actually started
          if (stateData.dragStarted) {
            console.log('[IMAGE CLICK] This was a drag, not a click');
            stateData.pointerDownPos = null;
            stateData.dragStarted = false;
            return;
          }
          
          stateData.pointerDownPos = null;
          
          // Ignore click if we just completed a drag
          if (window.dragManager && window.dragManager.justCompletedDrag) {
            console.log('[IMAGE CLICK] Ignoring click after drag');
            return;
          }
          
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
  
  // Mouse/touch move handler for resizing
  handleImageResize(event) {
    if (this.currentState !== ImageState.RESIZING) return;
    
    const appState = this.store.getAppState();
    const boardScale = appState.ui.boardScale || 1;
    
    // Extract coordinates from touch or mouse event
    const coords = getEventCoordinates(event);
    if (!coords) return;
    
    const dx = coords.clientX - this.stateData.resizeStart.x;
    const dy = coords.clientY - this.stateData.resizeStart.y;
    
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
      
      // Resize the image using generic board method
      const board = this.store.getAppState?.()?.board || window.board;
      if (board && board.resizeBoardItem) {
        board.resizeBoardItem('image', this.stateData.imageId, { isGrow, side: this.stateData.resizeSide });
      }
      
      // Update resize start to prevent accumulation
      this.stateData.resizeStart = { x: coords.clientX, y: coords.clientY };
    }
  }
  
  
  setupEventListeners() {
    // Single mousedown/touchstart handler with routing
    this.container.onmousedown = (event) => {
      this.routeMouseDown(event);
    };
    
    this.container.addEventListener('touchstart', (event) => {
      // Prevent default to allow touch dragging/resizing
      event.preventDefault();
      this.routeMouseDown(event);
    }, { passive: false });

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
