import { getAllPlugins } from '../board-items/plugin-registry.js';

/**
 * BufferedObserver accepts a map of render functions keyed by type.
 * For backward compatibility, it also accepts individual render functions.
 * @param {Object} board - Board instance
 * @param {Function} render - Main render function
 * @param {Object|Function} renderFunctions - Map of {type: renderFn} or individual renderSticky function (for backward compat)
 * @param {Function} [renderConnector] - Connector render function (for backward compat)
 * @param {Function} [renderImage] - Image render function (for backward compat)
 */
export function BufferedObserver(board, render, renderFunctions, renderConnector, renderImage) {
  let isRunScheduled = false;
  const tasks = [];
  let tasksScheduledCount = 0;
  
  // Determine if we're using new map-based API or old individual function API
  const isMapBased = renderFunctions && typeof renderFunctions === 'object' && !(renderFunctions instanceof Function);
  const renderMap = isMapBased ? renderFunctions : {};
  
  // For backward compatibility, extract individual functions if provided
  if (!isMapBased && renderFunctions) {
    // Old API: renderFunctions is actually renderSticky
    renderMap['sticky'] = renderFunctions;
    if (renderImage) renderMap['image'] = renderImage;
  }
  if (renderConnector) renderMap['connector'] = renderConnector;
  
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

  // Generic handler for plugin-based items
  const handlePluginItemChange = (type, id) => {
    const renderFn = renderMap[type];
    if (!renderFn) return;
    
    scheduleRenderTask(() => {
      try {
        const item = board.getBoardItemByType(type, id);
        renderFn(id, item);
      } catch (e) {
        renderFn(id, undefined);
      }
      // Re-render all connectors connected to this item
      const state = board.getState();
      const plugins = getAllPlugins();
      Object.entries(state.connectors).forEach(([connectorId, connector]) => {
        for (const plugin of plugins) {
          if (plugin.isConnectorConnectedToItem(connector, id)) {
            const connectorRenderFn = renderMap['connector'];
            if (connectorRenderFn) {
              connectorRenderFn(connectorId, connector);
            }
            break;
          }
        }
      });
    });
  };

  // Backward compatibility: individual type handlers
  this.onStickyChange = (id) => handlePluginItemChange('sticky', id);
  this.onImageChange = (id) => handlePluginItemChange('image', id);
  
  this.onConnectorChange = (id) => {
    const renderFn = renderMap['connector'];
    if (renderFn) {
      scheduleRenderTask(() => renderFn(id, board.getConnectorSafe(id)));
    }
  };
  
  // Generic observer pattern - routes to appropriate handler
  this.onBoardItemChange = (type, id) => {
    if (type === 'connector') {
      this.onConnectorChange(id);
    } else {
      handlePluginItemChange(type, id);
    }
  };
  
  this.onBoardChange = () => {
    scheduleRenderTask(() => render());
  };
  this.tasksScheduledCount = () => tasksScheduledCount;
}
