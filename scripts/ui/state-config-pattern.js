/**
 * State Configuration Pattern
 * Ensures every state has explicit setup, cleanup, and validation
 */
export const createStateConfig = (states) => {
  const config = {};
  
  Object.keys(states).forEach(stateName => {
    config[states[stateName]] = {
      setup: (stateData, stateMachine) => {
        // Override in specific implementations
      },
      cleanup: (stateData, stateMachine) => {
        // Override in specific implementations
      },
      validate: (stateData, stateMachine) => {
        // Override in specific implementations
        return true;
      }
    };
  });
  
  return config;
};
