import { changeZoomLevel } from "./zoom.js";
import { changeColor } from "./color-management.js";

/**
 * Centralized Keyboard State Machine
 * 
 * Defines explicit states for keyboard interactions to provide clear context
 * and enable better debugging and state management.
 */
const KeyboardState = {
  IDLE: 'idle',
  STICKY_CREATION_MODE: 'sticky_creation_mode',
  CONNECTOR_CREATION_MODE: 'connector_creation_mode',
  EDITING_MODE: 'editing_mode'
};

/**
 * Global keyboard state management
 */
let currentKeyboardState = KeyboardState.IDLE;
let keyboardStateData = {
  activeMode: null,
  lastAction: null,
  selectionContext: null,
  editingElement: null
};

/**
 * Debug mode for development - controlled by global window.DEBUG_MODE
 * Use a function to check DEBUG_MODE dynamically
 */
const isDebugMode = () => window.DEBUG_MODE || false;

/**
 * Explicit priority order for keyboard handlers
 * Higher priority handlers are checked first
 */
const HANDLER_PRIORITY = [
  'cancelHandler',           // Highest - Escape always takes precedence
  'deleteHandler',           // High - Delete/Backspace
  'movementHandler',         // High - Arrow keys for movement
  'zoomHandler',             // Mid - Zoom operations
  'stickyCreationHandler',   // Mid - Sticky creation
  'connectorCreationHandler', // Mid - Connector creation
];

/**
 * Transition keyboard state with logging and cleanup
 * 
 * @param {string} newState - The new keyboard state
 * @param {string} reason - Reason for the state transition
 * @param {Object} data - Additional data for the transition
 * @param {Object} appState - Application state object (optional, falls back to window.appState)
 */
function transitionKeyboardState(newState, reason, data = {}, appState = null) {
  const oldState = currentKeyboardState;
  const targetAppState = appState || window.appState || mockAppState;
  
  if (isDebugMode()) {
    console.log(`[KeyboardState] ${oldState} → ${newState}`, {
      reason,
      data,
      timestamp: Date.now()
    });
  }
  
  // Clean up old state
  switch (oldState) {
    case KeyboardState.STICKY_CREATION_MODE:
      // Reset sticky creation flags
      if (targetAppState && targetAppState.ui) {
        targetAppState.ui.nextClickCreatesNewSticky = false;
      }
      break;
    case KeyboardState.CONNECTOR_CREATION_MODE:
      // Reset connector creation flags
      if (targetAppState && targetAppState.ui) {
        targetAppState.ui.nextClickCreatesConnector = false;
        targetAppState.ui.connectorOriginId = null;
      }
      break;
    case KeyboardState.EDITING_MODE:
      // Reset editing state
      keyboardStateData.editingElement = null;
      break;
  }
  
  currentKeyboardState = newState;
  
  // Set up new state
  switch (newState) {
    case KeyboardState.IDLE:
      keyboardStateData = {
        activeMode: null,
        lastAction: reason,
        selectionContext: null,
        editingElement: null
      };
      break;
    case KeyboardState.STICKY_CREATION_MODE:
      keyboardStateData.activeMode = 'sticky_creation';
      keyboardStateData.lastAction = reason;
      break;
    case KeyboardState.CONNECTOR_CREATION_MODE:
      keyboardStateData.activeMode = 'connector_creation';
      keyboardStateData.lastAction = reason;
      break;
    case KeyboardState.EDITING_MODE:
      keyboardStateData.activeMode = 'editing';
      keyboardStateData.editingElement = document.querySelector('.sticky-container.editing');
      break;
  }
}

/**
 * Event handling wrapper with debug logging and error handling
 * 
 * @param {string} eventName - Name of the event being handled
 * @param {Event} event - The keyboard event
 * @param {Function} handlerFn - The handler function to execute
 * @returns {*} Result of the handler function
 */
function handleKeyboardEvent(eventName, event, handlerFn) {
  if (isDebugMode()) {
    console.log(`[KeyboardEvent] ${eventName} in ${currentKeyboardState}`, {
      key: event.key,
      handler: handlerFn.name,
      modifiers: {
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        alt: event.altKey
      },
      keyboardStateData: { ...keyboardStateData }
    });
  }
  
  try {
    return handlerFn(event, keyboardStateData);
  } catch (error) {
    console.error(`[KeyboardError] in ${handlerFn.name}:`, error);
    // Reset to safe state
    transitionKeyboardState(KeyboardState.IDLE, 'error recovery');
    throw error;
  }
}

/**
 * Helper function to check if currently editing a sticky
 * 
 * @param {Event} event - The keyboard event
 * @returns {boolean} True if editing a sticky
 */
function isEditingSticky(event) {
  if (event.key === "Backspace") {
    const isEditingSticky = document.querySelector('.sticky-container.editing');
    return isEditingSticky !== null;
  }
  return false;
}

/**
 * Helper function to move selected items
 * 
 * @param {number} dx - Delta X movement
 * @param {number} dy - Delta Y movement
 * @param {Object} board - Board instance
 * @param {Object} selectedStickies - Selection management object for stickies
 * @param {Object} selectedImages - Selection management object for images
 * @param {Object} selectedConnectors - Selection management object for connectors
 */
function moveSelection(dx, dy, board, selectedStickies, selectedImages, selectedConnectors) {
  selectedStickies.forEach((sid) => {
    const originalLocation = board.getStickyLocation(sid);
    const newLocation = {
      x: originalLocation.x + dx,
      y: originalLocation.y + dy,
    };
    board.moveSticky(sid, newLocation);
  });
  
  selectedImages.forEach((iid) => {
    const originalLocation = board.getImageLocation(iid);
    const newLocation = {
      x: originalLocation.x + dx,
      y: originalLocation.y + dy,
    };
    board.moveImage(iid, newLocation);
  });
  
  selectedConnectors.forEach((cid) => {
    board.moveConnector(cid, dx, dy);
  });
}

/**
 * Sub-handler architecture with explicit precedence
 * Each handler has a canHandle method and an onKeyDown method
 */
function createKeyboardHandlers(board, selectedStickies, selectedConnectors, selectedImages, appState, callbacks) {
  return {
    // Handler for zoom operations
    zoomHandler: {
      canHandle: (event, state, appState) => {
        return event.key === "o" || event.key === "O";
      },
      
      onKeyDown: (event, keyboardStateData) => {
        const newScale = changeZoomLevel(appState.ui.boardScale, event.shiftKey);
        appState.ui.boardScale = newScale;
        callbacks.onZoomChange();
        
        transitionKeyboardState(KeyboardState.IDLE, 'zoom changed', {}, appState);
      }
    },
    
    // Handler for new sticky creation
    stickyCreationHandler: {
      canHandle: (event, state, appState) => {
        return event.key === "n" && state === KeyboardState.IDLE;
      },
      
      onKeyDown: (event, keyboardStateData) => {
        appState.ui.nextClickCreatesNewSticky = true;
        appState.ui.nextClickCreatesConnector = false;
        appState.ui.connectorOriginId = null;
        callbacks.onNewStickyRequest();
        
        transitionKeyboardState(KeyboardState.STICKY_CREATION_MODE, 'sticky creation mode activated', {}, appState);
      }
    },
    
    // Handler for connector creation
    connectorCreationHandler: {
      canHandle: (event, state, appState) => {
        return event.key === "c" && state === KeyboardState.IDLE;
      },
      
      onKeyDown: (event, keyboardStateData) => {
        appState.ui.nextClickCreatesConnector = true;
        appState.ui.nextClickCreatesNewSticky = false;
        appState.ui.connectorOriginId = null;
        callbacks.onConnectorRequest();
        
        transitionKeyboardState(KeyboardState.CONNECTOR_CREATION_MODE, 'connector creation mode activated', {}, appState);
      }
    },
    
    // Handler for action cancellation
    cancelHandler: {
      canHandle: (event, state, appState) => {
        return event.key === "Escape" && 
               (appState.ui.nextClickCreatesNewSticky || appState.ui.nextClickCreatesConnector);
      },
      
      onKeyDown: (event, keyboardStateData) => {
        // Update appState before calling callback
        appState.ui.nextClickCreatesNewSticky = false;
        appState.ui.nextClickCreatesConnector = false;
        appState.ui.connectorOriginId = null;
        
        callbacks.onCancelAction();
        
        transitionKeyboardState(KeyboardState.IDLE, 'action cancelled', {}, appState);
      }
    },
    
    // Handler for deletion operations
    deleteHandler: {
      canHandle: (event, state, appState) => {
        return (event.key === "Delete" || event.key === "Backspace") && 
               !isEditingSticky(event);
      },
      
      onKeyDown: (event, keyboardStateData) => {
        deleteSelectedItems(board, selectedStickies, selectedConnectors, selectedImages);
        
        transitionKeyboardState(KeyboardState.IDLE, 'items deleted', {}, appState);
      }
    },
    
    // Handler for arrow key movement
    movementHandler: {
      canHandle: (event, state, appState) => {
        return event.key.startsWith("Arrow") && 
               (selectedStickies.hasItems() || selectedImages.hasItems() || selectedConnectors.hasItems());
      },
      
      onKeyDown: (event, keyboardStateData) => {
        event.preventDefault();
        
        const gridUnit = board.getGridUnit();
        let dx = 0;
        let dy = 0;

        switch (event.key) {
          case "ArrowUp":
            dy = -gridUnit;
            break;
          case "ArrowDown":
            dy = gridUnit;
            break;
          case "ArrowLeft":
            dx = -gridUnit;
            break;
          case "ArrowRight":
            dx = gridUnit;
            break;
        }

        moveSelection(dx, dy, board, selectedStickies, selectedImages, selectedConnectors);
        
        transitionKeyboardState(KeyboardState.IDLE, 'selection moved', {}, appState);
      }
    }
  };
}

/**
 * Single entry point with routing logic
 * Routes keyboard events to appropriate handlers based on current state and context
 * 
 * @param {Event} event - The keyboard event
 */
function routeKeyDown(event) {
  const appState = globalAppState || window.appState || mockAppState;
  
  // Route to appropriate handler based on current state and context
  for (const handlerName of HANDLER_PRIORITY) {
    const handler = keyboardHandlers[handlerName];
    if (handler.canHandle && handler.canHandle(event, currentKeyboardState, appState)) {
      if (handler.onKeyDown) {
        return handleKeyboardEvent('keydown', event, handler.onKeyDown);
      }
    }
  }
  
  // No handler matched - log for debugging
  if (isDebugMode()) {
    console.log(`[KeyboardEvent] No handler matched for key: ${event.key}`, {
      state: currentKeyboardState,
      modifiers: {
        shift: event.shiftKey,
        ctrl: event.ctrlKey,
        alt: event.altKey
      }
    });
  }
}

/**
 * Global keyboard handlers instance
 */
let keyboardHandlers = null;

/**
 * Global app state reference for handlers
 */
let globalAppState = null;

/**
 * Deletes all selected items (stickies, connectors, and images)
 * 
 * @param {Object} board - Board instance
 * @param {Object} selectedStickies - Selection management object for stickies
 * @param {Object} selectedConnectors - Selection management object for connectors
 * @param {Object} selectedImages - Selection management object for images
 */
export function deleteSelectedItems(board, selectedStickies, selectedConnectors, selectedImages) {
  selectedStickies.forEach((id) => {
    board.deleteSticky(id);
  });
  selectedConnectors.forEach((id) => {
    board.deleteConnector(id);
  });
  selectedImages.forEach((id) => {
    board.deleteImage(id);
  });
}

/**
 * Sets up global keyboard event handlers for board interactions
 * 
 * @param {Object} board - Board instance
 * @param {Object} selectedStickies - Selection management object
 * @param {Object} selectedConnectors - Selection management object for connectors
 * @param {Object} selectedImages - Selection management object for images
 * @param {Object} appState - Application state object
 * @param {Object} callbacks - Callback functions for various actions
 * @param {Function} callbacks.onZoomChange - Called when zoom changes
 * @param {Function} callbacks.onColorChange - Called when color changes
 * @param {Function} callbacks.onNewStickyRequest - Called when user requests new sticky
 * @param {Function} callbacks.onConnectorRequest - Called when user requests new connector
 * @param {Function} callbacks.onCancelAction - Called when user cancels action
 * @returns {Function} Cleanup function to remove event handlers
 */
export function setupKeyboardHandlers(
  board,
  selectedStickies,
  selectedConnectors,
  selectedImages,
  appState,
  callbacks
) {
  // Store global app state reference
  globalAppState = appState;
  
  // Initialize keyboard state
  transitionKeyboardState(KeyboardState.IDLE, 'initialization', {}, appState);
  
  // Create keyboard handlers
  keyboardHandlers = createKeyboardHandlers(
    board, selectedStickies, selectedConnectors, selectedImages, appState, callbacks
  );
  
  // Attach the new routing handler
  document.body.addEventListener('keydown', routeKeyDown);

  // Return cleanup function
  return () => {
    document.body.removeEventListener('keydown', routeKeyDown);
    transitionKeyboardState(KeyboardState.IDLE, 'cleanup', {}, appState);
    globalAppState = null;
  };
}

/**
 * Get current keyboard state for debugging
 * 
 * @returns {Object} Current keyboard state information
 */
export function getKeyboardState() {
  return {
    currentState: currentKeyboardState,
    stateData: { ...keyboardStateData },
    debugMode: isDebugMode()
  };
}

/**
 * Force transition to a specific keyboard state (for testing)
 * 
 * @param {string} newState - The new keyboard state
 * @param {string} reason - Reason for the state transition
 * @param {Object} appState - Application state object (optional)
 */
export function forceKeyboardStateTransition(newState, reason = 'forced transition', appState = null) {
  transitionKeyboardState(newState, reason, {}, appState);
}

/**
 * Transition keyboard state back to IDLE when sticky/connector creation is completed
 * This is called by the board click handler when a sticky or connector is created
 * 
 * @param {string} reason - Reason for the state transition
 * @param {Object} appState - Application state object (optional)
 */
export function completeKeyboardAction(reason = 'action completed', appState = null) {
  transitionKeyboardState(KeyboardState.IDLE, reason, {}, appState);
}