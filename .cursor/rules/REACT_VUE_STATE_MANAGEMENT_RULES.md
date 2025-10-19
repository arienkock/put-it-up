# React/Vue Frontend State Management Rules

## Core Principles

When working with React or Vue frontend frameworks, follow these mandatory patterns to achieve the same centralized state management benefits as the event handler refactoring and State Machine Prevention Plan, but adapted for component-based UI frameworks:

### 1. State Machine Base Class Architecture (MANDATORY)

**NEVER use scattered component state or props drilling.** Always extend the StateMachine base class for frontend state management:

```javascript
// ✅ CORRECT: Extend StateMachine base class for frontend
import { StateMachine, createStateConfig } from '../ui/state-machine-base.js';
import { GlobalListenerManager } from '../ui/state-machine-base.js';
import { StateMachineValidator } from '../ui/state-machine-validator.js';

const AppState = {
  IDLE: 'idle',
  LOADING: 'loading',
  EDITING: 'editing',
  DRAGGING: 'dragging',
  ERROR: 'error'
};

class FrontendStateMachine extends StateMachine {
  constructor() {
    const stateConfig = createStateConfig(AppState);
    
    // Configure each state with explicit setup, cleanup, and validation
    stateConfig[AppState.IDLE] = {
      setup: (stateData, stateMachine) => {
        if (stateMachine.subscribers) {
          stateMachine.clearAllSubscriptions();
          stateMachine.resetState();
        }
      },
      cleanup: (stateData, stateMachine) => {
        if (stateMachine.subscribers) {
          stateMachine.clearAllSubscriptions();
        }
      },
      validate: (stateData, stateMachine) => {
        return stateMachine.isIdle === true;
      }
    };
    
    stateConfig[AppState.LOADING] = {
      setup: (stateData, stateMachine) => {
        if (stateMachine.subscribers) {
          stateMachine.setupLoadingState();
        }
      },
      cleanup: (stateData, stateMachine) => {
        if (stateMachine.subscribers) {
          stateMachine.cancelPendingRequests();
        }
      },
      validate: (stateData, stateMachine) => {
        return stateMachine.isLoading === true;
      }
    };
    
    super(AppState.IDLE, stateConfig);
    
    // Initialize properties after super constructor
    this.subscribers = new Set();
    this.pendingRequests = new Set();
    this.globalListeners = new GlobalListenerManager();
    
    // Re-initialize initial state now that properties are set
    this.initializeState(AppState.IDLE);
  }
  
  // Frontend-specific methods
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
  
  notifySubscribers() {
    this.subscribers.forEach(callback => 
      callback(this.currentState, this.stateData)
    );
  }
  
  clearAllSubscriptions() {
    this.subscribers.clear();
  }
  
  resetState() {
    this.isIdle = true;
    this.isLoading = false;
    this.isEditing = false;
  }
  
  setupLoadingState() {
    this.isLoading = true;
    this.isIdle = false;
  }
  
  cancelPendingRequests() {
    this.pendingRequests.forEach(request => request.cancel());
    this.pendingRequests.clear();
  }
}

const frontendStateMachine = new FrontendStateMachine();

// Register for automatic validation
const validator = new StateMachineValidator(frontendStateMachine);
validator.validateCurrentState();

// ❌ WRONG: Scattered component state
function Component1() {
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // Multiple components managing similar state independently
}

function Component2() {
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // Duplicate state management
}
```

### 2. Constructor Initialization Pattern (MANDATORY)

**NEVER access `this` before calling `super()`.** Always initialize properties after the super constructor:

```javascript
// ✅ CORRECT: Proper constructor initialization for frontend state machine
class FrontendStateMachine extends StateMachine {
  constructor() {
    const stateConfig = createStateConfig(AppState);
    
    // Configure state config BEFORE super()
    stateConfig[AppState.IDLE] = {
      setup: (stateData, stateMachine) => {
        // Use stateMachine parameter, not 'this'
        if (stateMachine.subscribers) {
          stateMachine.clearAllSubscriptions();
          stateMachine.resetState();
        }
      }
    };
    
    super(AppState.IDLE, stateConfig);
    
    // Initialize properties AFTER super constructor
    this.subscribers = new Set();
    this.pendingRequests = new Set();
    this.globalListeners = new GlobalListenerManager();
    
    // Re-initialize initial state now that properties are set
    this.initializeState(AppState.IDLE);
  }
}

// ❌ WRONG: Accessing 'this' before super() or in state setup
class BadFrontendStateMachine extends StateMachine {
  constructor() {
    this.subscribers = new Set(); // ❌ Before super()
    
    const stateConfig = createStateConfig(AppState);
    stateConfig[AppState.IDLE] = {
      setup: (stateData, stateMachine) => {
        this.clearAllSubscriptions(); // ❌ Using 'this' in setup
      }
    };
    
    super(AppState.IDLE, stateConfig);
  }
}
```

```javascript
// ✅ CORRECT: Action-based state transitions using State Machine Prevention Plan
class FrontendStateActions {
  static startLoading(reason) {
    frontendStateMachine.transitionTo(AppState.LOADING, reason, {
      startTime: Date.now(),
      reason
    });
  }
  
  static startEditing(itemId, itemType) {
    frontendStateMachine.transitionTo(AppState.EDITING, 'editing started', {
      editingId: itemId,
      editingType: itemType,
      startTime: Date.now()
    });
  }
  
  static startDragging(itemId, dragType, startPosition) {
    frontendStateMachine.transitionTo(AppState.DRAGGING, 'drag started', {
      draggingId: itemId,
      dragType,
      startPosition,
      startTime: Date.now()
    });
  }
  
  static completeAction(success = true, result = null) {
    const reason = success ? 'action completed' : 'action failed';
    frontendStateMachine.transitionTo(AppState.IDLE, reason, {
      lastResult: result,
      completedAt: Date.now()
    });
  }
  
  static handleError(error, context) {
    frontendStateMachine.transitionTo(AppState.ERROR, 'error occurred', {
      error: error.message,
      context,
      occurredAt: Date.now()
    });
  }
}

// Usage in components
function MyComponent() {
  const { state, data } = useAppState();
  
  const handleEdit = (itemId) => {
    FrontendStateActions.startEditing(itemId, 'sticky');
  };
  
  const handleDragStart = (itemId, position) => {
    FrontendStateActions.startDragging(itemId, 'move', position);
  };
  
  // ❌ WRONG: Direct state mutation
  // const [isEditing, setIsEditing] = useState(false);
  // setIsEditing(true); // Direct mutation
}

// ❌ WRONG: Props drilling
function ParentComponent() {
  const [isEditing, setIsEditing] = useState(false);
  return <ChildComponent isEditing={isEditing} setIsEditing={setIsEditing} />;
}
```

### 3. State-Aware Component Hooks (MANDATORY)

**NEVER access state directly in components.** Always use hooks that subscribe to the state machine:

```javascript
// ✅ CORRECT: State-aware hooks using State Machine Prevention Plan
function useAppState() {
  const [state, setState] = useState(() => frontendStateMachine.getState());
  
  useEffect(() => {
    const unsubscribe = frontendStateMachine.subscribe((newState, newData) => {
      setState({ state: newState, data: newData });
    });
    
    return unsubscribe;
  }, []);
  
  return state;
}

function useAppStateSelector(selector) {
  const [selectedState, setSelectedState] = useState(() => 
    selector(frontendStateMachine.getState())
  );
  
  useEffect(() => {
    const unsubscribe = frontendStateMachine.subscribe((newState, newData) => {
      const newSelectedState = selector({ state: newState, data: newData });
      setSelectedState(newSelectedState);
    });
    
    return unsubscribe;
  }, [selector]);
  
  return selectedState;
}

// Usage examples
function LoadingComponent() {
  const isLoading = useAppStateSelector(state => state.state === AppState.LOADING);
  
  if (!isLoading) return null;
  
  return <div>Loading...</div>;
}

function EditingComponent() {
  const { state, data } = useAppState();
  
  if (state !== AppState.EDITING) return null;
  
  return (
    <div>
      Editing {data.editingType}: {data.editingId}
    </div>
  );
}

// ❌ WRONG: Direct state access
function BadComponent() {
  // Directly accessing state machine
  const state = frontendStateMachine.getState();
  // This won't trigger re-renders when state changes
}
```

### 4. Async Operation State Management (MANDATORY)

**NEVER handle async operations without proper state tracking.** Always use the state machine for async operations:

```javascript
// ✅ CORRECT: Async operations with State Machine Prevention Plan
class FrontendAsyncOperations {
  static async performAsyncAction(actionType, payload) {
    try {
      FrontendStateActions.startLoading(`Starting ${actionType}`);
      
      const result = await apiCall(payload);
      
      FrontendStateActions.completeAction(true, result);
      return result;
      
    } catch (error) {
      FrontendStateActions.handleError(error, { actionType, payload });
      throw error;
    }
  }
  
  static async saveItem(itemData) {
    return this.performAsyncAction('save', itemData);
  }
  
  static async deleteItem(itemId) {
    return this.performAsyncAction('delete', { itemId });
  }
  
  static async loadData() {
    return this.performAsyncAction('load', {});
  }
}

// Usage in components
function DataComponent() {
  const { state, data } = useAppState();
  
  const handleSave = async (itemData) => {
    try {
      await FrontendAsyncOperations.saveItem(itemData);
      // Success handled by state machine
    } catch (error) {
      // Error handled by state machine
    }
  };
  
  const isLoading = state === AppState.LOADING;
  const hasError = state === AppState.ERROR;
  
  return (
    <div>
      {isLoading && <div>Loading...</div>}
      {hasError && <div>Error: {data.error}</div>}
      <button onClick={() => handleSave({ id: 1, name: 'test' })}>
        Save Item
      </button>
    </div>
  );
}

// ❌ WRONG: Async without state management
function BadComponent() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleSave = async (itemData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await apiCall(itemData);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Multiple components doing this independently
}
```

### 5. State-Dependent UI Rendering (MANDATORY)

**NEVER render UI based on local component state when global state is relevant.** Always use the centralized state for UI decisions:

```javascript
// ✅ CORRECT: State-dependent rendering
function App() {
  const { state, data } = useAppState();
  
  return (
    <div className="app">
      <Header />
      
      {state === AppState.LOADING && <LoadingOverlay />}
      {state === AppState.ERROR && <ErrorDisplay error={data.error} />}
      {state === AppState.EDITING && <EditingOverlay itemId={data.editingId} />}
      
      <MainContent />
      
      {state === AppState.DRAGGING && <DragPreview data={data} />}
    </div>
  );
}

function MainContent() {
  const { state } = useAppState();
  
  // Disable interactions when not in idle state
  const isInteractive = state === AppState.IDLE;
  
  return (
    <div className={`main-content ${!isInteractive ? 'disabled' : ''}`}>
      <StickyBoard />
      <Toolbar />
    </div>
  );
}

function StickyBoard() {
  const { state, data } = useAppState();
  
  const handleStickyClick = (stickyId) => {
    if (state === AppState.IDLE) {
      StateActions.startEditing(stickyId, 'sticky');
    }
  };
  
  return (
    <div className="sticky-board">
      {/* Render stickies */}
      <Sticky 
        id={1} 
        onClick={handleStickyClick}
        isBeingEdited={state === AppState.EDITING && data.editingId === 1}
      />
    </div>
  );
}

// ❌ WRONG: Local state for global UI decisions
function BadApp() {
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  return (
    <div>
      {isLoading && <LoadingOverlay />}
      {isEditing && <EditingOverlay />}
      {/* Multiple components managing similar UI state */}
    </div>
  );
}
```

### 6. State Cleanup and Error Recovery (MANDATORY)

**NEVER leave components in inconsistent states.** Always implement proper cleanup and error recovery:

```javascript
// ✅ CORRECT: State cleanup and error recovery
class StateManager {
  cleanupOldState(oldState) {
    switch (oldState) {
      case AppState.LOADING:
        // Cancel any pending requests
        this.cancelPendingRequests();
        break;
      case AppState.EDITING:
        // Save any unsaved changes
        this.savePendingChanges();
        break;
      case AppState.DRAGGING:
        // Reset any drag previews
        this.resetDragState();
        break;
      case AppState.ERROR:
        // Clear error state
        this.clearErrorState();
        break;
    }
  }
  
  setupNewState(newState) {
    switch (newState) {
      case AppState.LOADING:
        this.setupLoadingState();
        break;
      case AppState.EDITING:
        this.setupEditingState();
        break;
      case AppState.DRAGGING:
        this.setupDraggingState();
        break;
      case AppState.ERROR:
        this.setupErrorState();
        break;
    }
  }
  
  // Error recovery
  recoverFromError() {
    this.transitionState(AppState.IDLE, 'error recovery');
  }
}

// Usage in components
function ErrorBoundary({ children }) {
  const { state, data } = useAppState();
  
  useEffect(() => {
    if (state === AppState.ERROR) {
      // Log error for debugging
      console.error('App error:', data.error);
      
      // Auto-recover after timeout
      const timeout = setTimeout(() => {
        stateManager.recoverFromError();
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
  }, [state, data]);
  
  if (state === AppState.ERROR) {
    return (
      <div className="error-boundary">
        <h2>Something went wrong</h2>
        <p>{data.error}</p>
        <button onClick={() => stateManager.recoverFromError()}>
          Try Again
        </button>
      </div>
    );
  }
  
  return children;
}

// ❌ WRONG: No cleanup or error recovery
function BadComponent() {
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    // Start loading but never clean up
    setIsLoading(true);
    // No cleanup, no error handling
  }, []);
}
```

### 7. State Persistence and Hydration (MANDATORY)

**NEVER lose state on page refresh.** Always implement state persistence for critical state:

```javascript
// ✅ CORRECT: State persistence
class StateManager {
  constructor() {
    this.currentState = AppState.IDLE;
    this.stateData = {};
    this.subscribers = new Set();
    
    // Load persisted state
    this.loadPersistedState();
    
    // Save state on changes
    this.setupPersistence();
  }
  
  loadPersistedState() {
    try {
      const persisted = localStorage.getItem('appState');
      if (persisted) {
        const { state, data } = JSON.parse(persisted);
        this.currentState = state;
        this.stateData = data;
      }
    } catch (error) {
      console.warn('Failed to load persisted state:', error);
    }
  }
  
  setupPersistence() {
    // Debounced save to avoid excessive localStorage writes
    let saveTimeout;
    this.subscribers.add(() => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        this.saveState();
      }, 100);
    });
  }
  
  saveState() {
    try {
      const stateToSave = {
        state: this.currentState,
        data: this.stateData,
        timestamp: Date.now()
      };
      localStorage.setItem('appState', JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Failed to save state:', error);
    }
  }
}

// ❌ WRONG: No state persistence
function BadComponent() {
  const [importantState, setImportantState] = useState(null);
  // State lost on page refresh
}
```

### 9. State Machine Prevention Plan Compliance (MANDATORY)

**ALWAYS follow the State Machine Prevention Plan patterns.** Use the established base classes and validation framework:

```javascript
// ✅ CORRECT: Use State Machine Prevention Plan components for frontend
import { StateMachine, createStateConfig } from '../ui/state-machine-base.js';
import { GlobalListenerManager } from '../ui/state-machine-base.js';
import { StateMachineValidator } from '../ui/state-machine-validator.js';

class FrontendStateMachine extends StateMachine {
  constructor() {
    const stateConfig = createStateConfig(AppState);
    
    // Configure states with explicit setup, cleanup, and validation
    stateConfig[AppState.IDLE] = {
      setup: (stateData, stateMachine) => {
        if (stateMachine.subscribers) {
          stateMachine.clearAllSubscriptions();
          stateMachine.resetState();
        }
      },
      cleanup: (stateData, stateMachine) => {
        if (stateMachine.subscribers) {
          stateMachine.clearAllSubscriptions();
        }
      },
      validate: (stateData, stateMachine) => {
        return stateMachine.isIdle === true;
      }
    };
    
    super(AppState.IDLE, stateConfig);
    
    // Initialize properties after super constructor
    this.subscribers = new Set();
    this.globalListeners = new GlobalListenerManager();
    
    // Re-initialize initial state now that properties are set
    this.initializeState(AppState.IDLE);
  }
}

// Register for automatic validation
const validator = new StateMachineValidator(frontendStateMachine);
validator.validateCurrentState();
```

## Implementation Checklist

Before implementing any component state management, verify:

- [ ] **State Machine Base Class**: Extends `StateMachine` base class with proper configuration
- [ ] **Constructor Pattern**: Properties initialized after `super()` call
- [ ] **State Configuration**: Each state has explicit `setup`, `cleanup`, and `validate` functions
- [ ] **Property Access**: State setup functions use `stateMachine` parameter, not `this`
- [ ] **Frontend-Specific Methods**: Includes subscription management and component notification
- [ ] **Action-Based Transitions**: All state changes go through action functions
- [ ] **State-Aware Hooks**: Components subscribe to state machine via hooks
- [ ] **Async State Management**: All async operations tracked in state machine
- [ ] **State-Dependent Rendering**: UI decisions based on centralized state
- [ ] **Cleanup and Recovery**: Proper cleanup and error recovery mechanisms
- [ ] **State Persistence**: Critical state persisted across page refreshes
- [ ] **Debug Logging**: Comprehensive logging for state transitions
- [ ] **Testing**: State machine and actions can be tested independently
- [ ] **Validation Framework**: Uses `StateMachineValidator` for runtime validation
- [ ] **Performance**: Efficient subscriptions and minimal re-renders

## Code Templates

### State Machine Prevention Plan Template for Frontend

```javascript
// Import State Machine Prevention Plan components
import { StateMachine, createStateConfig } from '../ui/state-machine-base.js';
import { GlobalListenerManager } from '../ui/state-machine-base.js';
import { StateMachineValidator } from '../ui/state-machine-validator.js';

// State definition
const AppState = {
  IDLE: 'idle',
  LOADING: 'loading',
  EDITING: 'editing',
  ERROR: 'error'
};

// Frontend state machine
class FrontendStateMachine extends StateMachine {
  constructor() {
    const stateConfig = createStateConfig(AppState);
    
    // Configure each state with explicit setup, cleanup, and validation
    stateConfig[AppState.IDLE] = {
      setup: (stateData, stateMachine) => {
        if (stateMachine.subscribers) {
          stateMachine.clearAllSubscriptions();
          stateMachine.resetState();
        }
      },
      cleanup: (stateData, stateMachine) => {
        if (stateMachine.subscribers) {
          stateMachine.clearAllSubscriptions();
        }
      },
      validate: (stateData, stateMachine) => {
        return stateMachine.isIdle === true;
      }
    };
    
    stateConfig[AppState.LOADING] = {
      setup: (stateData, stateMachine) => {
        if (stateMachine.subscribers) {
          stateMachine.setupLoadingState();
        }
      },
      cleanup: (stateData, stateMachine) => {
        if (stateMachine.subscribers) {
          stateMachine.cancelPendingRequests();
        }
      },
      validate: (stateData, stateMachine) => {
        return stateMachine.isLoading === true;
      }
    };
    
    super(AppState.IDLE, stateConfig);
    
    // Initialize properties after super constructor
    this.subscribers = new Set();
    this.pendingRequests = new Set();
    this.globalListeners = new GlobalListenerManager();
    
    // Re-initialize initial state now that properties are set
    this.initializeState(AppState.IDLE);
  }
  
  // Frontend-specific methods
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
  
  notifySubscribers() {
    this.subscribers.forEach(callback => 
      callback(this.currentState, this.stateData)
    );
  }
  
  clearAllSubscriptions() {
    this.subscribers.clear();
  }
  
  resetState() {
    this.isIdle = true;
    this.isLoading = false;
    this.isEditing = false;
  }
  
  setupLoadingState() {
    this.isLoading = true;
    this.isIdle = false;
  }
  
  cancelPendingRequests() {
    this.pendingRequests.forEach(request => request.cancel());
    this.pendingRequests.clear();
  }
}

const frontendStateMachine = new FrontendStateMachine();

// Actions
class FrontendStateActions {
  static startLoading(reason) {
    frontendStateMachine.transitionTo(AppState.LOADING, reason);
  }
  
  static completeAction(success = true) {
    frontendStateMachine.transitionTo(AppState.IDLE, 'action completed');
  }
  
  static handleError(error) {
    frontendStateMachine.transitionTo(AppState.ERROR, 'error occurred', { error });
  }
}

// Hooks
function useAppState() {
  const [state, setState] = useState(() => frontendStateMachine.getState());
  
  useEffect(() => {
    const unsubscribe = frontendStateMachine.subscribe((newState, newData) => {
      setState({ state: newState, data: newData });
    });
    
    return unsubscribe;
  }, []);
  
  return state;
}

// Component usage
function MyComponent() {
  const { state, data } = useAppState();
  
  const handleAction = () => {
    FrontendStateActions.startLoading('user action');
  };
  
  return (
    <div>
      {state === AppState.LOADING && <div>Loading...</div>}
      <button onClick={handleAction}>Do Something</button>
    </div>
  );
}

// Usage with validation
const validator = new StateMachineValidator(frontendStateMachine);
validator.validateCurrentState();
```

## Framework-Specific Adaptations

### React Implementation
- Use `useState` and `useEffect` for state subscriptions
- Use `useCallback` for action functions to prevent unnecessary re-renders
- Use `useMemo` for expensive state computations
- Consider using `useReducer` for complex state logic

### Vue Implementation
- Use `ref` and `watchEffect` for state subscriptions
- Use `computed` for derived state
- Use `provide/inject` for state manager access
- Consider using Pinia or Vuex for larger applications

## Enforcement

These rules are **MANDATORY** for all React/Vue frontend state management. Any component that violates these patterns must be refactored before being merged.

## Benefits

Following these patterns ensures:
- **🛡️ Bug Prevention**: Eliminates state machine initialization bugs through proper constructor patterns
- **🔍 Better Debugging**: Complete state trace across all components with comprehensive logging
- **🧪 Improved Testing**: Comprehensive testing framework with validation for frontend state machines
- **📚 Better Documentation**: Clear patterns and examples for frontend state management
- **🔄 Consistent Architecture**: All frontend state machines follow the same patterns and base classes
- **⚡ Better Performance**: Efficient subscriptions and minimal re-renders with centralized state
- **🔧 Runtime Validation**: Automated validation catches frontend state issues within 5 seconds
- **🎯 Self-Documenting**: Code structure matches behavior with explicit state configurations
- **🧹 Proper Cleanup**: Automatic cleanup in state transitions prevents memory leaks
- **🚨 Error Recovery**: Automatic state reset on errors with proper cleanup
- **📱 Component Integration**: Seamless integration with React/Vue component lifecycle
- **🔄 State Persistence**: Critical state survives page refreshes and navigation

## References

These rules are derived from successful refactoring of:
- `CONNECTOR_EVENTS_REFACTORING_PLAN.md`
- `STICKY_EVENTS_REFACTORING_PLAN.md`
- `KEYBOARD_HANDLERS_REFACTORING_PLAN.md`
- `STATE_MACHINE_PREVENTION_PLAN.md` - Comprehensive implementation with base classes, validation framework, and testing utilities

Applied to modern React/Vue component-based architectures with State Machine Prevention Plan compliance.
