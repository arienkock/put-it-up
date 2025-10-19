# Sticky Events Refactoring Plan

## Problem Statement

The current `sticky-events.js` implementation has complex resize functionality that could benefit from similar refactoring patterns as the connector-events migration. While the main sticky events are relatively well-organized, the resize functionality shows similar issues:

- Boolean flags scattered throughout (`isResizing`, `resizeData`)
- Global event listeners added/removed manually without proper management
- Complex state management for resize operations
- No centralized state machine for resize interactions
- Potential for listener leaks during resize operations
- Manual cleanup of resize state

### Specific Issues Found

1. **Manual Global Listener Management**: The resize functionality manually adds/removes `mousemove` and `mouseup` listeners
2. **Scattered Resize State**: Multiple variables (`isResizing`, `resizeData`) make it hard to track resize state
3. **Complex Resize Logic**: The resize calculation logic is embedded in the global event handlers
4. **No Error Recovery**: If an error occurs during resize, the state can become corrupted
5. **Manual Cursor Management**: Cursor changes are handled manually without centralized state

## Proposed Solution

### 1. Centralized Resize State Machine

Replace scattered boolean flags with an explicit state enum for resize operations:

```javascript
const StickyResizeState = {
  IDLE: 'idle',
  RESIZING: 'resizing'
};

let currentResizeState = StickyResizeState.IDLE;
let resizeStateData = {
  // All resize state consolidated in one place
  stickyId: null,
  side: null,
  startX: null,
  startY: null,
  startSize: null,
  startLocation: null,
  currentSize: null,
  currentLocation: null
};
```

**Benefits:**
- Single source of truth for resize state
- Easy to log and debug resize state transitions
- Impossible to be in multiple resize states simultaneously
- Resize state transitions are explicit and trackable

### 2. Resize Handler Architecture

Create focused handlers for resize operations:

```javascript
const stickyResizeHandlers = {
  // Handler for starting resize operations
  resizeStartHandler: {
    canHandle: (event, state) => {
      const handle = event.target.closest('.resize-handle');
      return state === StickyResizeState.IDLE && handle !== null;
    },
    
    onMouseDown: (event, resizeStateData) => {
      const handle = event.target.closest('.resize-handle');
      const side = extractResizeSide(handle);
      
      event.preventDefault();
      event.stopPropagation();
      
      const sticky = store.getSticky(id);
      if (!sticky) return;

      const currentSize = {
        x: (sticky.size && sticky.size.x) || 1,
        y: (sticky.size && sticky.size.y) || 1
      };

      const currentLocation = {
        x: sticky.location.x,
        y: sticky.location.y
      };

      resizeStateData.stickyId = id;
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
      
      store.updateSize(resizeStateData.stickyId, finalSize);
      store.setLocation(resizeStateData.stickyId, finalLocation);
      
      transitionResizeState(StickyResizeState.IDLE, 'resize completed');
    }
  }
};
```

### 3. Resize Listener Manager

Prevent listener overlap with a dedicated manager for resize operations:

```javascript
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
```

### 4. Explicit Resize State Transitions with Logging

Make resize state changes explicit and traceable:

```javascript
const DEBUG_MODE = true; // Toggle for development

function transitionResizeState(newState, reason, data = {}) {
  const oldState = currentResizeState;
  
  if (DEBUG_MODE) {
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
```

### 5. Centralized Resize Event Handlers

Create focused handlers for resize operations:

```javascript
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

  // Update DOM for live preview
  const widthPx = newSize.x * STICKY_SIZE;
  const heightPx = newSize.y * STICKY_SIZE;
  container.style.width = widthPx + 'px';
  container.style.height = heightPx + 'px';
  
  // Update position for left/top resizing
  if (resizeStateData.side === 'left' || resizeStateData.side === 'top') {
    const appState = store.getAppState();
    const origin = appState.board.origin;
    container.style.left = (newLocation.x - origin.x) + 'px';
    container.style.top = (newLocation.y - origin.y) + 'px';
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
```

### 6. Event Handling Wrapper with Debug Logging

Add comprehensive logging and error handling for resize operations:

```javascript
function handleResizeEvent(eventName, event, handlerFn) {
  if (DEBUG_MODE) {
    console.log(`[StickyResizeEvent] ${eventName} in ${currentResizeState}`, {
      target: event.target?.className || 'unknown',
      handler: handlerFn.name,
      resizeStateData: { ...resizeStateData }
    });
  }
  
  try {
    return handlerFn(event, resizeStateData);
  } catch (error) {
    console.error(`[StickyResizeError] in ${handlerFn.name}:`, error);
    // Reset to safe state
    transitionResizeState(StickyResizeState.IDLE, 'error recovery');
    throw error;
  }
}
```

### 7. Integration with Existing Sticky Events

The refactored resize functionality integrates cleanly with the existing sticky events:

```javascript
export function setupStickyEvents(
  container,
  id,
  updateTextById,
  getStickyLocation,
  selectionManager,
  store
) {
  // ... existing sticky event setup ...
  
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

function setupResizeHandlesRefactored(container, id, store) {
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
          return handleResizeEvent('mousedown', event, handler.onMouseDown);
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
```

## State Machine Flow

```
IDLE
  ↓ (mousedown on resize handle)
RESIZING
  ↓ (mouseup)
IDLE
```

## Handler Priority Order

1. **resizeStartHandler** - Handles mousedown on resize handles
2. **resizeEndHandler** - Handles mouseup during resize operations

## Error Recovery

- All errors are caught and logged
- Resize state is automatically reset to `IDLE`
- No partial state corruption possible
- Debug information is preserved for troubleshooting

## Testing Strategy

Create comprehensive tests covering:

- ✅ Resize handle detection and side extraction
- ✅ Resize start functionality
- ✅ Resize move calculations for all sides
- ✅ Resize end and final size application
- ✅ Error handling and edge cases
- ✅ Resize state machine transitions
- ✅ Global listener management for resize
- ✅ Integration with existing sticky events

## Migration Strategy

### Phase 1: Analysis and Testing
1. Create comprehensive test suite for current resize functionality
2. Document all current resize behaviors and edge cases
3. Identify all resize state variables and their purposes

### Phase 2: Implementation
1. Implement centralized resize state machine
2. Implement ResizeListenerManager
3. Create resize handler architecture
4. Add comprehensive debug logging
5. Implement error handling and recovery

### Phase 3: Migration
1. Replace old resize implementation with new one
2. Run comprehensive tests to ensure functionality is preserved
3. Test manually in browser to verify resize behavior
4. Update any documentation that references the old resize implementation

## Benefits Achieved

1. **Easier Debugging** - Complete resize event/state trace in console
2. **Fewer Bugs** - Impossible resize states are prevented
3. **Better Maintenance** - Clear structure for adding resize features
4. **Self-Documenting** - Code structure matches resize behavior
5. **Testability** - Each resize handler can be tested independently
6. **Performance** - No wasted event listener registrations
7. **Error Recovery** - Automatic state reset on resize errors
8. **Clean Architecture** - Separation of concerns with clear responsibilities

## Files to Modify

- **`scripts/board-items/sticky-events.js`** - Refactor resize functionality with new architecture
- **`test/sticky-events.spec.js`** - Comprehensive test suite for resize functionality
- **`test/sticky-resize-refactored.spec.js`** - Architecture validation tests
- **`STICKY_EVENTS_REFACTORING_PLAN.md`** - Migration documentation
- **`STICKY_EVENTS_REFACTORING_COMPLETE.md`** - Completion documentation

## Next Steps

1. Create comprehensive test suite for current resize functionality
2. Implement the new resize state machine architecture
3. Add resize listener manager
4. Create resize handler architecture
5. Add comprehensive debug logging and error handling
6. Run full test suite to ensure functionality is preserved
7. Test manually in browser to verify resize behavior
8. Update documentation

The sticky resize functionality will become much more robust and maintainable with this refactoring! 🎉
