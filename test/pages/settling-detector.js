import { BufferedObserver } from "../../scripts/buffered-observer.js";

// wait for onerror, the animation task list to be empty, in case network-datastore: all local events have been passed to observers
export function installSettlingDetector(observer) {
  if (!observer instanceof BufferedObserver) {
    throw new Error(
      "Settling detector only works with observer of type BufferedObserver"
    );
  }
  let transitionsInProgress = [];
  let transitionCompletionCallbacks = [];
  window.addEventListener("transitionrun", (event) =>
    addTransitionsInProgress(event.target, event.propertyName)
  );
  window.addEventListener("transitionend", () =>
    removeTransitionsInProgress(event.target, event.propertyName)
  );
  window.addEventListener("transitioncancel", () =>
    removeTransitionsInProgress(event.target, event.propertyName)
  );

  window.watchForSettle = () => {
    window.settlingPromise = (async () => {
      if (!hasRunningTasks()) {
        await newTask();
      }
      const newError = watchForNewError();
      while (hasRunningTasks()) {
        let result = await Promise.race([
          nextTaskRun(),
          nextTransitionCompletion(),
          newError,
        ]);
        if (result instanceof Error) {
          throw result;
        }
      }
    })();
    function hasRunningTasks() {
      return observer.numTasks() > 0 || transitionsInProgress.length > 0;
    }
    function newTask() {
      return new Promise((resolve, reject) => {
        observer.addScheduleCallback(resolve);
      });
    }
    function watchForNewError() {
      return new Promise((resolve, reject) => {
        window.addEventListener("error", (event) => {
          reject(event.error);
        });
      });
    }
    function nextTaskRun() {
      return new Promise((resolve, reject) => {
        observer.addRunCallback(resolve);
      });
    }
  };
  function addTransitionsInProgress(element, property) {
    transitionsInProgress.push([element, property]);
    console.log("transitionsInProgress ", transitionsInProgress);
  }
  function removeTransitionsInProgress(element, property) {
    transitionsInProgress = transitionsInProgress.filter(
      (entry) => !(element === entry[0] && property === entry[1])
    );
    transitionCompletionCallbacks.forEach((cb) => cb());
    transitionCompletionCallbacks = [];
    console.log("transitionsInProgress ", transitionsInProgress);
  }
  function nextTransitionCompletion() {
    return new Promise((resolve) => {
      transitionCompletionCallbacks.push(resolve);
    });
  }
}
