import { StateMachine } from "./state-machine-base.js";
import { createStateConfig } from "./state-config-pattern.js";
import { changeZoomLevel } from "./zoom.js";
import { changeColor } from "./color-management.js";
import { moveSelection } from "./movement-utils.js";
import { getAllPlugins } from "../board-items/plugin-registry.js";

/**
 * Centralized Keyboard State Machine
 * 
 * Defines explicit states for keyboard interactions to provide clear context
 * and enable better debugging and state management.
 */
// Generate creation mode states dynamically from plugins
// Note: This runs at module load time, so plugins must be registered statically
const plugins = getAllPlugins();
const pluginCreationStates = {};
plugins.forEach(plugin => {
  const creationFlag = plugin.getCreationModeFlag();
  if (creationFlag) {
    const type = plugin.getType();
    const stateName = `${type.toUpperCase()}_CREATION_MODE`;
    pluginCreationStates[stateName] = `${type}_creation_mode`;
  }
});

const KeyboardState = {
  IDLE: 'idle',
  ...pluginCreationStates,
  CONNECTOR_CREATION_MODE: 'connector_creation_mode',
  EDITING_MODE: 'editing_mode'
};

// Ensure STICKY_CREATION_MODE is always available for backward compatibility
// even if plugins aren't loaded yet (for tests)
if (!KeyboardState.STICKY_CREATION_MODE) {
  KeyboardState.STICKY_CREATION_MODE = 'sticky_creation_mode';
}

/**
 * Keyboard State Machine Implementation
 * Uses the new StateMachine base class for consistent behavior
 */
class KeyboardStateMachine extends StateMachine {
  constructor(board, selectedStickies, selectedConnectors, selectedImages, appState, callbacks) {
    const stateConfig = createStateConfig(KeyboardState);
    
    // Configure each state
    stateConfig[KeyboardState.IDLE] = {
      setup: (stateData, stateMachine) => {
        if (stateMachine.board) {
          stateMachine.clearAllModeFlags();
          stateMachine.setupIdleKeyboardHandlers();
          stateData.activeMode = null;
          stateData.lastAction = null;
        }
      },
      cleanup: (stateData, stateMachine) => {
        // Cleanup any active modes
      }
    };
    
    // Configure plugin creation modes dynamically
    plugins.forEach(plugin => {
      const creationFlag = plugin.getCreationModeFlag();
      if (creationFlag) {
        const type = plugin.getType();
        const stateName = `${type.toUpperCase()}_CREATION_MODE`;
        const stateValue = `${type}_creation_mode`;
        
        stateConfig[stateValue] = {
          setup: (stateData, stateMachine) => {
            if (stateMachine.board) {
              stateMachine.setPluginCreationMode(type, true);
              stateMachine.setupPluginCreationHandlers(type);
              stateData.activeMode = `${type}_creation`;
              stateData.lastAction = `${type} creation mode activated`;
            }
          },
          cleanup: (stateData, stateMachine) => {
            stateMachine.setPluginCreationMode(type, false);
          }
        };
      }
    });
    
    // Backward compatibility: keep STICKY_CREATION_MODE if sticky plugin exists
    const stickyPlugin = plugins.find(p => p.getType() === 'sticky');
    if (stickyPlugin && stickyPlugin.getCreationModeFlag()) {
      stateConfig[KeyboardState.STICKY_CREATION_MODE] = stateConfig['sticky_creation_mode'];
    }
    
    stateConfig[KeyboardState.CONNECTOR_CREATION_MODE] = {
      setup: (stateData, stateMachine) => {
        if (stateMachine.board) {
          stateMachine.setConnectorCreationMode(true);
          stateMachine.setupConnectorCreationHandlers();
          stateData.activeMode = 'connector_creation';
          stateData.lastAction = 'connector creation mode activated';
        }
      },
      cleanup: (stateData, stateMachine) => {
        stateMachine.setConnectorCreationMode(false);
      }
    };
    
    stateConfig[KeyboardState.EDITING_MODE] = {
      setup: (stateData, stateMachine) => {
        if (stateMachine.board) {
          stateMachine.setEditingMode(true);
          stateMachine.setupEditingHandlers();
          stateData.activeMode = 'editing';
          stateData.lastAction = 'editing mode activated';
        }
      },
      cleanup: (stateData, stateMachine) => {
        stateMachine.setEditingMode(false);
      }
    };
    
    super(KeyboardState.IDLE, stateConfig);
    
    // Initialize properties after super constructor
    this.board = board;
    this.selectedStickies = selectedStickies;
    this.selectedConnectors = selectedConnectors;
    this.selectedImages = selectedImages;
    this.appState = appState;
    this.callbacks = callbacks;
    
    // Re-initialize the initial state now that properties are set
    this.initializeState(KeyboardState.IDLE);
    
    this.setupEventListeners();
  }
  
  clearAllModeFlags() {
    if (this.appState && this.appState.ui) {
      // Clear all plugin creation flags
      const plugins = getAllPlugins();
      plugins.forEach(plugin => {
        const creationFlag = plugin.getCreationModeFlag();
        if (creationFlag) {
          this.appState.ui[creationFlag] = false;
        }
      });
      // Clear connector creation flag
      this.appState.ui.nextClickCreatesConnector = false;
      this.appState.ui.connectorOriginId = null;
    }
  }
  
  setPluginCreationMode(pluginType, enabled) {
    if (this.appState && this.appState.ui) {
      const plugins = getAllPlugins();
      const plugin = plugins.find(p => p.getType() === pluginType);
      if (plugin) {
        const creationFlag = plugin.getCreationModeFlag();
        if (creationFlag) {
          // Clear all other creation modes
          this.clearAllModeFlags();
          // Set this plugin's creation mode
          this.appState.ui[creationFlag] = enabled;
        }
      }
    }
  }
  
  setStickyCreationMode(enabled) {
    // Backward compatibility wrapper
    this.setPluginCreationMode('sticky', enabled);
  }
  
  setConnectorCreationMode(enabled) {
    if (this.appState && this.appState.ui) {
      this.appState.ui.nextClickCreatesConnector = enabled;
      this.appState.ui.nextClickCreatesNewSticky = false;
      this.appState.ui.connectorOriginId = null;
    }
  }
  
  setEditingMode(enabled) {
    if (enabled) {
      // Find any plugin element in editing mode
      const plugins = getAllPlugins();
      for (const plugin of plugins) {
        const editingSelector = plugin.getEditingSelector();
        if (editingSelector) {
          const element = document.querySelector(editingSelector);
          if (element && plugin.isEditingElement(element)) {
            this.stateData.editingElement = element;
            return;
          }
        }
      }
      this.stateData.editingElement = null;
    } else {
      this.stateData.editingElement = null;
    }
  }
  
  setupIdleKeyboardHandlers() {
    // No specific setup needed for idle state
  }
  
  setupStickyCreationHandlers() {
    // No specific setup needed for sticky creation state
  }
  
  setupPluginCreationHandlers(pluginType) {
    // No specific setup needed for plugin creation state
    // Can be overridden by specific plugins if needed
  }
  
  setupConnectorCreationHandlers() {
    // No specific setup needed for connector creation state
  }
  
  setupEditingHandlers() {
    // No specific setup needed for editing state
  }
  
  /**
   * Event handling wrapper with debug logging and error handling
   */
  handleKeyboardEvent(eventName, event, handlerFn) {
    if (this.isDebugMode()) {
      console.log(`[KeyboardEvent] ${eventName} in ${this.currentState}`, {
        key: event.key,
        handler: handlerFn.name,
        modifiers: {
          shift: event.shiftKey,
          ctrl: event.ctrlKey,
          alt: event.altKey
        },
        keyboardStateData: { ...this.stateData }
      });
    }
    
    try {
      return handlerFn(event, this.stateData);
    } catch (error) {
      console.error(`[KeyboardError] in ${handlerFn.name}:`, error);
      // Reset to safe state
      this.transitionTo(KeyboardState.IDLE, 'error recovery');
      throw error;
    }
  }
  
  /**
   * Helper function to check if currently editing any plugin item
   */
  isEditingSticky(event) {
    if (event.key === "Backspace") {
      const plugins = getAllPlugins();
      for (const plugin of plugins) {
        const editingSelector = plugin.getEditingSelector();
        if (editingSelector) {
          const element = document.querySelector(editingSelector);
          if (element && plugin.isEditingElement(element)) {
            return true;
          }
        }
      }
    }
    return false;
  }
  
  /**
   * Helper function to move selected items using movement-utils
   */
  moveSelection(dx, dy) {
    moveSelection(dx, dy, this.board, this.selectedStickies, this.selectedImages, this.selectedConnectors);
  }
  
  /**
   * Sub-handler architecture with explicit precedence
   * Each handler has a canHandle method and an onKeyDown method
   */
  getKeyboardHandlers() {
    return {
      // Handler for zoom operations
      zoomHandler: {
        canHandle: (event, state, appState) => {
          return event.key === "o" || event.key === "O";
        },
        
        onKeyDown: (event, keyboardStateData) => {
          const newScale = changeZoomLevel(this.appState.ui.boardScale, event.shiftKey);
          this.appState.ui.boardScale = newScale;
          this.callbacks.onZoomChange();
          
          this.transitionTo(KeyboardState.IDLE, 'zoom changed');
        }
      },
      
      // Handler for new sticky creation (backward compatibility - uses plugin system)
      stickyCreationHandler: {
        canHandle: (event, state, appState) => {
          return event.key === "n" && state === KeyboardState.IDLE;
        },
        
        onKeyDown: (event, keyboardStateData) => {
          const stickyPlugin = plugins.find(p => p.getType() === 'sticky');
          if (stickyPlugin && stickyPlugin.getCreationModeFlag()) {
            this.setPluginCreationMode('sticky', true);
            this.callbacks.onNewStickyRequest();
            const stateValue = 'sticky_creation_mode';
            this.transitionTo(stateValue, 'sticky creation mode activated');
          }
        }
      },
      
      // Handler for connector creation
      connectorCreationHandler: {
        canHandle: (event, state, appState) => {
          return event.key === "c" && state === KeyboardState.IDLE;
        },
        
        onKeyDown: (event, keyboardStateData) => {
          this.appState.ui.nextClickCreatesConnector = true;
          this.appState.ui.nextClickCreatesNewSticky = false;
          this.appState.ui.connectorOriginId = null;
          this.callbacks.onConnectorRequest();
          
          this.transitionTo(KeyboardState.CONNECTOR_CREATION_MODE, 'connector creation mode activated');
        }
      },
      
      // Handler for action cancellation
      cancelHandler: {
        canHandle: (event, state, appState) => {
          if (event.key !== "Escape") return false;
          
          // Check if any plugin creation mode is active
          const plugins = getAllPlugins();
          const hasPluginCreationMode = plugins.some(plugin => {
            const creationFlag = plugin.getCreationModeFlag();
            return creationFlag && this.appState.ui[creationFlag];
          });
          
          return hasPluginCreationMode || this.appState.ui.nextClickCreatesConnector;
        },
        
        onKeyDown: (event, keyboardStateData) => {
          // Clear all creation modes
          this.clearAllModeFlags();
          
          this.callbacks.onCancelAction();
          
          this.transitionTo(KeyboardState.IDLE, 'action cancelled');
        }
      },
      
      // Handler for deletion operations
      deleteHandler: {
        canHandle: (event, state, appState) => {
          return (event.key === "Delete" || event.key === "Backspace") && 
                 !this.isEditingSticky(event);
        },
        
        onKeyDown: (event, keyboardStateData) => {
          this.deleteSelectedItems();
          
          this.transitionTo(KeyboardState.IDLE, 'items deleted');
        }
      },
      
      // Handler for arrow key movement
      movementHandler: {
        canHandle: (event, state, appState) => {
          return event.key.startsWith("Arrow") && 
                 (this.selectedStickies.hasItems() || this.selectedImages.hasItems() || this.selectedConnectors.hasItems());
        },
        
        onKeyDown: (event, keyboardStateData) => {
          event.preventDefault();
          
          const gridUnit = this.board.getGridUnit();
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

          this.moveSelection(dx, dy);
          
          this.transitionTo(KeyboardState.IDLE, 'selection moved');
        }
      }
    };
  }
  
  /**
   * Explicit priority order for keyboard handlers
   * Higher priority handlers are checked first
   */
  getHandlerPriority() {
    return [
      'cancelHandler',           // Highest - Escape always takes precedence
      'deleteHandler',           // High - Delete/Backspace
      'movementHandler',         // High - Arrow keys for movement
      'zoomHandler',             // Mid - Zoom operations
      'stickyCreationHandler',   // Mid - Sticky creation
      'connectorCreationHandler', // Mid - Connector creation
    ];
  }
  
  /**
   * Single entry point with routing logic
   * Routes keyboard events to appropriate handlers based on current state and context
   */
  routeKeyDown(event) {
    // Let browser handle keys inside form fields/contentEditable (e.g., board title)
    const target = event.target;
    if (target) {
      const isInput = target.tagName === 'INPUT' || target.closest('input');
      const isTextarea = target.tagName === 'TEXTAREA' || target.closest('textarea');
      const isEditable = target.isContentEditable || target.closest('[contenteditable="true"]');
      if (isInput || isTextarea || isEditable) {
        return; // Do not route; keep native editing shortcuts
      }
    }

    // Route to appropriate handler based on current state and context
    const handlers = this.getKeyboardHandlers();
    for (const handlerName of this.getHandlerPriority()) {
      const handler = handlers[handlerName];
      if (handler.canHandle && handler.canHandle(event, this.currentState, this.appState)) {
        if (handler.onKeyDown) {
          return this.handleKeyboardEvent('keydown', event, handler.onKeyDown);
        }
      }
    }
    
    // No handler matched - log for debugging
    if (this.isDebugMode()) {
      console.log(`[KeyboardEvent] No handler matched for key: ${event.key}`, {
        state: this.currentState,
        modifiers: {
          shift: event.shiftKey,
          ctrl: event.ctrlKey,
          alt: event.altKey
        }
      });
    }
  }
  
  /**
   * Deletes all selected items (plugins and connectors)
   */
  deleteSelectedItems() {
    const plugins = getAllPlugins();
    
    // Delete plugin items
    plugins.forEach(plugin => {
      const type = plugin.getType();
      const selectionType = plugin.getSelectionType();
      
      // Get selection - try backward compat names first
      let selection = null;
      if (type === 'sticky' && this.selectedStickies) {
        selection = this.selectedStickies;
      } else if (type === 'image' && this.selectedImages) {
        selection = this.selectedImages;
      }
      
      if (selection && selection.hasItems && selection.hasItems()) {
        selection.forEach((id) => {
          this.board.deleteBoardItem(type, id);
        });
      }
    });
    
    // Delete connectors (not a plugin)
    if (this.selectedConnectors && this.selectedConnectors.hasItems && this.selectedConnectors.hasItems()) {
      this.selectedConnectors.forEach((id) => {
        this.board.deleteConnector(id);
      });
    }
  }
  
  setupEventListeners() {
    // Attach the routing handler
    document.body.addEventListener('keydown', this.routeKeyDown.bind(this));
  }
  
  cleanup() {
    document.body.removeEventListener('keydown', this.routeKeyDown.bind(this));
    this.transitionTo(KeyboardState.IDLE, 'cleanup');
  }
  
  /**
   * Get current keyboard state for debugging
   */
  getKeyboardState() {
    return {
      currentState: this.currentState,
      stateData: { ...this.stateData },
      debugMode: this.isDebugMode()
    };
  }
  
  /**
   * Force transition to a specific keyboard state (for testing)
   */
  forceKeyboardStateTransition(newState, reason = 'forced transition') {
    this.transitionTo(newState, reason);
    // Override the lastAction after state setup
    this.stateData.lastAction = reason;
  }
  
  /**
   * Transition keyboard state back to IDLE when sticky/connector creation is completed
   * This is called by the board click handler when a sticky or connector is created
   */
  completeKeyboardAction(reason = 'action completed') {
    this.transitionTo(KeyboardState.IDLE, reason);
  }
}

/**
 * Global keyboard handlers instance
 */
let keyboardStateMachine = null;

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
  // Create keyboard state machine
  keyboardStateMachine = new KeyboardStateMachine(
    board, selectedStickies, selectedConnectors, selectedImages, appState, callbacks
  );
  
  // Return cleanup function
  return () => {
    keyboardStateMachine.cleanup();
    keyboardStateMachine = null;
  };
}

// Export the KeyboardStateMachine class for testing
export { KeyboardStateMachine };

/**
 * Deletes all selected items (stickies, connectors, and images)
 * 
 * @param {Object} board - Board instance
 * @param {Object} selectedStickies - Selection management object for stickies
 * @param {Object} selectedConnectors - Selection management object for connectors
 * @param {Object} selectedImages - Selection management object for images
 */
export function deleteSelectedItems(board, selectedStickies, selectedConnectors, selectedImages) {
  const plugins = getAllPlugins();
  
  // Delete plugin items
  plugins.forEach(plugin => {
    const type = plugin.getType();
    
    // Get selection - try backward compat names first
    let selection = null;
    if (type === 'sticky' && selectedStickies) {
      selection = selectedStickies;
    } else if (type === 'image' && selectedImages) {
      selection = selectedImages;
    }
    
    if (selection && selection.hasItems && selection.hasItems()) {
      selection.forEach((id) => {
        board.deleteBoardItem(type, id);
      });
    }
  });
  
  // Delete connectors (not a plugin)
  if (selectedConnectors && selectedConnectors.hasItems && selectedConnectors.hasItems()) {
    selectedConnectors.forEach((id) => {
      board.deleteConnector(id);
    });
  }
}

/**
 * Get current keyboard state for debugging
 * 
 * @returns {Object} Current keyboard state information
 */
export function getKeyboardState() {
  if (keyboardStateMachine) {
    return keyboardStateMachine.getKeyboardState();
  }
  return {
    currentState: 'not_initialized',
    stateData: {},
    debugMode: false
  };
}

/**
 * Force transition to a specific keyboard state (for testing)
 * 
 * @param {string} newState - The new keyboard state
 * @param {string} reason - Reason for the state transition
 */
export function forceKeyboardStateTransition(newState, reason = 'forced transition') {
  if (keyboardStateMachine) {
    keyboardStateMachine.forceKeyboardStateTransition(newState, reason);
  }
}

/**
 * Transition keyboard state back to IDLE when sticky/connector creation is completed
 * This is called by the board click handler when a sticky or connector is created
 * 
 * @param {string} reason - Reason for the state transition
 */
export function completeKeyboardAction(reason = 'action completed') {
  if (keyboardStateMachine) {
    keyboardStateMachine.completeKeyboardAction(reason);
  }
}
