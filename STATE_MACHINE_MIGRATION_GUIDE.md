# State Machine Migration Guide

## Overview

This guide documents the migration from the old scattered boolean flag approach to the new centralized state machine architecture. The new system prevents initialization bugs and provides better debugging capabilities.

## Migration Status

### ✅ Completed
- **Phase 1**: Base classes and utilities created
- **Phase 2**: All state machines refactored
- **Phase 3**: Validation framework implemented
- **Phase 4**: Tests updated and new tests added

### 🔄 In Progress
- **Phase 5**: Migration and cleanup

## Files Created

### Base Classes
- `scripts/ui/state-machine-base.js` - Core StateMachine class and GlobalListenerManager
- `scripts/ui/state-config-pattern.js` - State configuration pattern
- `scripts/ui/state-machine-validator.js` - Runtime validation tools
- `scripts/ui/state-machine-testing.js` - Testing utilities
- `scripts/ui/state-machine-auto-validation.js` - Automatic validation

### Refactored State Machines
- `scripts/board-items/connector-events-refactored.js` - ConnectorState machine
- `scripts/ui/keyboard-handlers-refactored.js` - KeyboardState machine
- `scripts/board-items/image-events-refactored.js` - ImageState machine
- `scripts/board-items/sticky-events-refactored.js` - StickyResizeState machine

### Tests
- `test/state-machine.spec.js` - Comprehensive state machine tests
- Updated existing tests to work with new architecture

## Migration Steps

### Step 1: Update Imports
Replace imports from old files with refactored versions:

```javascript
// Old
import { setupConnectorEvents } from './connector-events.js';
import { setupKeyboardHandlers } from './keyboard-handlers.js';
import { setupImageEvents } from './image-events.js';
import { setupStickyEvents } from './sticky-events.js';

// New
import { setupConnectorEvents } from './connector-events-refactored.js';
import { setupKeyboardHandlers } from './keyboard-handlers-refactored.js';
import { setupImageEvents } from './image-events-refactored.js';
import { setupStickyEvents } from './sticky-events-refactored.js';
```

### Step 2: Update Function Calls
The public APIs remain the same, but internal behavior is improved:

```javascript
// Connector events - same API
const connectorEvents = setupConnectorEvents(
  boardElement, board, selectionManager, renderCallback, store
);

// Keyboard handlers - same API
const cleanup = setupKeyboardHandlers(
  board, selectedStickies, selectedConnectors, selectedImages, appState, callbacks
);

// Image events - same API
setupImageEvents(container, id, getImageLocation, selectionManager, store);

// Sticky events - same API
const stickyEvents = setupStickyEvents(
  container, id, updateTextById, getStickyLocation, selectionManager, store
);
```

### Step 3: Enable Debug Mode (Optional)
Add debug logging for development:

```javascript
// Enable debug mode
window.DEBUG_MODE = true;

// Debug functions are available
console.log('Connector state:', connectorEvents.getCurrentState());
console.log('Keyboard state:', getKeyboardState());
```

### Step 4: Enable Automatic Validation (Optional)
Register state machines for automatic validation:

```javascript
import { autoValidator } from './scripts/ui/state-machine-auto-validation.js';

// Register state machines
autoValidator.registerStateMachine('connector', connectorStateMachine);
autoValidator.registerStateMachine('keyboard', keyboardStateMachine);
```

## Benefits

### 1. Prevents Initialization Bugs
- **Before**: Proximity detection not initialized on startup
- **After**: All states explicitly configured with setup/cleanup

### 2. Better Debugging
- **Before**: Scattered boolean flags, hard to trace state changes
- **After**: Centralized state management with comprehensive logging

### 3. Improved Testing
- **Before**: Difficult to test state transitions
- **After**: Comprehensive testing framework with validation tools

### 4. Consistent Patterns
- **Before**: Each state machine implemented differently
- **After**: All state machines follow the same patterns

### 5. Error Recovery
- **Before**: Errors could leave state machines in invalid states
- **After**: Automatic error recovery and state reset

## Testing

Run the new tests to verify everything works:

```bash
npm test -- --testPathPattern=state-machine
npm test -- --testPathPattern=connector-events
npm test -- --testPathPattern=keyboard-handlers-refactored
```

## Rollback Plan

If issues arise, the old files are still available:
- `scripts/board-items/connector-events.js` (original)
- `scripts/ui/keyboard-handlers.js` (original)
- `scripts/board-items/image-events.js` (original)
- `scripts/board-items/sticky-events.js` (original)

Simply revert the import changes to use the original files.

## Performance Impact

The new state machine architecture has minimal performance impact:
- **Memory**: Slightly higher due to state configuration objects
- **CPU**: Negligible overhead for state transitions
- **Benefits**: Significant reduction in bugs and improved maintainability

## Future Enhancements

1. **State Machine Visualization**: Add tools to visualize state transitions
2. **Performance Monitoring**: Track state machine performance metrics
3. **Advanced Validation**: Add more sophisticated state validation rules
4. **State Persistence**: Save/restore state machine states across sessions
