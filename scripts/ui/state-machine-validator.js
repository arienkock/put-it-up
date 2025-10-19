/**
 * State Machine Validator
 * Provides runtime validation and debugging tools
 */
export class StateMachineValidator {
  constructor(stateMachine) {
    this.stateMachine = stateMachine;
    this.validationHistory = [];
  }
  
  /**
   * Validate current state consistency
   */
  validateCurrentState() {
    const isValid = this.stateMachine.validateState();
    const validation = {
      timestamp: Date.now(),
      state: this.stateMachine.currentState,
      isValid,
      stateData: { ...this.stateMachine.stateData }
    };
    
    this.validationHistory.push(validation);
    
    if (!isValid) {
      console.error('[StateMachineValidator] Invalid state detected:', validation);
    }
    
    return isValid;
  }
  
  /**
   * Run comprehensive state machine tests
   */
  runStateMachineTests() {
    const tests = [
      () => this.testInitialStateSetup(),
      () => this.testStateTransitions(),
      () => this.testStateCleanup(),
      () => this.testStateValidation()
    ];
    
    const results = tests.map(test => {
      try {
        return { success: true, result: test() };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    return results;
  }
  
  testInitialStateSetup() {
    // Verify initial state is properly configured
    const initialState = this.stateMachine.currentState;
    const config = this.stateMachine.stateConfig[initialState];
    
    if (!config || !config.setup) {
      throw new Error(`Initial state ${initialState} has no setup function`);
    }
    
    return true;
  }
  
  testStateTransitions() {
    // Test all possible state transitions
    const states = Object.keys(this.stateMachine.stateConfig);
    const results = [];
    
    states.forEach(fromState => {
      states.forEach(toState => {
        if (fromState !== toState) {
          try {
            this.stateMachine.transitionTo(toState, 'test transition');
            results.push({ from: fromState, to: toState, success: true });
            this.stateMachine.transitionTo(fromState, 'return to original');
          } catch (error) {
            results.push({ from: fromState, to: toState, success: false, error: error.message });
          }
        }
      });
    });
    
    return results;
  }
  
  testStateCleanup() {
    // Verify cleanup functions work properly
    const states = Object.keys(this.stateMachine.stateConfig);
    const results = [];
    
    states.forEach(state => {
      const config = this.stateMachine.stateConfig[state];
      if (config && config.cleanup) {
        try {
          config.cleanup(this.stateMachine.stateData);
          results.push({ state, success: true });
        } catch (error) {
          results.push({ state, success: false, error: error.message });
        }
      }
    });
    
    return results;
  }
  
  testStateValidation() {
    // Test validation functions
    const states = Object.keys(this.stateMachine.stateConfig);
    const results = [];
    
    states.forEach(state => {
      const config = this.stateMachine.stateConfig[state];
      if (config && config.validate) {
        try {
          const isValid = config.validate(this.stateMachine.stateData);
          results.push({ state, isValid });
        } catch (error) {
          results.push({ state, isValid: false, error: error.message });
        }
      }
    });
    
    return results;
  }
}
