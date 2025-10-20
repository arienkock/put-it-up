import { fitContentInSticky } from "./text-fitting.js";
import { STICKY_TYPE } from "./sticky.js";
import { SelectionManager } from "../ui/selection-manager.js";

// ============================================================================
// STICKY RESIZE STATE MACHINE
// ============================================================================

const StickyResizeState = {
  IDLE: 'idle',
  RESIZING: 'resizing'
};

let currentResizeState = StickyResizeState.IDLE;
let resizeStateData = {
  stickyId: null,
  side: null,
  startX: null,
  startY: null,
  startSize: null,
  startLocation: null,
  currentSize: null,
  currentLocation: null
};

// ============================================================================
// STICKY RESIZE LISTENER MANAGER
// ============================================================================

class StickyResizeListenerManager {
  constructor() {
    this.activeListeners = new Map(); // type -> Set of handlers
  }
  
  /**
   * Set listeners for resize operations
   * Automatically removes any existing listeners first
   */
  setResizeListeners(moveHandler, upHandler) {
    this.clearAll();
    
    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
    
    this.activeListeners.set('mousemove', new Set([moveHandler]));
    this.activeListeners.set('mouseup', new Set([upHandler]));
  }
  
  clearAll() {
    this.activeListeners.forEach((handlers, eventType) => {
      handlers.forEach(handler => {
        document.removeEventListener(eventType, handler);
      });
    });
    this.activeListeners.clear();
  }
  
  // Debug: log active listeners
  getActiveListeners() {
    const result = {};
    this.activeListeners.forEach((handlers, eventType) => {
      result[eventType] = handlers.size;
    });
    return result;
  }
}

const resizeListeners = new StickyResizeListenerManager();

// Global store reference for resize operations
let currentStore = null;

// ============================================================================
// CENTRALIZED RESIZE EVENT HANDLERS (DEFINED EARLY FOR REFERENCE)
// ============================================================================

function handleResizeMove(event) {
  if (currentResizeState !== StickyResizeState.RESIZING || !resizeStateData.stickyId) return;

  event.preventDefault();
  
  const deltaX = event.pageX - resizeStateData.startX;
  const deltaY = event.pageY - resizeStateData.startY;
  
  // Calculate new size based on which side is being dragged
  let newSize = { ...resizeStateData.startSize };
  let newLocation = { ...resizeStateData.startLocation };
  
  switch (resizeStateData.side) {
    case 'right':
      newSize.x = Math.max(1, resizeStateData.startSize.x + deltaX / STICKY_SIZE);
      break;
    case 'left':
      newSize.x = Math.max(1, resizeStateData.startSize.x - deltaX / STICKY_SIZE);
      newLocation.x = resizeStateData.startLocation.x + 
        (resizeStateData.startSize.x - newSize.x) * STICKY_SIZE;
      break;
    case 'bottom':
      newSize.y = Math.max(1, resizeStateData.startSize.y + deltaY / STICKY_SIZE);
      break;
    case 'top':
      newSize.y = Math.max(1, resizeStateData.startSize.y - deltaY / STICKY_SIZE);
      newLocation.y = resizeStateData.startLocation.y + 
        (resizeStateData.startSize.y - newSize.y) * STICKY_SIZE;
      break;
  }

  // Find the container element for this sticky
  const container = document.querySelector(`[data-sticky-id="${resizeStateData.stickyId}"]`);
  if (!container) return;

  // Update DOM for live preview
  const widthPx = newSize.x * STICKY_SIZE;
  const heightPx = newSize.y * STICKY_SIZE;
  container.style.width = widthPx + 'px';
  container.style.height = heightPx + 'px';
  
  // Update position for left/top resizing
  if (resizeStateData.side === 'left' || resizeStateData.side === 'top') {
    // We need to get the store reference - this will be handled by the setup function
    const appState = currentStore?.getAppState();
    if (appState) {
      const origin = appState.board.origin;
      container.style.left = (newLocation.x - origin.x) + 'px';
      container.style.top = (newLocation.y - origin.y) + 'px';
    }
  }

  resizeStateData.currentSize = newSize;
  resizeStateData.currentLocation = newLocation;
}

function handleResizeEnd(event) {
  if (currentResizeState !== StickyResizeState.RESIZING) return;
  
  const handler = stickyResizeHandlers.resizeEndHandler;
  if (handler.onMouseUp) {
    return handleResizeEvent('mouseup', event, handler.onMouseUp);
  }
}

// ============================================================================
// RESIZE STATE TRANSITIONS WITH LOGGING
// ============================================================================

// Debug mode - controlled by global window.DEBUG_MODE
// Use a function to check DEBUG_MODE dynamically
const isDebugMode = () => window.DEBUG_MODE || false;

function transitionResizeState(newState, reason, data = {}) {
  const oldState = currentResizeState;
  
  if (isDebugMode()) {
    console.log(`[StickyResizeState] ${oldState} → ${newState}`, {
      reason,
      data,
      timestamp: Date.now()
    });
  }
  
  // Clean up old state
  switch (oldState) {
    case StickyResizeState.RESIZING:
      resizeListeners.clearAll();
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      break;
  }
  
  currentResizeState = newState;
  
  // Set up new state
  switch (newState) {
    case StickyResizeState.IDLE:
      resizeStateData = {
        stickyId: null,
        side: null,
        startX: null,
        startY: null,
        startSize: null,
        startLocation: null,
        currentSize: null,
        currentLocation: null
      };
      break;
    case StickyResizeState.RESIZING:
      document.body.style.cursor = getCursorForSide(resizeStateData.side);
      document.body.style.userSelect = 'none';
      resizeListeners.setResizeListeners(handleResizeMove, handleResizeEnd);
      break;
  }
}

// ============================================================================
// RESIZE EVENT HANDLING WRAPPER WITH DEBUG LOGGING
// ============================================================================

function handleResizeEvent(eventName, event, handlerFn, ...args) {
  if (isDebugMode()) {
    console.log(`[StickyResizeEvent] ${eventName} in ${currentResizeState}`, {
      target: event.target?.className || 'unknown',
      handler: handlerFn.name,
      resizeStateData: { ...resizeStateData }
    });
  }
  
  try {
    return handlerFn(event, resizeStateData, ...args);
  } catch (error) {
    console.error(`[StickyResizeError] in ${handlerFn.name}:`, error);
    // Reset to safe state
    transitionResizeState(StickyResizeState.IDLE, 'error recovery');
    throw error;
  }
}

// ============================================================================
// RESIZE HANDLER ARCHITECTURE
// ============================================================================

const stickyResizeHandlers = {
  // Handler for starting resize operations
  resizeStartHandler: {
    canHandle: (event, state) => {
      const handle = event.target.closest('[class*="resize-handle"]');
      return state === StickyResizeState.IDLE && handle !== null;
    },
    
    onMouseDown: (event, resizeStateData, stickyId, store) => {
      const handle = event.target.closest('[class*="resize-handle"]');
      const side = extractResizeSide(handle);
      
      event.preventDefault();
      event.stopPropagation();
      
      const sticky = store.getSticky(stickyId);
      if (!sticky) return;

      const currentSize = {
        x: (sticky.size && sticky.size.x) || 1,
        y: (sticky.size && sticky.size.y) || 1
      };

      const currentLocation = {
        x: sticky.location.x,
        y: sticky.location.y
      };

      resizeStateData.stickyId = stickyId;
      resizeStateData.side = side;
      resizeStateData.startX = event.pageX;
      resizeStateData.startY = event.pageY;
      resizeStateData.startSize = { ...currentSize };
      resizeStateData.startLocation = { ...currentLocation };
      resizeStateData.currentSize = { ...currentSize };
      resizeStateData.currentLocation = { ...currentLocation };

      transitionResizeState(StickyResizeState.RESIZING, 'resize started');
    }
  },
  
  // Handler for resize completion
  resizeEndHandler: {
    canHandle: (event, state) => {
      return state === StickyResizeState.RESIZING;
    },
    
    onMouseUp: (event, resizeStateData) => {
      event.preventDefault();
      
      const finalSize = {
        x: Math.max(1, Math.round(resizeStateData.currentSize.x)),
        y: Math.max(1, Math.round(resizeStateData.currentSize.y))
      };
      
      // Recalculate location for left/top resizing to ensure proper snapping
      let finalLocation = { ...resizeStateData.currentLocation };
      if (resizeStateData.side === 'left') {
        finalLocation.x = resizeStateData.startLocation.x + 
          (resizeStateData.startSize.x - finalSize.x) * STICKY_SIZE;
      }
      if (resizeStateData.side === 'top') {
        finalLocation.y = resizeStateData.startLocation.y + 
          (resizeStateData.startSize.y - finalSize.y) * STICKY_SIZE;
      }
      
      if (currentStore) {
        currentStore.updateSize(resizeStateData.stickyId, finalSize);
        currentStore.setLocation(resizeStateData.stickyId, finalLocation);
      }
      
      transitionResizeState(StickyResizeState.IDLE, 'resize completed');
    }
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function extractResizeSide(handle) {
  if (!handle) return null;
  
  const classList = handle.className;
  if (classList.includes('resize-handle-top')) return 'top';
  if (classList.includes('resize-handle-right')) return 'right';
  if (classList.includes('resize-handle-bottom')) return 'bottom';
  if (classList.includes('resize-handle-left')) return 'left';
  
  return null;
}

const STICKY_SIZE = 70; // pixels per size unit

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
  // Drag start event
  container.ondragstart = (event) => {
    // Don't start sticky drag if we're in connector creation mode
    if (appState.ui.nextClickCreatesConnector) {
      event.preventDefault();
      return;
    }
    
    const { pageX: x, pageY: y } = event;
    let originalLocations = {};
    
    const selectedStickies = selectionManager.getSelection('stickies');
    if (selectedStickies && selectedStickies.isSelected(id)) {
      selectedStickies.forEach((sid) => {
        originalLocations[sid] = getStickyLocation(sid);
      });
    } else {
      originalLocations[id] = getStickyLocation(id);
    }
    
    event.dataTransfer.setData(
      STICKY_TYPE,
      JSON.stringify({ originalLocations, dragStart: { x, y } })
    );
    moveToFront();
  };

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
    if (event.shiftKey) {
      event.preventDefault();
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

  // Sticky click event for selection
  container.sticky.onclick = (event) => {
    // Don't handle sticky selection if we're in connector creation mode
    if (appState.ui.nextClickCreatesConnector) {
      return;
    }
    
    moveToFront();
    
    // Use selection manager to handle cross-type selection clearing
    selectionManager.selectItem('stickies', id, {
      addToSelection: event.shiftKey
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

  // Setup resize handle events with new architecture
  setupResizeHandlesRefactored(container, id, store);

  return {
    // Could add cleanup functions here if needed
    cleanup: () => {
      // Clean up resize state if needed
      if (currentResizeState !== StickyResizeState.IDLE) {
        transitionResizeState(StickyResizeState.IDLE, 'cleanup');
      }
    }
  };
}

/**
 * Sets up resize handle event handlers for a sticky using the new refactored architecture
 * 
 * @param {HTMLElement} container - The sticky container element
 * @param {string} id - Sticky ID
 * @param {Object} store - Store instance for state access
 */
function setupResizeHandlesRefactored(container, id, store) {
  // Set global store reference for resize operations
  currentStore = store;
  
  // Add data attribute for container identification
  container.setAttribute('data-sticky-id', id);

  // Get all resize handles
  const handles = {
    top: container.querySelector('.resize-handle-top'),
    right: container.querySelector('.resize-handle-right'),
    bottom: container.querySelector('.resize-handle-bottom'),
    left: container.querySelector('.resize-handle-left')
  };

  // Add mousedown event to each handle using new architecture
  Object.entries(handles).forEach(([side, handle]) => {
    if (!handle) return;

    handle.addEventListener('mousedown', (event) => {
      const handler = stickyResizeHandlers.resizeStartHandler;
      if (handler.canHandle && handler.canHandle(event, currentResizeState)) {
        if (handler.onMouseDown) {
          return handleResizeEvent('mousedown', event, handler.onMouseDown, id, store);
        }
      }
    });
  });

  // Prevent handle clicks from triggering sticky selection
  Object.values(handles).forEach(handle => {
    if (!handle) return;
    handle.addEventListener('click', (event) => {
      event.stopPropagation();
    });
  });
}

/**
 * Returns the appropriate cursor for the given resize side
 * @param {string} side - The resize side ('top', 'right', 'bottom', 'left')
 * @returns {string} CSS cursor value
 */
function getCursorForSide(side) {
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
