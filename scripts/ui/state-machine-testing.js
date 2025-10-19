/**
 * State Machine Testing Utilities
 * Provides tools for testing state machine behavior
 */
export class StateMachineTester {
  /**
   * Test state machine initialization
   */
  static testInitialization(stateMachine, expectedInitialState) {
    const tests = [
      {
        name: 'Initial state is correct',
        test: () => stateMachine.currentState === expectedInitialState
      },
      {
        name: 'State machine is initialized',
        test: () => stateMachine.isInitialized === true
      },
      {
        name: 'Initial state setup was called',
        test: () => {
          const config = stateMachine.stateConfig[expectedInitialState];
          return config && config.setup;
        }
      }
    ];
    
    return this.runTests(tests);
  }
  
  /**
   * Test state transitions
   */
  static testTransitions(stateMachine, testCases) {
    const results = [];
    
    testCases.forEach(testCase => {
      try {
        const initialState = stateMachine.currentState;
        stateMachine.transitionTo(testCase.toState, testCase.reason, testCase.data);
        
        const success = stateMachine.currentState === testCase.toState;
        results.push({
          testCase,
          success,
          actualState: stateMachine.currentState,
          expectedState: testCase.toState
        });
        
        // Return to initial state
        stateMachine.transitionTo(initialState, 'test cleanup');
      } catch (error) {
        results.push({
          testCase,
          success: false,
          error: error.message
        });
      }
    });
    
    return results;
  }
  
  /**
   * Test state consistency
   */
  static testStateConsistency(stateMachine) {
    const states = Object.keys(stateMachine.stateConfig);
    const results = [];
    
    states.forEach(state => {
      stateMachine.transitionTo(state, 'consistency test');
      const isValid = stateMachine.validateState();
      results.push({
        state,
        isValid,
        stateData: { ...stateMachine.stateData }
      });
    });
    
    return results;
  }
  
  static runTests(tests) {
    return tests.map(test => ({
      name: test.name,
      passed: test.test(),
      error: test.test() ? null : `Test failed: ${test.name}`
    }));
  }
}
