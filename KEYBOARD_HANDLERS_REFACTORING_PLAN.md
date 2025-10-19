# Keyboard Handlers Refactoring Plan

## Problem Statement

The current `keyboard-handlers.js` implementation has a single large event handler with multiple responsibilities that could benefit from similar refactoring patterns as the connector-events migration. While not as complex as the connector-events issues, the keyboard handler shows similar patterns that could be improved:

- Single large event handler with multiple responsibilities
- No state management for keyboard shortcut modes
- No handler precedence system
- Complex conditional logic embedded in the main handler
- No centralized error handling
- Difficult to test individual keyboard shortcuts

### Specific Issues Found

1. **Monolithic Handler**: The `keydownHandler` function handles all keyboard shortcuts in one large function
2. **No State Management**: No centralized state for keyboard shortcut modes or contexts
3. **Complex Conditional Logic**: Multiple nested if-else statements make it hard to follow
4. **No Handler Precedence**: All shortcuts are handled in a single function without clear precedence
5. **Difficult Testing**: Individual keyboard shortcuts can't be tested in isolation
6. **No Error Recovery**: If an error occurs, there's no graceful recovery mechanism

## Proposed Solution

### 1. Centralized Keyboard State Machine

Replace the monolithic handler with an explicit state enum for keyboard interactions:

```javascript
const KeyboardState = {
  IDLE: 'idle',
  STICKY_CREATION_MODE: 'sticky_creation_mode',
  CONNECTOR_CREATION_MODE: 'connector_creation_mode',
  EDITING_MODE: 'editing_mode'
};

let currentKeyboardState = KeyboardState.IDLE;
let keyboardStateData = {
  // All keyboard state consolidated in one place
  activeMode: null,
  lastAction: null,
  selectionContext: null,
  editingElement: null
};
```

**Benefits:**
- Single source of truth for keyboard state
- Easy to log and debug keyboard state transitions
- Clear context for keyboard shortcuts
- State transitions are explicit and trackable

### 2. Sub-handler Architecture with Explicit Precedence

Create focused handlers for each keyboard shortcut category:

```javascript
const keyboardHandlers = {
  // Handler for zoom operations
  zoomHandler: {
    canHandle: (event, state, appState) => {
      return event.key === "o" || event.key === "O";
    },
    
    onKeyDown: (event, keyboardStateData) => {
      const newScale = changeZoomLevel(appState.ui.boardScale, event.shiftKey);
      appState.ui.boardScale = newScale;
      callbacks.onZoomChange();
      
      transitionKeyboardState(KeyboardState.IDLE, 'zoom changed');
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
      
      transitionKeyboardState(KeyboardState.STICKY_CREATION_MODE, 'sticky creation mode activated');
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
      
      transitionKeyboardState(KeyboardState.CONNECTOR_CREATION_MODE, 'connector creation mode activated');
    }
  },
  
  // Handler for action cancellation
  cancelHandler: {
    canHandle: (event, state, appState) => {
      return event.key === "Escape" && 
             (appState.ui.nextClickCreatesNewSticky || appState.ui.nextClickCreatesConnector);
    },
    
    onKeyDown: (event, keyboardStateData) => {
      appState.ui.nextClickCreatesNewSticky = false;
      appState.ui.nextClickCreatesConnector = false;
      appState.ui.connectorOriginId = null;
      callbacks.onCancelAction();
      
      transitionKeyboardState(KeyboardState.IDLE, 'action cancelled');
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
      
      transitionKeyboardState(KeyboardState.IDLE, 'items deleted');
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

      moveSelection(dx, dy);
      
      transitionKeyboardState(KeyboardState.IDLE, 'selection moved');
    }
  }
};
```

### 3. Single Entry Point with Routing

Replace the monolithic handler with a single routing function:

```javascript
function routeKeyDown(event) {
  const appState = store.getAppState();
  
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
  if (DEBUG_MODE) {
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
```

### 4. Handler Priority Order

Define explicit precedence for keyboard handlers:

```javascript
// Explicit priority order
const HANDLER_PRIORITY = [
  'cancelHandler',           // Highest - Escape always takes precedence
  'deleteHandler',           // High - Delete/Backspace
  'movementHandler',         // High - Arrow keys for movement
  'zoomHandler',             // Mid - Zoom operations
  'stickyCreationHandler',   // Mid - Sticky creation
  'connectorCreationHandler', // Mid - Connector creation
];
```

### 5. Explicit State Transitions with Logging

Make keyboard state changes explicit and traceable:

```javascript
const DEBUG_MODE = true; // Toggle for development

function transitionKeyboardState(newState, reason, data = {}) {
  const oldState = currentKeyboardState;
  
  if (DEBUG_MODE) {
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
      appState.ui.nextClickCreatesNewSticky = false;
      break;
    case KeyboardState.CONNECTOR_CREATION_MODE:
      // Reset connector creation flags
      appState.ui.nextClickCreatesConnector = false;
      appState.ui.connectorOriginId = null;
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
```

### 6. Event Handling Wrapper with Debug Logging

Add comprehensive logging and error handling:

```javascript
function handleKeyboardEvent(eventName, event, handlerFn) {
  if (DEBUG_MODE) {
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
```

### 7. Helper Functions

Extract helper functions for better organization:

```javascript
// Helper function to check if currently editing a sticky
function isEditingSticky(event) {
  if (event.key === "Backspace") {
    const isEditingSticky = document.querySelector('.sticky-container.editing');
    return isEditingSticky !== null;
  }
  return false;
}

// Helper function to move selected items
function moveSelection(dx, dy) {
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
```

### 8. Integration with Existing System

The refactored keyboard handler integrates cleanly with the existing system:

```javascript
export function setupKeyboardHandlers(
  board,
  selectedStickies,
  selectedConnectors,
  selectedImages,
  appState,
  callbacks
) {
  // Initialize keyboard state
  transitionKeyboardState(KeyboardState.IDLE, 'initialization');
  
  // Attach the new routing handler
  document.body.addEventListener('keydown', routeKeyDown);

  // Return cleanup function
  return () => {
    document.body.removeEventListener('keydown', routeKeyDown);
    transitionKeyboardState(KeyboardState.IDLE, 'cleanup');
  };
}
```

## State Machine Flow

```
IDLE
  ↓ (press 'n')
STICKY_CREATION_MODE
  ↓ (press Escape or click)
IDLE

IDLE
  ↓ (press 'c')
CONNECTOR_CREATION_MODE
  ↓ (press Escape or click)
IDLE

IDLE
  ↓ (start editing sticky)
EDITING_MODE
  ↓ (finish editing)
IDLE
```

## Handler Priority Order

1. **cancelHandler** - Highest priority, Escape always takes precedence
2. **deleteHandler** - High priority, Delete/Backspace operations
3. **movementHandler** - High priority, Arrow key movement
4. **zoomHandler** - Mid priority, Zoom operations
5. **stickyCreationHandler** - Mid priority, Sticky creation
6. **connectorCreationHandler** - Mid priority, Connector creation

## Error Recovery

- All errors are caught and logged
- Keyboard state is automatically reset to `IDLE`
- No partial state corruption possible
- Debug information is preserved for troubleshooting

## Testing Strategy

Create comprehensive tests covering:

- ✅ Individual keyboard shortcut handlers
- ✅ Handler precedence and routing
- ✅ State machine transitions
- ✅ Error handling and edge cases
- ✅ Integration with existing system
- ✅ Cleanup and memory management
- ✅ Debug logging functionality

## Migration Strategy

### Phase 1: Analysis and Testing
1. Create comprehensive test suite for current keyboard functionality
2. Document all current keyboard shortcuts and their behaviors
3. Identify all keyboard state variables and their purposes

### Phase 2: Implementation
1. Implement centralized keyboard state machine
2. Create sub-handler architecture
3. Add comprehensive debug logging
4. Implement error handling and recovery
5. Add handler precedence system

### Phase 3: Migration
1. Replace old keyboard handler with new one
2. Run comprehensive tests to ensure functionality is preserved
3. Test manually in browser to verify keyboard shortcuts work
4. Update any documentation that references the old keyboard handler

## Benefits Achieved

1. **Easier Debugging** - Complete keyboard event/state trace in console
2. **Fewer Bugs** - Impossible keyboard states are prevented
3. **Better Maintenance** - Clear structure for adding keyboard shortcuts
4. **Self-Documenting** - Code structure matches keyboard behavior
5. **Testability** - Each keyboard shortcut can be tested independently
6. **Performance** - No wasted event processing
7. **Error Recovery** - Automatic state reset on keyboard errors
8. **Clean Architecture** - Separation of concerns with clear responsibilities

## Files to Modify

- **`scripts/ui/keyboard-handlers.js`** - Complete refactoring with new architecture
- **`test/keyboard-handlers.spec.js`** - Comprehensive test suite
- **`test/keyboard-handlers-refactored.spec.js`** - Architecture validation tests
- **`KEYBOARD_HANDLERS_REFACTORING_PLAN.md`** - Migration documentation
- **`KEYBOARD_HANDLERS_REFACTORING_COMPLETE.md`** - Completion documentation

## Next Steps

1. Create comprehensive test suite for current keyboard functionality
2. Implement the new keyboard state machine architecture
3. Create sub-handler architecture with explicit precedence
4. Add comprehensive debug logging and error handling
5. Run full test suite to ensure functionality is preserved
6. Test manually in browser to verify keyboard shortcuts work
7. Update documentation

The keyboard handler system will become much more robust and maintainable with this refactoring! 🎉
