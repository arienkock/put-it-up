# Connector Events Refactoring Plan

## Problem Statement

The current `connector-events.js` implementation has multiple independent event handlers listening for the same events (mousedown, mouseup) on the same elements. This creates complex interdependencies that are difficult to reason about and debug:

- Multiple `addEventListener` calls for the same event types
- Boolean flags scattered throughout (`isDraggingConnector`, `isClickToClickMode`, `isDraggingHandle`, etc.)
- Handlers competing for events without clear precedence
- Document-level listeners added/removed in multiple places
- Implicit state transitions that are hard to trace

### Specific Issue Found

The handle drag handler was interfering with click-to-click mode because both handlers were listening for mousedown on `.connector-handle`. The handle drag handler would set up its own listeners even when in click-to-click mode, causing the connector to continue following the mouse after "completion".

## Proposed Solution

### 1. Centralized State Machine

Replace scattered boolean flags with an explicit state enum:

```javascript
const ConnectorState = {
  IDLE: 'idle',
  DRAGGING_NEW: 'dragging_new',
  CLICK_TO_CLICK_WAITING: 'click_to_click_waiting',
  DRAGGING_HANDLE: 'dragging_handle',
  DRAGGING_DISCONNECTED: 'dragging_disconnected'
};

let currentState = ConnectorState.IDLE;
let stateData = {
  // All state consolidated in one place
  connectorId: null,
  originData: null,
  dragStartPoint: null,
  handleType: null,
  timeout: null,
  justEntered: false
};
```

**Benefits:**
- Single source of truth for state
- Easy to log and debug state transitions
- Impossible to be in multiple states simultaneously
- State transitions are explicit and trackable

### 2. Single Entry Point with Routing

Instead of multiple independent handlers, use one handler that routes based on state:

```javascript
// Single mousedown handler
boardElement.addEventListener('mousedown', (event) => {
  const appState = store.getAppState();
  
  // Route to appropriate handler based on current state and context
  switch(currentState) {
    case ConnectorState.IDLE:
      return handleIdleMouseDown(event, appState);
    
    case ConnectorState.CLICK_TO_CLICK_WAITING:
      return handleClickToClickMouseDown(event, appState);
    
    case ConnectorState.DRAGGING_NEW:
    case ConnectorState.DRAGGING_HANDLE:
    case ConnectorState.DRAGGING_DISCONNECTED:
      // Already handling something, ignore
      return;
  }
});

// Single mouseup handler
boardElement.addEventListener('mouseup', (event) => {
  switch(currentState) {
    case ConnectorState.DRAGGING_NEW:
      return handleNewConnectorMouseUp(event);
    
    case ConnectorState.CLICK_TO_CLICK_WAITING:
      return handleClickToClickMouseUp(event);
    
    case ConnectorState.DRAGGING_HANDLE:
      return handleHandleDragMouseUp(event);
    
    case ConnectorState.DRAGGING_DISCONNECTED:
      return handleDisconnectedDragMouseUp(event);
    
    default:
      return; // Ignore mouseup in other states
  }
});
```

**Benefits:**
- Clear flow: one event → one router → appropriate handler
- No competition between handlers
- Easy to see what happens in each state
- Prevents accidental handler overlap

### 3. Sub-Handler Architecture

Organize handlers by responsibility with explicit precedence:

```javascript
const connectorHandlers = {
  // Handler for new connector creation
  newConnectorCreation: {
    canHandle: (event, state, appState) => {
      return state === ConnectorState.IDLE && 
             appState.ui.nextClickCreatesConnector;
    },
    
    onMouseDown: (event, stateData) => {
      // Create new connector
      // Transition to DRAGGING_NEW or CLICK_TO_CLICK_WAITING
    },
    
    onMouseMove: (event, stateData) => {
      // Update destination point during drag
    },
    
    onMouseUp: (event, stateData) => {
      // Complete or enter click-to-click mode
    }
  },
  
  // Handler for dragging existing connector handles
  handleDragging: {
    canHandle: (event, state, appState) => {
      const handle = event.target.closest('.connector-handle');
      return state === ConnectorState.IDLE && 
             handle !== null &&
             !appState.ui.nextClickCreatesConnector;
    },
    
    onMouseDown: (event, stateData) => {
      // Start dragging handle
      // Transition to DRAGGING_HANDLE
    },
    
    onMouseMove: (event, stateData) => {
      // Update handle position
    },
    
    onMouseUp: (event, stateData) => {
      // Complete handle drag
      // Transition to IDLE
    }
  },
  
  // Handler for click-to-click completion
  clickToClickCompletion: {
    canHandle: (event, state, appState) => {
      return state === ConnectorState.CLICK_TO_CLICK_WAITING;
    },
    
    onMouseDown: (event, stateData) => {
      // Prevent other handlers from activating
    },
    
    onMouseUp: (event, stateData) => {
      // Complete connector creation
      // Transition to IDLE
    }
  },
  
  // Handler for dragging disconnected connectors
  disconnectedDragging: {
    canHandle: (event, state, appState) => {
      const connector = event.target.closest('.connector-container');
      // Check if connector is disconnected...
      return state === ConnectorState.IDLE && /* ... */;
    },
    
    onMouseDown: (event, stateData) => {
      // Start dragging disconnected connector
      // Transition to DRAGGING_DISCONNECTED
    },
    
    onMouseMove: (event, stateData) => {
      // Move connector
    },
    
    onMouseUp: (event, stateData) => {
      // Complete drag
      // Transition to IDLE
    }
  }
};

// Explicit priority order
const HANDLER_PRIORITY = [
  'clickToClickCompletion',    // Highest - overrides everything
  'handleDragging',             // Mid priority
  'disconnectedDragging',       // Mid priority
  'newConnectorCreation',       // Lowest - only if nothing else matched
];
```

**Benefits:**
- Each handler is self-contained
- Clear responsibilities
- Explicit priority prevents conflicts
- Easy to add new handlers
- Testable in isolation

### 4. Centralized Event Listener Management

Prevent listener overlap with a manager class:

```javascript
class GlobalListenerManager {
  constructor() {
    this.activeListeners = new Map(); // type -> Set of handlers
  }
  
  /**
   * Set listeners for a specific state
   * Automatically removes any existing listeners first
   */
  setListeners(listenerMap) {
    this.clearAll();
    
    Object.entries(listenerMap).forEach(([eventType, handler]) => {
      document.addEventListener(eventType, handler);
      
      if (!this.activeListeners.has(eventType)) {
        this.activeListeners.set(eventType, new Set());
      }
      this.activeListeners.get(eventType).add(handler);
    });
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

const globalListeners = new GlobalListenerManager();

// Usage
function transitionToDragging() {
  currentState = ConnectorState.DRAGGING_NEW;
  globalListeners.setListeners({
    'mousemove': handleConnectorDrag,
    'mouseup': handleConnectorDragEnd
  });
}

function transitionToClickToClick() {
  currentState = ConnectorState.CLICK_TO_CLICK_WAITING;
  globalListeners.setListeners({
    'mousemove': handleClickToClickMove
  });
}

function transitionToIdle() {
  currentState = ConnectorState.IDLE;
  globalListeners.clearAll();
}
```

**Benefits:**
- Impossible to forget to remove listeners
- No listener leaks
- Clear ownership of global listeners
- Easy to debug (can log active listeners)

### 5. Explicit State Transitions with Logging

Make state changes explicit and traceable:

```javascript
const DEBUG_MODE = true; // Toggle for development

function transitionState(newState, reason, data = {}) {
  const oldState = currentState;
  
  if (DEBUG_MODE) {
    console.log(`[State] ${oldState} → ${newState}`, {
      reason,
      data,
      timestamp: Date.now()
    });
  }
  
  // Clean up old state
  switch (oldState) {
    case ConnectorState.DRAGGING_NEW:
      globalListeners.clearAll();
      break;
    case ConnectorState.CLICK_TO_CLICK_WAITING:
      clearTimeout(stateData.timeout);
      globalListeners.clearAll();
      break;
    // ... other cleanup
  }
  
  currentState = newState;
  
  // Set up new state
  switch (newState) {
    case ConnectorState.IDLE:
      stateData = {};
      break;
    case ConnectorState.CLICK_TO_CLICK_WAITING:
      stateData.justEntered = true;
      setTimeout(() => { stateData.justEntered = false; }, 0);
      globalListeners.setListeners({
        'mousemove': handleClickToClickMove
      });
      break;
    // ... other setup
  }
}

// Usage
transitionState(ConnectorState.CLICK_TO_CLICK_WAITING, 'user clicked without dragging', {
  connectorId: currentConnectorId,
  originPoint: dragStartPoint
});
```

**Benefits:**
- Every state change is logged
- Automatic cleanup/setup on transitions
- Easy to trace bugs through logs
- Self-documenting code

### 6. Event Handling with Debug Logging

Wrap event handling for better visibility:

```javascript
function handleEvent(eventName, event, handlerFn) {
  if (DEBUG_MODE) {
    console.log(`[Event] ${eventName} in ${currentState}`, {
      target: event.target.className,
      handler: handlerFn.name,
      stateData: { ...stateData }
    });
  }
  
  try {
    return handlerFn(event, stateData);
  } catch (error) {
    console.error(`[Error] in ${handlerFn.name}:`, error);
    // Reset to safe state
    transitionState(ConnectorState.IDLE, 'error recovery');
    throw error;
  }
}

// Usage in router
boardElement.addEventListener('mousedown', (event) => {
  switch(currentState) {
    case ConnectorState.IDLE:
      return handleEvent('mousedown', event, handleIdleMouseDown);
    case ConnectorState.CLICK_TO_CLICK_WAITING:
      return handleEvent('mousedown', event, handleClickToClickMouseDown);
    // ...
  }
});
```

**Benefits:**
- Complete event trace in console
- Error handling and recovery
- Easy to see which handler is active
- Can be disabled in production

## Implementation Plan

### Phase 1: Preparation (No Breaking Changes)

1. Add state enum constants alongside existing flags
2. Add `transitionState()` function that updates both new state and old flags
3. Add debug logging to existing handlers
4. Ensure all tests pass

### Phase 2: Refactor Handlers

1. Create sub-handler objects for each mode
2. Implement `GlobalListenerManager`
3. Update one handler at a time to use new architecture
4. Test thoroughly after each handler migration

### Phase 3: Replace Entry Points

1. Replace multiple mousedown handlers with single router
2. Replace multiple mouseup handlers with single router
3. Remove old boolean flags
4. Clean up code

### Phase 4: Cleanup

1. Remove debug logging or make it conditional
2. Update documentation
3. Add comments explaining state machine
4. Final testing pass

## Testing Strategy

1. **Unit Tests**: Test each sub-handler in isolation
2. **Integration Tests**: Test state transitions
3. **E2E Tests**: Test complete user workflows:
   - Drag-to-create connector
   - Click-to-click connector creation
   - Dragging connector handles
   - Dragging disconnected connectors
   - Canceling with Escape
   - Timeout cancellation

## Expected Benefits

1. **Easier Debugging**: Complete event/state trace in console
2. **Fewer Bugs**: Impossible states are prevented
3. **Better Maintenance**: Clear structure for adding features
4. **Self-Documenting**: Code structure matches behavior
5. **Testability**: Each handler can be tested independently
6. **Performance**: No wasted event listener registrations

## Migration Path

To avoid breaking existing functionality:

1. Keep old code while building new architecture
2. Add feature flag to switch between old/new
3. Test new architecture thoroughly
4. Gradually remove old code
5. Deploy with monitoring

## References

- Current implementation: `scripts/board-items/connector-events.js`
- State machine pattern: https://en.wikipedia.org/wiki/Finite-state_machine
- Event delegation: https://javascript.info/event-delegation

