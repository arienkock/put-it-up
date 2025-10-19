/**
 * Automated State Machine Validation
 * Runs validation checks automatically in development
 */
export class AutoStateMachineValidator {
  constructor() {
    this.registeredMachines = new Map();
    this.validationInterval = null;
  }
  
  /**
   * Register a state machine for automatic validation
   */
  registerStateMachine(name, stateMachine) {
    this.registeredMachines.set(name, stateMachine);
    
    // Start validation if not already running
    if (!this.validationInterval) {
      this.startValidation();
    }
  }
  
  /**
   * Start automatic validation
   */
  startValidation() {
    if (this.validationInterval) return;
    
    this.validationInterval = setInterval(() => {
      this.validateAllMachines();
    }, 5000); // Validate every 5 seconds
  }
  
  /**
   * Stop automatic validation
   */
  stopValidation() {
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
      this.validationInterval = null;
    }
  }
  
  /**
   * Validate all registered state machines
   */
  validateAllMachines() {
    this.registeredMachines.forEach((stateMachine, name) => {
      try {
        const isValid = stateMachine.validateState();
        if (!isValid) {
          console.error(`[AutoValidator] Invalid state in ${name}:`, {
            state: stateMachine.currentState,
            stateData: stateMachine.stateData
          });
        }
      } catch (error) {
        console.error(`[AutoValidator] Validation error in ${name}:`, error);
      }
    });
  }
}

// Global instance for automatic validation
export const autoValidator = new AutoStateMachineValidator();
