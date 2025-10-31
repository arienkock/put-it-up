import { StateMachine, GlobalListenerManager } from "../ui/state-machine-base.js";
import { createStateConfig } from "../ui/state-config-pattern.js";
import { fitContentInSticky } from "./text-fitting.js";
import { SelectionManager } from "../ui/selection-manager.js";

/**
 * Sticky Resize State Machine
 * Centralized state management for sticky resize events
 */
const StickyResizeState = {
  IDLE: 'idle',
  RESIZING: 'resizing'
};

const STICKY_SIZE = 70; // pixels per size unit

/**
 * Sticky Resize State Machine Implementation
 * Uses the new StateMachine base class for consistent behavior
 */
class StickyResizeStateMachine extends StateMachine {
  constructor(container, id, updateTextById, getStickyLocation, selectionManager, store) {
    const stateConfig = createStateConfig(StickyResizeState);
    
    // Configure each state
    stateConfig[StickyResizeState.IDLE] = {
      setup: (stateData, stateMachine) => {
        if (stateMachine.globalListeners) {
          stateMachine.clearAllListeners();
          stateMachine.resetCursor();
          stateMachine.resetUserSelect();
        }
      },
      cleanup: (stateData, stateMachine) => {
        if (stateMachine.globalListeners) {
          stateMachine.clearAllListeners();
          stateMachine.resetCursor();
          stateMachine.resetUserSelect();
        }
      }
    };
    
    stateConfig[StickyResizeState.RESIZING] = {
      setup: (stateData, stateMachine) => {
        if (stateMachine.globalListeners) {
          stateMachine.setCursor(stateMachine.getCursorForSide(stateData.side));
          stateMachine.setUserSelect('none');
          stateMachine.setupResizeListeners();
        }
      },
      cleanup: (stateData, stateMachine) => {
        if (stateMachine.globalListeners) {
          stateMachine.clearAllListeners();
          stateMachine.resetCursor();
          stateMachine.resetUserSelect();
        }
      }
    };
    
    
    super(StickyResizeState.IDLE, stateConfig);
    
    // Initialize properties after super constructor
    this.container = container;
    this.id = id;
    this.updateTextById = updateTextById;
    this.getStickyLocation = getStickyLocation;
    this.selectionManager = selectionManager;
    this.store = store;
    
    // Global listener manager
    this.globalListeners = new GlobalListenerManager();
    
    // rAF throttling for resize mousemove
    this._raf = { resizePending: false, lastEvent: null };
    
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
  
  resetUserSelect() {
    document.body.style.userSelect = '';
  }
  
  setUserSelect(userSelect) {
    document.body.style.userSelect = userSelect;
  }
  
  setupResizeListeners() {
    this.globalListeners.setListeners({
      'mousemove': (e) => {
        this._raf.lastEvent = e;
        if (this._raf.resizePending) return;
        this._raf.resizePending = true;
        requestAnimationFrame(() => {
          this._raf.resizePending = false;
          const evt = this._raf.lastEvent;
          if (evt) this.handleResizeMove(evt);
        });
      },
      'mouseup': this.handleResizeEnd.bind(this)
    });
  }
  
  
  /**
   * Returns the appropriate cursor for the given resize side
   */
  getCursorForSide(side) {
    switch (side) {
      case 'top':
      case 'bottom':
        return 'ns-resize';
      case 'left':
      case 'right':
        return 'ew-resize';
      default:
        return 'default';
    }
  }
  
  /**
   * Extract resize side from handle element
   */
  extractResizeSide(handle) {
    if (!handle) return null;
    
    const classList = handle.className;
    if (classList.includes('resize-handle-top')) return 'top';
    if (classList.includes('resize-handle-right')) return 'right';
    if (classList.includes('resize-handle-bottom')) return 'bottom';
    if (classList.includes('resize-handle-left')) return 'left';
    
    return null;
  }
  
  /**
   * Event handling wrapper with debug logging
   */
  handleResizeEvent(eventName, event, handlerFn, ...args) {
    if (this.isDebugMode()) {
      console.log(`[StickyResizeEvent] ${eventName} in ${this.currentState}`, {
        target: event.target?.className || 'unknown',
        handler: handlerFn.name,
        resizeStateData: { ...this.stateData }
      });
    }
    
    try {
      return handlerFn(event, this.stateData, ...args);
    } catch (error) {
      console.error(`[StickyResizeError] in ${handlerFn.name}:`, error);
      // Reset to safe state
      this.transitionTo(StickyResizeState.IDLE, 'error recovery');
      throw error;
    }
  }
  
  /**
   * Sub-handler architecture with explicit precedence
   */
  getStickyResizeHandlers() {
    return {
      // Handler for starting resize operations
      resizeStartHandler: {
        canHandle: (event, state) => {
          const handle = event.target.closest('[class*="resize-handle"]');
          return state === StickyResizeState.IDLE && handle !== null;
        },
        
        onMouseDown: (event, stateData) => {
          const handle = event.target.closest('[class*="resize-handle"]');
          const side = this.extractResizeSide(handle);
          
          event.preventDefault();
          event.stopPropagation();
          
          const sticky = this.store.getSticky(this.id);
          if (!sticky) return;

          const currentSize = {
            x: (sticky.size && sticky.size.x) || 1,
            y: (sticky.size && sticky.size.y) || 1
          };

          const currentLocation = {
            x: sticky.location.x,
            y: sticky.location.y
          };

          stateData.stickyId = this.id;
          stateData.side = side;
          stateData.startX = event.pageX;
          stateData.startY = event.pageY;
          stateData.startSize = { ...currentSize };
          stateData.startLocation = { ...currentLocation };
          stateData.currentSize = { ...currentSize };
          stateData.currentLocation = { ...currentLocation };

          this.transitionTo(StickyResizeState.RESIZING, 'resize started');
        }
      },
      
      // Handler for resize completion
      resizeEndHandler: {
        canHandle: (event, state) => {
          return state === StickyResizeState.RESIZING;
        },
        
        onMouseUp: (event, stateData) => {
          event.preventDefault();
          event.stopPropagation(); // Prevent click events from firing after resize
          
          const finalSize = {
            x: Math.max(1, Math.round(stateData.currentSize.x)),
            y: Math.max(1, Math.round(stateData.currentSize.y))
          };
          
          // Recalculate location for left/top resizing to ensure proper snapping
          let finalLocation = { ...stateData.currentLocation };
          if (stateData.side === 'left') {
            finalLocation.x = stateData.startLocation.x + 
              (stateData.startSize.x - finalSize.x) * STICKY_SIZE;
          }
          if (stateData.side === 'top') {
            finalLocation.y = stateData.startLocation.y + 
              (stateData.startSize.y - finalSize.y) * STICKY_SIZE;
          }
          
          this.store.updateSize(stateData.stickyId, finalSize);
          this.store.setLocation(stateData.stickyId, finalLocation);
          
          this.transitionTo(StickyResizeState.IDLE, 'resize completed');
        }
      },
      
      // Handler for starting drag operations - always returns false to let clicks work
      dragStartHandler: {
        canHandle: (event, state, appState) => {
          // Always return false - we'll handle drag start differently
          return false;
        }
      },
      
    };
  }
  
  /**
   * Single entry point with routing
   */
  routeMouseDown(event) {
    const appState = this.store.getAppState();
    const handlers = this.getStickyResizeHandlers();
    
    // Route to appropriate handler based on current state and context
    const handlerPriority = ['resizeStartHandler', 'dragStartHandler'];
    for (const handlerName of handlerPriority) {
      const handler = handlers[handlerName];
      if (handler.canHandle && handler.canHandle(event, this.currentState, appState)) {
        if (handler.onMouseDown) {
          return this.handleResizeEvent('mousedown', event, handler.onMouseDown);
        }
      }
    }
  }
  
  routeMouseUp(event) {
    const handlers = this.getStickyResizeHandlers();
    
    // Route to appropriate handler based on current state
    const handlerPriority = ['resizeEndHandler'];
    for (const handlerName of handlerPriority) {
      const handler = handlers[handlerName];
      if (handler.canHandle && handler.canHandle(event, this.currentState)) {
        if (handler.onMouseUp) {
          return this.handleResizeEvent('mouseup', event, handler.onMouseUp);
        }
      }
    }
  }
  
  // Mouse move handler for resizing
  handleResizeMove(event) {
    if (this.currentState !== StickyResizeState.RESIZING || !this.stateData.stickyId) return;

    event.preventDefault();
    
    const deltaX = event.pageX - this.stateData.startX;
    const deltaY = event.pageY - this.stateData.startY;
    
    // Calculate new size based on which side is being dragged
    let newSize = { ...this.stateData.startSize };
    let newLocation = { ...this.stateData.startLocation };
    
    switch (this.stateData.side) {
      case 'right':
        newSize.x = Math.max(1, this.stateData.startSize.x + deltaX / STICKY_SIZE);
        break;
      case 'left':
        newSize.x = Math.max(1, this.stateData.startSize.x - deltaX / STICKY_SIZE);
        newLocation.x = this.stateData.startLocation.x + 
          (this.stateData.startSize.x - newSize.x) * STICKY_SIZE;
        break;
      case 'bottom':
        newSize.y = Math.max(1, this.stateData.startSize.y + deltaY / STICKY_SIZE);
        break;
      case 'top':
        newSize.y = Math.max(1, this.stateData.startSize.y - deltaY / STICKY_SIZE);
        newLocation.y = this.stateData.startLocation.y + 
          (this.stateData.startSize.y - newSize.y) * STICKY_SIZE;
        break;
    }

    // Find the container element for this sticky
    const container = document.querySelector(`[data-sticky-id="${this.stateData.stickyId}"]`);
    if (!container) return;

    // Update DOM for live preview
    const widthPx = newSize.x * STICKY_SIZE;
    const heightPx = newSize.y * STICKY_SIZE;
    container.style.width = widthPx + 'px';
    container.style.height = heightPx + 'px';
    
    // Update position for left/top resizing
    if (this.stateData.side === 'left' || this.stateData.side === 'top') {
      const appState = this.store.getAppState();
      if (appState) {
        const origin = appState.board.origin;
        container.style.left = (newLocation.x - origin.x) + 'px';
        container.style.top = (newLocation.y - origin.y) + 'px';
      }
    }

    this.stateData.currentSize = newSize;
    this.stateData.currentLocation = newLocation;
  }
  
  // Mouse up handler for resizing
  handleResizeEnd(event) {
    if (this.currentState !== StickyResizeState.RESIZING) return;
    
    this.routeMouseUp(event);
  }
  
  
  setupEventListeners() {
    // Add data attribute for container identification
    this.container.setAttribute('data-sticky-id', this.id);

    // Get all resize handles
    const handles = {
      top: this.container.querySelector('.resize-handle-top'),
      right: this.container.querySelector('.resize-handle-right'),
      bottom: this.container.querySelector('.resize-handle-bottom'),
      left: this.container.querySelector('.resize-handle-left')
    };

    // Add mousedown event to each handle using new architecture
    Object.entries(handles).forEach(([side, handle]) => {
      if (!handle) return;

      handle.addEventListener('mousedown', (event) => {
        this.routeMouseDown(event);
      });
    });

    // Prevent handle clicks from triggering sticky selection
    Object.values(handles).forEach(handle => {
      if (!handle) return;
      handle.addEventListener('click', (event) => {
        event.stopPropagation();
      });
    });
    
    // Mousedown handler moved to setupStickyEvents function to avoid conflict
    // with onclick handler
  }
  
  cleanup() {
    this.clearAllListeners();
    this.resetCursor();
    this.resetUserSelect();
    this.transitionTo(StickyResizeState.IDLE, 'cleanup');
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
 * Sets up all event handlers for a sticky note
 * 
 * @param {HTMLElement} container - The sticky container element
 * @param {string} id - Sticky ID
 * @param {Function} updateTextById - Function to update sticky text
 * @param {Function} getStickyLocation - Function to get sticky location
 * @param {SelectionManager} selectionManager - Selection manager instance
 * @param {Object} store - Store instance for state access
 * @returns {Object} Object with cleanup functions if needed
 */
export function setupStickyEvents(
  container,
  id,
  updateTextById,
  getStickyLocation,
  selectionManager,
  store
) {
  const appState = store.getAppState();
  
  // Create sticky resize state machine
  const resizeStateMachine = new StickyResizeStateMachine(
    container, id, updateTextById, getStickyLocation, selectionManager, store
  );
  
  // Custom drag is now handled by the state machine
  // No HTML5 drag handlers needed

  // Editable state management
  function setEditable(enabled) {
    if (enabled) {
      container.classList.add("editing");
      container.inputElement.focus();
    } else {
      container.classList.remove("editing");
      container.inputElement.blur();
    }
  }

  // Input element events
  container.inputElement.onblur = () => setEditable(false);
  
  container.inputElement.onfocus = () => {
    setEditable(true);
    moveToFront();
  };
  
  container.inputElement.onkeydown = (event) => {
    // Don't stop propagation for Delete key so it reaches the global handler
    if (event.key !== "Delete") {
      event.stopPropagation();
    }
    if (event.key === "Escape") {
      setEditable(false);
    }
  };
  
  container.inputElement.onkeyup = (event) => {
    event.stopPropagation();
    if (event.keyCode === 13) {
      setEditable(false);
    }
  };
  
  container.inputElement.onclick = (event) => {
    if (event.shiftKey && !container.inputElement.matches(':focus')) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  // Move sticky to front (z-index)
  function moveToFront() {
    [...container.parentNode.children].forEach((el) => {
      if (el === container) {
        el.style.zIndex = "1";
      } else {
        el.style.zIndex = "unset";
      }
    });
  }

  // Input event for text updates
  container.inputElement.addEventListener("input", () => {
    moveToFront();
    container.inputElement.value = updateTextById(
      id,
      container.inputElement.value
    );
    fitContentInSticky(container.sticky, container.inputElement);
  });

  // Track mousedown position for drag detection
  let mouseDownPos = null;
  let mouseMoveListener = null;
  let dragStarted = false;
  
  container.sticky.onmousedown = (event) => {
    // Only track mousedown if not on textarea
    if (event.target !== container.inputElement) {
      mouseDownPos = { x: event.pageX, y: event.pageY };
      dragStarted = false;
      console.log('[STICKY MOUSEDOWN] Tracking mouse position', mouseDownPos);
      
      // Add mousemove listener to detect drag
      mouseMoveListener = (moveEvent) => {
        const movedX = Math.abs(moveEvent.pageX - mouseDownPos.x);
        const movedY = Math.abs(moveEvent.pageY - mouseDownPos.y);
        
        // Only start drag if mouse has moved more than 5 pixels
        if (movedX > 5 || movedY > 5) {
          console.log('[STICKY MOUSEMOVE] Starting drag', { movedX, movedY });
          document.removeEventListener('mousemove', mouseMoveListener);
          
          dragStarted = true; // Mark that we started a drag
          
          // Start the drag
          if (window.dragManager) {
            window.dragManager.startDrag(id, 'sticky', moveEvent);
            moveEvent.preventDefault();
            moveEvent.stopPropagation();
          }
        }
      };
      
      document.addEventListener('mousemove', mouseMoveListener);
    }
  };
  
  // Sticky click event for selection
  container.sticky.onclick = (event) => {
    console.log('[STICKY CLICK] Click event fired', { id, shiftKey: event.shiftKey, target: event.target });
    
    // Clean up mousemove listener if it exists
    if (mouseMoveListener) {
      document.removeEventListener('mousemove', mouseMoveListener);
      mouseMoveListener = null;
    }
    
    // Check if this was actually a drag - only return early if a drag actually started
    if (dragStarted) {
      console.log('[STICKY CLICK] This was a drag, not a click');
      mouseDownPos = null;
      dragStarted = false;
      return;
    }
    
    mouseDownPos = null;
    
    // Ignore click if we just completed a drag
    if (window.dragManager && window.dragManager.justCompletedDrag) {
      console.log('[STICKY CLICK] Ignoring click after drag');
      return;
    }
    
    // Don't handle sticky selection if we're in connector creation mode
    if (appState.ui.nextClickCreatesConnector) {
      return;
    }
    
    moveToFront();
    
    // Use selection manager to handle cross-type selection clearing
    selectionManager.selectItem('stickies', id, {
      addToSelection: event.shiftKey
    });
    
    // DEBUG: Log selection after click
    const appState2 = store.getAppState();
    console.log('[STICKY CLICK] After selectItem', {
      selectedStickies: Object.keys(appState2.ui.selection || {})
    });
    
    // Only exit editing mode if not clicking on the textarea
    if (!event.shiftKey && event.target !== container.inputElement) {
      setEditable(false);
    }
    
    if (window.menuRenderCallback) {
      window.menuRenderCallback();
    }
  };

  // Initial state
  moveToFront();

  return {
    // Cleanup function
    cleanup: () => {
      resizeStateMachine.cleanup();
    },
    
    // Debug functions
    getCurrentState: () => resizeStateMachine.getCurrentState(),
    getStateData: () => resizeStateMachine.getStateData(),
    getActiveListeners: () => resizeStateMachine.getActiveListeners()
  };
}

// Export for testing
export {
  StickyResizeState,
  StickyResizeStateMachine
};
