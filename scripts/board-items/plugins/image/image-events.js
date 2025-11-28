import { StateMachine, GlobalListenerManager } from "../../../ui/state-machine-base.js";
import { createStateConfig } from "../../../ui/state-config-pattern.js";
import { getEventCoordinates, getEventPageCoordinates } from "../../../ui/movement-utils.js";

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
          // Set cursor for resize side if available
          if (stateData.resizeSide) {
            stateMachine.setCursor(stateMachine.getCursorForResizeSide(stateData.resizeSide));
          }
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
    
    // Store cleanup functions for window event listeners
    this._windowBlurHandler = null;
    this._mouseLeaveHandler = null;
    
    this.setupEventListeners();
    this.setupWindowEventListeners();
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
    const boundHandleResize = (e) => {
      if (this.isDebugMode()) {
        console.log('[ImageResize] mousemove/touchmove event received', {
          currentState: this.currentState,
          hasStateData: !!this.stateData,
          imageId: this.stateData?.imageId
        });
      }
      this.handleImageResize(e);
    };
    
    const boundHandleResizeEnd = (e) => {
      if (this.isDebugMode()) {
        console.log('[ImageResize] mouseup/touchend event received');
      }
      this.handleImageResizeEnd(e);
    };
    
    this.globalListeners.setListeners({
      'mousemove': boundHandleResize,
      'mouseup': boundHandleResizeEnd,
      'touchmove': (e) => {
        e.preventDefault(); // Prevent scrolling during resize
        boundHandleResize(e);
      },
      'touchend': (e) => {
        e.preventDefault();
        boundHandleResizeEnd(e);
      }
    });
    
    if (this.isDebugMode()) {
      console.log('[ImageResize] Resize listeners set up', {
        activeListeners: this.globalListeners.getActiveListeners()
      });
    }
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
    
    // Handle both className (string) and classList (DOMTokenList)
    let classNames;
    if (typeof handle.className === 'string') {
      classNames = handle.className.split(' ').filter(c => c.length > 0);
    } else if (handle.classList) {
      classNames = Array.from(handle.classList);
    } else {
      return null;
    }
    
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
          // Check if the target itself is a resize handle or if it's a child of one
          const handle = event.target?.closest?.('.resize-handle');
          // Also check if the target is directly a resize handle
          const isDirectHandle = event.target?.classList?.contains?.('resize-handle') || 
                                 (event.target?.className && typeof event.target.className === 'string' && event.target.className.includes('resize-handle'));
          return state === ImageState.IDLE && 
                 (handle !== null || isDirectHandle) &&
                 !appState.ui.nextClickCreatesConnector;
        },
        
        onMouseDown: (event, stateData) => {
          // Try to find the resize handle - check target first, then closest
          let handle = event.target?.closest?.('.resize-handle');
          if (!handle && event.target?.classList?.contains?.('resize-handle')) {
            handle = event.target;
          }
          
          if (!handle) {
            console.error('[ImageResize] Could not find resize handle element');
            return;
          }
          
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
          if (!image) {
            console.error('[ImageResize] Image not found:', this.id);
            return;
          }
          
          stateData.originalSize = { width: image.width, height: image.height };
          stateData.aspectRatio = image.naturalWidth / image.naturalHeight;
          
          if (this.isDebugMode()) {
            console.log('[ImageResize] Starting resize', {
              imageId: this.id,
              resizeSide,
              resizeStart: stateData.resizeStart,
              originalSize: stateData.originalSize
            });
          }
          
          this.transitionTo(ImageState.RESIZING, 'resize started');
          
          if (this.isDebugMode()) {
            console.log('[ImageResize] State transitioned to RESIZING', {
              currentState: this.currentState,
              hasGlobalListeners: !!this.globalListeners,
              activeListeners: this.globalListeners?.getActiveListeners()
            });
          }
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
          
          if (this.isDebugMode()) {
            console.log('[IMAGE POINTERDOWN] Tracking pointer position', stateData.pointerDownPos);
          }
          
          // Add pointer move listeners to detect drag
          stateData.mouseMoveListener = (moveEvent) => {
            const moveCoords = getEventPageCoordinates(moveEvent);
            if (!moveCoords) return;
            
            const movedX = Math.abs(moveCoords.pageX - stateData.pointerDownPos.x);
            const movedY = Math.abs(moveCoords.pageY - stateData.pointerDownPos.y);
            
            // Only start drag if pointer has moved more than 5 pixels
            if (movedX > 5 || movedY > 5) {
              if (this.isDebugMode()) {
                console.log('[IMAGE POINTERMOVE] Starting drag', { movedX, movedY });
              }
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
          if (this.isDebugMode()) {
            console.log('[IMAGE CLICK] Click event fired (connector mode)', { id: this.id, shiftKey: event.shiftKey, target: event.target });
          }
          
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
            if (this.isDebugMode()) {
              console.log('[IMAGE CLICK] This was a drag, not a click');
            }
            stateData.pointerDownPos = null;
            stateData.dragStarted = false;
            return;
          }
          
          stateData.pointerDownPos = null;
          
          // Ignore click if we just completed a drag
          if (window.dragManager && window.dragManager.justCompletedDrag) {
            if (this.isDebugMode()) {
              console.log('[IMAGE CLICK] Ignoring click after drag');
            }
            return;
          }
          
          event.stopPropagation();
          
          if (!event.shiftKey) {
            this.selectionManager.clearAllSelections();
          }
          
          this.selectionManager.getSelection('images').toggleSelected(this.id);
          
          if (window.menuRenderCallback) {
            window.menuRenderCallback();
          }
        }
      },
      
      // Handler for normal selection
      normalSelectionHandler: {
        canHandle: (event, state, appState) => {
          return state === ImageState.IDLE && 
                 !appState.ui.nextClickCreatesConnector;
        },
        
        onClick: (event, stateData) => {
          if (this.isDebugMode()) {
            console.log('[IMAGE CLICK] Click event fired', { id: this.id, shiftKey: event.shiftKey, target: event.target });
          }
          
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
            if (this.isDebugMode()) {
              console.log('[IMAGE CLICK] This was a drag, not a click');
            }
            stateData.pointerDownPos = null;
            stateData.dragStarted = false;
            return;
          }
          
          stateData.pointerDownPos = null;
          
          // Ignore click if we just completed a drag
          if (window.dragManager && window.dragManager.justCompletedDrag) {
            if (this.isDebugMode()) {
              console.log('[IMAGE CLICK] Ignoring click after drag');
            }
            return;
          }
          
          event.stopPropagation();
          
          if (!event.shiftKey) {
            this.selectionManager.clearAllSelections();
          }
          
          this.selectionManager.getSelection('images').toggleSelected(this.id);
          
          if (window.menuRenderCallback) {
            window.menuRenderCallback();
          }
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
    
    // Validate state data
    if (!this.stateData.resizeStart || !this.stateData.resizeSide || !this.stateData.imageId) {
      console.error('[ImageResize] Missing required state data:', {
        resizeStart: this.stateData.resizeStart,
        resizeSide: this.stateData.resizeSide,
        imageId: this.stateData.imageId
      });
      this.transitionTo(ImageState.IDLE, 'invalid state data');
      return;
    }
    
    const appState = this.store.getAppState();
    const boardScale = appState.ui.boardScale || 1;
    
    // Extract coordinates from touch or mouse event
    const coords = getEventCoordinates(event);
    if (!coords) {
      if (this.isDebugMode()) {
        console.warn('[ImageResize] Could not extract coordinates from event');
      }
      return;
    }
    
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
    
    if (this.isDebugMode()) {
      console.log('[ImageResize] Move event', {
        dx,
        dy,
        delta,
        boardScale,
        side: this.stateData.resizeSide,
        threshold: 5
      });
    }
    
    // Only resize if there's significant movement (threshold of 5 pixels)
    if (Math.abs(delta) >= 5) {
      const isGrow = delta > 0;
      
      // Resize the image using generic board method
      // Try window.board first (most reliable), then check appState
      const board = window.board || (this.store.getAppState?.()?.boardInstance);
      
      if (this.isDebugMode()) {
        console.log('[ImageResize] Calling board.resizeBoardItem', {
          board: !!board,
          windowBoard: !!window.board,
          hasResizeMethod: !!(board && board.resizeBoardItem),
          imageId: this.stateData.imageId,
          isGrow,
          side: this.stateData.resizeSide,
          delta
        });
      }
      
      if (!board) {
        console.error('[ImageResize] Board instance not found', {
          windowBoard: !!window.board,
          appState: !!this.store.getAppState?.(),
          appStateBoard: !!this.store.getAppState?.()?.boardInstance
        });
        return;
      }
      
      if (!board.resizeBoardItem) {
        console.error('[ImageResize] board.resizeBoardItem method not found', {
          board: !!board,
          boardMethods: board ? Object.keys(board) : []
        });
        return;
      }
      
      const result = board.resizeBoardItem('image', this.stateData.imageId, { isGrow, side: this.stateData.resizeSide });
      if (this.isDebugMode()) {
        console.log('[ImageResize] resizeBoardItem called successfully', {
          result,
          imageId: this.stateData.imageId,
          params: { isGrow, side: this.stateData.resizeSide }
        });
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
  
  /**
   * Setup window-level event listeners to detect when user loses focus or mouse leaves
   * This prevents stuck states when mouseup/touchend never fires
   */
  setupWindowEventListeners() {
    // Handle window blur (tab loses focus, window minimized, etc.)
    this._windowBlurHandler = () => {
      if (this.currentState !== ImageState.IDLE) {
        if (this.isDebugMode()) {
          console.log('[ImageResize] Window blur detected, forcing transition to IDLE');
        }
        this.transitionTo(ImageState.IDLE, 'window lost focus');
      }
    };
    if (window && typeof window.addEventListener === 'function') {
      window.addEventListener('blur', this._windowBlurHandler);
    }
    
    // Handle mouse leaving the window
    this._mouseLeaveHandler = () => {
      if (this.currentState !== ImageState.IDLE) {
        if (this.isDebugMode()) {
          console.log('[ImageResize] Mouse left window, forcing transition to IDLE');
        }
        this.transitionTo(ImageState.IDLE, 'mouse left window');
      }
    };
    if (document && typeof document.addEventListener === 'function') {
      document.addEventListener('mouseleave', this._mouseLeaveHandler);
    }
  }
  
  cleanup() {
    // Remove window event listeners
    if (this._windowBlurHandler && window && typeof window.removeEventListener === 'function') {
      window.removeEventListener('blur', this._windowBlurHandler);
      this._windowBlurHandler = null;
    }
    if (this._mouseLeaveHandler && document && typeof document.removeEventListener === 'function') {
      document.removeEventListener('mouseleave', this._mouseLeaveHandler);
      this._mouseLeaveHandler = null;
    }
    
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
