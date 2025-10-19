# React/Vue Frontend State Management Rules

## Core Principles

When working with React or Vue frontend frameworks, follow these mandatory patterns to achieve the same centralized state management benefits as the event handler refactoring, but adapted for component-based UI frameworks:

### 1. Centralized State Machine (MANDATORY)

**NEVER use scattered component state or props drilling.** Always implement a centralized state machine that components subscribe to:

```javascript
// ✅ CORRECT: Centralized state machine
const AppState = {
  IDLE: 'idle',
  LOADING: 'loading',
  EDITING: 'editing',
  DRAGGING: 'dragging',
  ERROR: 'error'
};

class StateManager {
  constructor() {
    this.currentState = AppState.IDLE;
    this.stateData = {};
    this.subscribers = new Set();
  }
  
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
  
  transitionState(newState, reason, data = {}) {
    const oldState = this.currentState;
    
    if (DEBUG_MODE) {
      console.log(`[AppState] ${oldState} → ${newState}`, {
        reason,
        data,
        timestamp: Date.now()
      });
    }
    
    // Clean up old state
    this.cleanupOldState(oldState);
    
    this.currentState = newState;
    this.stateData = { ...this.stateData, ...data };
    
    // Set up new state
    this.setupNewState(newState);
    
    // Notify all subscribers
    this.subscribers.forEach(callback => callback(this.currentState, this.stateData));
  }
  
  getState() {
    return { state: this.currentState, data: this.stateData };
  }
}

const stateManager = new StateManager();

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

### 2. Action-Based State Transitions (MANDATORY)

**NEVER mutate state directly in components.** Always use action functions that go through the state manager:

```javascript
// ✅ CORRECT: Action-based state transitions
class StateActions {
  static startLoading(reason) {
    stateManager.transitionState(AppState.LOADING, reason, {
      startTime: Date.now(),
      reason
    });
  }
  
  static startEditing(itemId, itemType) {
    stateManager.transitionState(AppState.EDITING, 'editing started', {
      editingId: itemId,
      editingType: itemType,
      startTime: Date.now()
    });
  }
  
  static startDragging(itemId, dragType, startPosition) {
    stateManager.transitionState(AppState.DRAGGING, 'drag started', {
      draggingId: itemId,
      dragType,
      startPosition,
      startTime: Date.now()
    });
  }
  
  static completeAction(success = true, result = null) {
    const reason = success ? 'action completed' : 'action failed';
    stateManager.transitionState(AppState.IDLE, reason, {
      lastResult: result,
      completedAt: Date.now()
    });
  }
  
  static handleError(error, context) {
    stateManager.transitionState(AppState.ERROR, 'error occurred', {
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
    StateActions.startEditing(itemId, 'sticky');
  };
  
  const handleDragStart = (itemId, position) => {
    StateActions.startDragging(itemId, 'move', position);
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

**NEVER access state directly in components.** Always use hooks that subscribe to the state manager:

```javascript
// ✅ CORRECT: State-aware hooks
function useAppState() {
  const [state, setState] = useState(() => stateManager.getState());
  
  useEffect(() => {
    const unsubscribe = stateManager.subscribe((newState, newData) => {
      setState({ state: newState, data: newData });
    });
    
    return unsubscribe;
  }, []);
  
  return state;
}

function useAppStateSelector(selector) {
  const [selectedState, setSelectedState] = useState(() => 
    selector(stateManager.getState())
  );
  
  useEffect(() => {
    const unsubscribe = stateManager.subscribe((newState, newData) => {
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
  // Directly accessing state manager
  const state = stateManager.getState();
  // This won't trigger re-renders when state changes
}
```

### 4. Async Operation State Management (MANDATORY)

**NEVER handle async operations without proper state tracking.** Always use the state manager for async operations:

```javascript
// ✅ CORRECT: Async operations with state management
class AsyncOperations {
  static async performAsyncAction(actionType, payload) {
    try {
      StateActions.startLoading(`Starting ${actionType}`);
      
      const result = await apiCall(payload);
      
      StateActions.completeAction(true, result);
      return result;
      
    } catch (error) {
      StateActions.handleError(error, { actionType, payload });
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
      await AsyncOperations.saveItem(itemData);
      // Success handled by state manager
    } catch (error) {
      // Error handled by state manager
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

## Implementation Checklist

Before implementing any component state management, verify:

- [ ] **Centralized State Manager**: Single source of truth for all app state
- [ ] **Action-Based Transitions**: All state changes go through action functions
- [ ] **State-Aware Hooks**: Components subscribe to state manager via hooks
- [ ] **Async State Management**: All async operations tracked in state manager
- [ ] **State-Dependent Rendering**: UI decisions based on centralized state
- [ ] **Cleanup and Recovery**: Proper cleanup and error recovery mechanisms
- [ ] **State Persistence**: Critical state persisted across page refreshes
- [ ] **Debug Logging**: Comprehensive logging for state transitions
- [ ] **Testing**: State manager and actions can be tested independently
- [ ] **Performance**: Efficient subscriptions and minimal re-renders

## Code Templates

### Basic State Manager Template

```javascript
// State definition
const AppState = {
  IDLE: 'idle',
  LOADING: 'loading',
  EDITING: 'editing',
  ERROR: 'error'
};

// State manager
class StateManager {
  constructor() {
    this.currentState = AppState.IDLE;
    this.stateData = {};
    this.subscribers = new Set();
  }
  
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }
  
  transitionState(newState, reason, data = {}) {
    // Implementation as shown above
  }
  
  getState() {
    return { state: this.currentState, data: this.stateData };
  }
}

const stateManager = new StateManager();

// Actions
class StateActions {
  static startLoading(reason) {
    stateManager.transitionState(AppState.LOADING, reason);
  }
  
  static completeAction(success = true) {
    stateManager.transitionState(AppState.IDLE, 'action completed');
  }
  
  static handleError(error) {
    stateManager.transitionState(AppState.ERROR, 'error occurred', { error });
  }
}

// Hooks
function useAppState() {
  const [state, setState] = useState(() => stateManager.getState());
  
  useEffect(() => {
    const unsubscribe = stateManager.subscribe((newState, newData) => {
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
    StateActions.startLoading('user action');
  };
  
  return (
    <div>
      {state === AppState.LOADING && <div>Loading...</div>}
      <button onClick={handleAction}>Do Something</button>
    </div>
  );
}
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
- **Single Source of Truth**: All UI state centralized and consistent
- **Predictable State Changes**: All state transitions explicit and logged
- **Better Debugging**: Complete state trace across all components
- **Easier Testing**: State manager and actions testable independently
- **Performance**: Efficient subscriptions and minimal re-renders
- **Error Recovery**: Automatic state reset and error handling
- **State Persistence**: Critical state survives page refreshes
- **Maintainability**: Clear separation between state and UI logic

## References

These rules are adapted from the event handler refactoring patterns in:
- `CONNECTOR_EVENTS_REFACTORING_PLAN.md`
- `STICKY_EVENTS_REFACTORING_PLAN.md`
- `KEYBOARD_HANDLERS_REFACTORING_PLAN.md`

Applied to modern React/Vue component-based architectures.
