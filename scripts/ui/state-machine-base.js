/**
 * Base State Machine Class
 * Provides consistent initialization and transition patterns
 */
export class StateMachine {
  constructor(initialState, stateConfig) {
    this.currentState = initialState;
    this.stateConfig = stateConfig;
    this.stateData = {};
    this.listeners = new Map();
    this.isInitialized = false;
    
    // Always initialize the initial state
    this.initializeState(initialState);
  }
  
  /**
   * Initialize a state - called both on startup and transitions
   */
  initializeState(state) {
    const config = this.stateConfig[state];
    if (config && config.setup) {
      config.setup(this.stateData, this);
    }
    this.isInitialized = true;
  }
  
  /**
   * Transition to new state with guaranteed setup
   */
  transitionTo(newState, reason, data = {}) {
    const oldState = this.currentState;
    
    // Cleanup old state
    const oldConfig = this.stateConfig[oldState];
    if (oldConfig && oldConfig.cleanup) {
      oldConfig.cleanup(this.stateData, this);
    }
    
    // Update state and data
    this.currentState = newState;
    this.stateData = { ...this.stateData, ...data };
    
    // Always setup new state
    this.initializeState(newState);
    
    // Log transition
    if (this.isDebugMode()) {
      console.log(`[${this.constructor.name}] ${oldState} → ${newState}`, {
        reason,
        data,
        timestamp: Date.now()
      });
    }
  }
  
  /**
   * Validate state consistency
   */
  validateState() {
    const config = this.stateConfig[this.currentState];
    if (config && config.validate) {
      return config.validate(this.stateData, this);
    }
    return true;
  }
  
  isDebugMode() {
    return window.DEBUG_MODE || false;
  }
}

/**
 * Global Listener Manager
 * Prevents listener overlap and manages document-level event listeners
 */
export class GlobalListenerManager {
  constructor() {
    this.activeListeners = new Map(); // type -> Set of handlers
  }
  
  /**
   * Set listeners for a specific state
   * Automatically removes any existing listeners first
   * Touch events (touchstart, touchmove, touchend) automatically get { passive: false }
   */
  setListeners(listenerMap) {
    this.clearAll();
    
    Object.entries(listenerMap).forEach(([eventType, handler]) => {
      // Add { passive: false } for touch events to allow preventDefault()
      const options = eventType.startsWith('touch') ? { passive: false } : undefined;
      console.log(`[GlobalListenerManager] Adding ${eventType} listener to document`, options ? { options } : '');
      document.addEventListener(eventType, handler, options);
      
      if (!this.activeListeners.has(eventType)) {
        this.activeListeners.set(eventType, new Set());
      }
      this.activeListeners.get(eventType).add(handler);
    });
  }
  
  clearAll() {
    if (this.activeListeners.size > 0) {
      console.log('[GlobalListenerManager] Clearing all listeners', Array.from(this.activeListeners.keys()));
    }
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
