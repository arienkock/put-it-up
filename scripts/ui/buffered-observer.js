export function BufferedObserver(board, render, renderSticky) {
  let isRunScheduled = false;
  const tasks = [];
  let tasksScheduledCount = 0;
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
  }

  function scheduleRenderTask(task) {
    if (!isRunScheduled) {
      requestAnimationFrame(doRun);
      isRunScheduled = true;
    }
    tasks.push(task);
    tasksScheduledCount++;
  }

  this.numTasks = () => tasks.length;

  this.onStickyChange = (id) => {
    scheduleRenderTask(() => renderSticky(id, board.getStickySafe(id)));
  };
  this.onBoardChange = () => {
    scheduleRenderTask(() => render());
  };
  this.tasksScheduledCount = () => tasksScheduledCount;
}
