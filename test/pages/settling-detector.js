import { BufferedObserver } from "../../scripts/ui/buffered-observer.js";

// wait for onerror, the animation task list to be empty, in case network-datastore: all local events have been passed to observers
export function installSettlingDetector(observer) {
  if (!observer instanceof BufferedObserver) {
    throw new Error(
      "Settling detector only works with observer of type BufferedObserver"
    );
  }
  
  // Declare variables first before using them
  let errors = [];
  let transitionsInProgress = [];
  
  // Store handler references so they can be removed during cleanup
  const errorHandler = (event) => {
    errors.push(event.error);
  };
  const transitionRunHandler = (event) =>
    addTransitionsInProgress(event.target, event.propertyName);
  const transitionEndHandler = (event) =>
    removeTransitionsInProgress(event.target, event.propertyName);
  const transitionCancelHandler = (event) =>
    removeTransitionsInProgress(event.target, event.propertyName);
  
  window.printTransitionsInProgress = () => {
    return JSON.stringify(transitionsInProgress);
  };
  window.waitForThingsToSettleDown = (
    expectedScheduledTasksCount,
    expectedNumErrors = 0
  ) =>
    new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => checkStatus()));
      function checkStatus() {
        if (errors.length > expectedNumErrors) {
          resolve(errors[errors.length - 1] + "");
        } else if (
          expectedScheduledTasksCount !== undefined &&
          observer.tasksScheduledCount() !== expectedScheduledTasksCount
        ) {
          resolve(
            `A different number of tasks (${observer.tasksScheduledCount()}) were executed than expected (${expectedScheduledTasksCount})`
          );
        } else if (
          observer.numTasks() === 0 &&
          transitionsInProgress.length === 0
        ) {
          resolve();
        } else {
          requestAnimationFrame(() => checkStatus());
        }
      }
    });
  
  window.addEventListener("error", errorHandler);
  window.addEventListener("transitionrun", transitionRunHandler);
  window.addEventListener("transitionend", transitionEndHandler);
  window.addEventListener("transitioncancel", transitionCancelHandler);

  function addTransitionsInProgress(element, property) {
    transitionsInProgress.push([element, property]);
  }
  function removeTransitionsInProgress(element, property) {
    transitionsInProgress = transitionsInProgress.filter(
      (entry) => !(element === entry[0] && property === entry[1])
    );
  }
  
  // Store cleanup function on window so tests can call it
  const cleanupFunction = function cleanupSettlingDetector() {
    window.removeEventListener("error", errorHandler);
    window.removeEventListener("transitionrun", transitionRunHandler);
    window.removeEventListener("transitionend", transitionEndHandler);
    window.removeEventListener("transitioncancel", transitionCancelHandler);
    
    // Clear global functions
    delete window.printTransitionsInProgress;
    delete window.waitForThingsToSettleDown;
    delete window.cleanupSettlingDetector;
    
    // Clear state
    errors = [];
    transitionsInProgress = [];
  };
  
  window.cleanupSettlingDetector = cleanupFunction;
  
  // Return cleanup function for programmatic use
  return cleanupFunction;
}
