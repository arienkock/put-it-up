export function BufferedObserver(board, render, renderSticky) {
  let isRunScheduled = false;
  const tasks = [];
  const scheduleCallbacks = [];
  const runCallbacks = [];
  function doRun() {
    let timeElapsed = 0;
    while (tasks.length && timeElapsed < 14) {
      const task = tasks.shift();
      let start = Date.now();
      task();
      timeElapsed += Date.now() - start;
    }
    if (tasks.length) {
      requestAnimationFrame(doRun);
    } else {
      isRunScheduled = false;
    }
    invokeRunCallbacks();
  }
  function scheduleRenderTask(task) {
    if (!isRunScheduled) {
      requestAnimationFrame(doRun);
      isRunScheduled = true;
    }
    tasks.push(task);
    invokeScheduleCallbacks();
  }

  this.numTasks = () => tasks.length;

  this.onStickyChange = (id) => {
    scheduleRenderTask(() => renderSticky(id, board.getSticky(id)));
  };
  this.onBoardChange = () => {
    scheduleRenderTask(() => render());
  };

  function invokeScheduleCallbacks() {
    scheduleCallbacks.forEach((cb) => cb());
    scheduleCallbacks.length = 0;
  }
  function invokeRunCallbacks() {
    runCallbacks.forEach((cb) => cb());
    runCallbacks.length = 0;
  }
  this.addScheduleCallback = (callback) => {
    scheduleCallbacks.push(callback);
  };
  this.addRunCallback = (callback) => {
    runCallbacks.push(callback);
  };
}
