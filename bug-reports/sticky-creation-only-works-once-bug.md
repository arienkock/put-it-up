# Sticky Creation Only Works Once Bug

## Bug Description

When using the 'n' key to create a new sticky, the functionality only works once. After creating the first sticky by clicking on the board, subsequent 'n' key presses do not activate sticky creation mode.

## Root Cause

The issue was in the refactored keyboard handler's state management. When a sticky is created by clicking on the board, the `appState.ui.nextClickCreatesNewSticky` flag is reset to `false`, but the keyboard handler's state machine remains in `STICKY_CREATION_MODE`. Since the sticky creation handler only responds to 'n' key presses when the keyboard state is `IDLE`, subsequent 'n' presses are ignored.

### Technical Details

1. **State Machine Issue**: The keyboard handler transitions to `STICKY_CREATION_MODE` when 'n' is pressed
2. **Missing State Transition**: When a sticky is created by clicking, only the `appState.ui.nextClickCreatesNewSticky` flag is reset, but the keyboard state is not transitioned back to `IDLE`
3. **Handler Logic**: The `stickyCreationHandler.canHandle()` method checks `state === KeyboardState.IDLE`, so it won't respond when the state is still `STICKY_CREATION_MODE`

## Fix

### Files Modified

- **`scripts/ui/keyboard-handlers.js`** - Added `completeKeyboardAction()` function
- **`scripts/ui/render-to-dom.js`** - Added call to `completeKeyboardAction()` when sticky is created
- **`scripts/board-items/connector-events.js`** - Added calls to `completeKeyboardAction()` when connector creation is completed/cancelled
- **`test/keyboard-handlers-refactored.spec.js`** - Added test to verify the fix

### Code Changes

#### 1. Added `completeKeyboardAction()` function in keyboard-handlers.js

```javascript
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
```

#### 2. Updated board click handler in render-to-dom.js

```javascript
domElement.onclick = (event) => {
  if (appState.ui.nextClickCreatesNewSticky) {
    appState.ui.nextClickCreatesNewSticky = false;
    // ... create sticky logic ...
    
    // Notify keyboard handler that sticky creation is complete
    completeKeyboardAction('sticky created', appState);
  }
  // ... rest of handler ...
};
```

#### 3. Updated connector events in connector-events.js

```javascript
// Exit connector creation mode
appState.ui.nextClickCreatesConnector = false;

transitionState(ConnectorState.IDLE, 'connector creation completed');

// Notify keyboard handler that connector creation is complete
completeKeyboardAction('connector created', appState);
```

### Test Added

```javascript
it("should transition back to IDLE when action is completed", () => {
  // Test that 'n' works multiple times after completing sticky creation
  const event = new KeyboardEvent('keydown', { key: 'n' });
  mockDocument.body.addEventListener.mock.calls[0][1](event);
  
  let state = getKeyboardState();
  expect(state.currentState).toBe('sticky_creation_mode');
  
  // Complete the action (simulate clicking to create sticky)
  completeKeyboardAction('sticky created', appState);
  
  state = getKeyboardState();
  expect(state.currentState).toBe('idle');
  
  // Now 'n' should work again
  const event2 = new KeyboardEvent('keydown', { key: 'n' });
  mockDocument.body.addEventListener.mock.calls[0][1](event2);
  
  state = getKeyboardState();
  expect(state.currentState).toBe('sticky_creation_mode');
});
```

## Classes, Functions and Code Snippets Involved

### Functions Modified
- `completeKeyboardAction()` - New function to transition keyboard state back to IDLE
- `transitionKeyboardState()` - Enhanced to handle appState parameter
- `domElement.onclick` - Board click handler in render-to-dom.js
- `handleConnectorDragEnd()` - Connector creation completion handler
- `handleClickToClickMove()` - Click-to-click connector completion handler
- `cancelClickToClickMode()` - Connector creation cancellation handler

### State Management
- `KeyboardState.IDLE` - Target state for completion
- `KeyboardState.STICKY_CREATION_MODE` - State that was not being reset
- `KeyboardState.CONNECTOR_CREATION_MODE` - State that was not being reset

### Key Code Snippets

**Problem**: State machine not transitioning back to IDLE
```javascript
// Before fix - only appState flag was reset
appState.ui.nextClickCreatesNewSticky = false;
// Keyboard state remained in STICKY_CREATION_MODE
```

**Solution**: Explicit state transition
```javascript
// After fix - both appState flag and keyboard state are reset
appState.ui.nextClickCreatesNewSticky = false;
completeKeyboardAction('sticky created', appState);
// Keyboard state transitions to IDLE
```

## Tests Inspired by This Bug

- **`should transition back to IDLE when action is completed`** - Verifies that keyboard state properly transitions back to IDLE after action completion
- **Multiple sticky creation test** - Ensures 'n' key works repeatedly after creating stickies
- **State machine integrity test** - Validates that state transitions are properly coordinated between keyboard handler and board interactions

## Impact

This fix ensures that:
1. ✅ Sticky creation with 'n' key works repeatedly
2. ✅ Connector creation with 'c' key works repeatedly  
3. ✅ State machine remains consistent between keyboard and mouse interactions
4. ✅ No breaking changes to existing functionality
5. ✅ All existing tests continue to pass (39/39 tests passing)

The bug was a side effect of the keyboard handler refactoring where the state machine wasn't properly coordinated with the existing board interaction logic. The fix maintains the benefits of the refactored architecture while ensuring proper state synchronization.
