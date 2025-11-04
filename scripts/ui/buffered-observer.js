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
      try {
        const sticky = board.getBoardItemByType('sticky', id);
        renderSticky(id, sticky);
      } catch (e) {
        renderSticky(id, undefined);
      }
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
      try {
        const image = board.getBoardItemByType('image', id);
        renderImage(id, image);
      } catch (e) {
        renderImage(id, undefined);
      }
      // Re-render all connectors connected to this image
      const state = board.getState();
      Object.entries(state.connectors).forEach(([connectorId, connector]) => {
        if (connector.originImageId == id || connector.destinationImageId == id) {
          renderConnector(connectorId, connector);
        }
      });
    });
  };
  // Support generic observer pattern
  this.onBoardItemChange = (type, id) => {
    if (type === 'sticky') {
      this.onStickyChange(id);
    } else if (type === 'image') {
      this.onImageChange(id);
    }
  };
  this.onBoardChange = () => {
    scheduleRenderTask(() => render());
  };
  this.tasksScheduledCount = () => tasksScheduledCount;
}
