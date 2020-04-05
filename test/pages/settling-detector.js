import { BufferedObserver } from "../../scripts/buffered-observer.js";

// wait for onerror, the animation task list to be empty, in case network-datastore: all local events have been passed to observers
export function installSettlingDetector(observer) {
  if (!observer instanceof BufferedObserver) {
    throw new Error(
      "Settling detector only works with observer of type BufferedObserver"
    );
  }
  window.watchForSettle = () => {
    window.settlingPromise = (async () => {
      if (!hasRunningTasks()) {
        await newTask();
      }
      const newError = watchForNewError();
      while (hasRunningTasks()) {
        await Promise.race([nextTaskRun(), newError]);
      }
    })();

    function hasRunningTasks() {
      return observer.numTasks() > 0;
    }
    function newTask() {
      return new Promise((resolve, reject) => {
        observer.addScheduleCallback(resolve);
        console.log("I'm interested");
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
}
