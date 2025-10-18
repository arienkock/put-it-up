export function BufferedObserver(board, render, renderSticky, renderConnector, renderImage) {
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
    scheduleRenderTask(() => {
      renderSticky(id, board.getStickySafe(id));
      // Re-render all connectors connected to this sticky
      const state = board.getState();
      Object.entries(state.connectors).forEach(([connectorId, connector]) => {
        if (connector.originId == id || connector.destinationId == id) {
          renderConnector(connectorId, connector);
        }
      });
    });
  };
  this.onConnectorChange = (id) => {
    scheduleRenderTask(() => renderConnector(id, board.getConnectorSafe(id)));
  };
  this.onImageChange = (id) => {
    scheduleRenderTask(() => {
      renderImage(id, board.getImageSafe(id));
      // Re-render all connectors connected to this image
      const state = board.getState();
      Object.entries(state.connectors).forEach(([connectorId, connector]) => {
        if (connector.originImageId == id || connector.destinationImageId == id) {
          renderConnector(connectorId, connector);
        }
      });
    });
  };
  this.onBoardChange = () => {
    scheduleRenderTask(() => render());
  };
  this.tasksScheduledCount = () => tasksScheduledCount;
}
