// TODO: Write tests for: tabbing through inputs
// TODO: When tabbing through textareas, adjust selection if the blurred sticky was the only one selected, or there was no selection.
// TODO: Add help texts/instructions
// TODO: Select by dragging box area around items
// TODO: Reimplement drag and drop as custom JS, so you can show a drop-zone, and have the same logic for touch events
// TODO: On mobile the menu isn't really fixed at the top left
// TODO: Stick arbitrary images on the board and resize/reorient them
// TODO: Arrows connecting stickies
// TODO: Add security rules to Firestore
// TODO: Export/import the board data
// TOOD: Store board in web storage when using LocalDatastore
// TODO: Configure Firebase config via UI and remember it in web storage
// TODO: When zooming the approximate area of focus of the board remains in focus after the zoom
// TODO: Web RTC
// TODO: Moving a selection with arrows should move as a unit when hitting baord bounds
// TODO: Moving with arrows the sticky should remain on screen (follow it by scrolling)
// TODO: Fit text content by considering the width of the widest word

/*

Difficult decisions:
 - how and when selection happens
 - are selections a type of more generic grouping concept? i.e. by color, named groups, etc.
 - dimensions of stickies and if there are variations in size
 - how ordering/layering happens, z-index or dom content order
 - where changes to state come from, e.g. store, dragging, clicking, key presses
 - how zooming is implemented: transform, redraw,
 - how click coordinates are translated to board coordinates
 - how moving is going to work on mobile
 - how and when text is resized to fit in the box
 - when changes to dom actually happen and optimize using animation frames
 - how the board size is determined and changes
 - What can be put on the board, general images, arrows?
 - ordering sorting/layers of items


Modules:
 - selection/grouping
 - rendering, batching of changes coming from different sources
 - user actions (hides diff between kb shortcuts and menu items)
 - dragging
 - movement
 - text input
 - geometry
 - sticky interactions

Future changes:
 - Arrows. Board element shouldn't know what is being drawn. The items on the board know how to draw themselves.
   When an item moves an arrow needs to be redrawn. So, something like react where it depends on a prop.
   Can decide whether it needs to be redrawn. How does an arrow/sticky get stored and communicated.
 - Sending cursor info to peers. Comm channel shouldn't know about what is being sent. Support arbitrary data.
 - Infinite board. Board size can be set arbitrarily.
 - Commands. Each menu item is a command. Each command has a keyboard shortcut.
*/

import {
  createRenderer as createConnectorRenderer,
  DEFAULT_ARROW_HEAD,
} from "../board-items/connector.js";
import { setupConnectorEvents } from "../board-items/connector-events.js";
import { Selection } from "./selection.js";
import { SelectionManager } from "./selection-manager.js";
import { createDragManager } from "./drag-manager.js";
import { createMenu } from "./menu.js";
import { setupKeyboardHandlers, completeKeyboardAction } from "./keyboard-handlers.js";
import { zoomScale, applyZoomToBoard } from "./zoom.js";
import { colorPalette } from "./color-management.js";
import { getPlugin, getAllPlugins, getStorageKeyForType } from "../board-items/plugin-registry.js";
import { createMinimap } from "./minimap.js";
import { getAllItemsWithZIndex, getNextZIndex, ensureUniqueZIndices } from "./z-index-manager.js";

export { colorPalette };

// Debug mode - controlled by global window.DEBUG_MODE
// Use a function to check DEBUG_MODE dynamically
const isDebugMode = () => window.DEBUG_MODE || false;

export function mount(board, root, Observer, store) {
  root.innerHTML =
    '<div class="board-scroll-container"><div class="board-container"><div class="board"></div></div></div>';
  const boardScrollContainer = root.firstElementChild;
  const boardContainer = boardScrollContainer.firstElementChild;
  const domElement = boardContainer.firstElementChild;
  const appState = store.getAppState();
  
  // Get all plugins and create selections dynamically
  const plugins = getAllPlugins();
  const selections = {};
  const selectionManager = new SelectionManager();
  
  // Create selections for all plugins
  plugins.forEach(plugin => {
    const type = plugin.getType();
    const selectionType = plugin.getSelectionType();
    const observerMethod = `on${type.charAt(0).toUpperCase() + type.slice(1)}Change`;
    const selection = new Selection(null, selectionType, observerMethod, store);
    selections[type] = selection;
    selections[selectionType] = selection; // Also key by selection type for backward compat
    selectionManager.registerSelection(selectionType, selection);
  });
  
  // Create connector selection (not a plugin)
  const selectedConnectors = new Selection(null, "connectorSelection", "onConnectorChange", store);
  selections['connector'] = selectedConnectors;
  selections['connectors'] = selectedConnectors;
  selectionManager.registerSelection('connectors', selectedConnectors);
  
  // Create renderers for all plugins
  const renderMap = {};
  plugins.forEach(plugin => {
    const type = plugin.getType();
    const selectionType = plugin.getSelectionType();
    const itemsMovedByDragging = appState.ui[`${selectionType}MovedByDragging`] || [];
    
    const renderFn = plugin.createRenderer(
      board,
      domElement,
      selectionManager,
      itemsMovedByDragging,
      store
    );
    renderMap[type] = renderFn;
  });
  
  // Create connector renderer (not a plugin)
  function getSelectedConnectors() {
    return selectedConnectors;
  }
  const renderConnector = createConnectorRenderer(
    board,
    domElement,
    getSelectedConnectors
  );
  renderMap['connector'] = renderConnector;
  
  // Create observer with render function map
  const observer = new Observer(board, render, renderMap);
  board.addObserver(observer);
  
  // Update all selections with the observer
  Object.values(selections).forEach(selection => {
    if (selection && typeof selection === 'object' && 'observer' in selection) {
      selection.observer = observer;
    }
  });
  
  // Migration: Assign z-index values to existing items that don't have them
  const state = store.getState();
  let needsMigration = false;
  let currentZIndex = 1000; // Start from Z_INDEX_MIN
  
  // Migrate all plugin items
  plugins.forEach(plugin => {
    const type = plugin.getType();
    const storageKey = plugin.getSelectionType();
    const items = state[storageKey] || {};
    Object.entries(items).forEach(([id, item]) => {
      if (item.zIndex === undefined) {
        needsMigration = true;
        store.updateBoardItem(type, id, { zIndex: currentZIndex });
        currentZIndex += 10; // Z_INDEX_STEP
      }
    });
  });
  
  // Migrate connectors (not a plugin)
  Object.entries(state.connectors || {}).forEach(([id, connector]) => {
    if (connector.zIndex === undefined) {
      needsMigration = true;
      if (store.updateConnectorZIndex) {
        store.updateConnectorZIndex(id, currentZIndex);
      } else {
        connector.zIndex = currentZIndex;
        store.notifyConnectorChange(id);
      }
      currentZIndex += 10; // Z_INDEX_STEP
    }
  });
  
  // Ensure all z-index values are unique after migration
  if (needsMigration) {
    ensureUniqueZIndices(store);
  }
  
  // Initialize UI defaults
  appState.ui.currentColor = appState.ui.currentColor || colorPalette[0]; // Legacy
  appState.ui.currentConnectorColor = appState.ui.currentConnectorColor || "#000000";
  appState.ui.currentArrowHead = appState.ui.currentArrowHead || DEFAULT_ARROW_HEAD;
  
  // Initialize plugin-specific UI defaults
  plugins.forEach(plugin => {
    const type = plugin.getType();
    const colorKey = `current${type.charAt(0).toUpperCase() + type.slice(1)}Color`;
    if (!appState.ui[colorKey]) {
      appState.ui[colorKey] = plugin.getDefaultColor();
    }
  });
  
  // Helper functions for backward compatibility
  function getSelectedStickies() {
    // Use plugin registry to find sticky plugin and get its selection
    const stickyPlugin = plugins.find(p => p.getType() === 'sticky');
    if (stickyPlugin) {
      const selectionType = stickyPlugin.getSelectionType();
      return selections[stickyPlugin.getType()] || selections[selectionType];
    }
    return null;
  }
  function getSelectedConnectors() {
    return selectedConnectors;
  }
  function getSelectedImages() {
    // Use plugin registry to find image plugin and get its selection
    const imagePlugin = plugins.find(p => p.getType() === 'image');
    if (imagePlugin) {
      const selectionType = imagePlugin.getSelectionType();
      return selections[imagePlugin.getType()] || selections[selectionType];
    }
    return null;
  }
  function renderBoard() {
    if (!board.isReadyForUse()) {
      return;
    }
    appState.ui.boardScale =
      appState.ui.boardScale || zoomScale[zoomScale.length - 1];
    const size = board.getBoardSize();
    applyZoomToBoard(domElement, boardContainer, root, appState.ui.boardScale, size);
    
    // Check if any plugin has creation mode active
    let hasPluginCreationMode = false;
    plugins.forEach(plugin => {
      const creationFlag = plugin.getCreationModeFlag();
      if (creationFlag && appState.ui[creationFlag]) {
        hasPluginCreationMode = true;
      }
    });
    
    if (hasPluginCreationMode) {
      domElement.classList.add("click-to-create");
    } else {
      domElement.classList.remove("click-to-create");
    }
    
    if (appState.ui.nextClickCreatesConnector) {
      domElement.classList.add("click-to-connect");
    } else {
      domElement.classList.remove("click-to-connect");
    }
  }
  const menu = createMenu(board, getSelectedStickies(), selectedConnectors, getSelectedImages(), root, appState, render, store);
  const renderMenu = menu.render;
  
  // Declare minimap variable before render() so it's in scope
  let minimap = null;
  
  // Track Shift pressed state globally to assist selection handlers in environments
  // where synthetic clicks may not carry modifier flags reliably
  if (typeof window !== 'undefined') {
    window.currentShiftPressed = false;
    document.addEventListener('keydown', (e) => { if (e.key === 'Shift') window.currentShiftPressed = true; });
    document.addEventListener('keyup', (e) => { if (e.key === 'Shift') window.currentShiftPressed = false; });
  }
  
  function render() {
    // Track previous scale to detect zoom changes
    const currentScale = appState.ui.boardScale || zoomScale[zoomScale.length - 1];
    // Initialize previous scale on first render if not set
    if (appState.ui.previousBoardScale === undefined) {
      appState.ui.previousBoardScale = currentScale;
    }
    const previousScale = appState.ui.previousBoardScale;
    const scaleChanged = previousScale !== currentScale;
    
    // If zoom changed, capture the center point in board coordinates before applying zoom
    let centerBoardX = null;
    let centerBoardY = null;
    if (scaleChanged && board.isReadyForUse()) {
      const oldScale = previousScale || 1;
      const origin = board.getOrigin();
      const viewportWidth = boardScrollContainer.clientWidth;
      const viewportHeight = boardScrollContainer.clientHeight;
      const scrollLeft = boardScrollContainer.scrollLeft;
      const scrollTop = boardScrollContainer.scrollTop;
      
      // Calculate center of viewport in board coordinates
      centerBoardX = (scrollLeft + viewportWidth / 2) / oldScale + origin.x;
      centerBoardY = (scrollTop + viewportHeight / 2) / oldScale + origin.y;
    }
    
    renderBoard();
    const scaleAfter = appState.ui.boardScale || zoomScale[zoomScale.length - 1];
    
    // Adjust scroll position if zoom changed to keep center point the same
    if (scaleChanged && centerBoardX !== null && centerBoardY !== null && board.isReadyForUse()) {
      const newScale = scaleAfter || 1;
      const origin = board.getOrigin();
      // Re-read viewport dimensions after renderBoard() in case they changed
      const viewportWidth = boardScrollContainer.clientWidth;
      const viewportHeight = boardScrollContainer.clientHeight;
      
      // Calculate new scroll position to keep the same board coordinate at center
      const newScrollLeft = (centerBoardX - origin.x) * newScale - viewportWidth / 2;
      const newScrollTop = (centerBoardY - origin.y) * newScale - viewportHeight / 2;
      
      // Get max scroll to ensure we don't scroll beyond bounds
      const maxScrollLeft = Math.max(0, boardScrollContainer.scrollWidth - viewportWidth);
      const maxScrollTop = Math.max(0, boardScrollContainer.scrollHeight - viewportHeight);
      
      // Apply scroll adjustment instantly, clamped to valid range
      const finalScrollLeft = Math.max(0, Math.min(maxScrollLeft, newScrollLeft));
      const finalScrollTop = Math.max(0, Math.min(maxScrollTop, newScrollTop));
      
      boardScrollContainer.scrollLeft = finalScrollLeft;
      boardScrollContainer.scrollTop = finalScrollTop;
    }
    
    // Update previous scale only if it actually changed (not on every render)
    if (scaleChanged) {
      appState.ui.previousBoardScale = scaleAfter;
    }
    
    // Update minimap if zoom changed (re-render content and viewport)
    if (minimap && scaleChanged) {
      // Call immediately - updateOnZoomChange handles its own timing
      minimap.updateOnZoomChange();
    }
    
    renderMenu();
    const state = board.getState();
    
    // Render connectors (not a plugin)
    Object.entries(state.connectors || {}).forEach(([connectorId, connector]) =>
      renderConnector(connectorId, connector)
    );
    
    // Render all plugin items
    plugins.forEach(plugin => {
      const type = plugin.getType();
      const storageKey = plugin.getSelectionType();
      const renderFn = renderMap[type];
      if (renderFn) {
        Object.entries(state[storageKey] || {}).forEach(([itemId, item]) =>
          renderFn(itemId, item)
        );
      }
    });
  }

  // Custom drag is now handled by individual item state machines
  // No HTML5 drop handlers needed

  // Set up keyboard handlers
  setupKeyboardHandlers(board, getSelectedStickies(), selectedConnectors, getSelectedImages(), appState, {
    onZoomChange: () => render(),
    onColorChange: () => renderMenu(),
    onNewStickyRequest: () => renderBoard(),
    onConnectorRequest: () => renderBoard(),
    onCancelAction: () => renderBoard(),
  });

  // Set up connector events
  const connectorEvents = setupConnectorEvents(domElement, board, selectionManager, render, store);
  
  // Set up drag manager
  const dragManager = createDragManager(domElement, board, selectionManager, store, render);
  window.dragManager = dragManager;
  
  // Set up paste event handler - query plugins for paste handling
  document.addEventListener('paste', (event) => {
    const items = event.clipboardData.items;
    if (!items || items.length === 0) return;
    
    // Get cursor position or center of viewport
    const rect = domElement.getBoundingClientRect();
    const origin = board.getOrigin();
    const boardScale = appState.ui.boardScale || 1;
    
    // Calculate center of scroll container viewport in board coordinates
    const containerRect = boardScrollContainer.getBoundingClientRect();
    const viewportCenterX = containerRect.left + boardScrollContainer.clientWidth / 2;
    const viewportCenterY = containerRect.top + boardScrollContainer.clientHeight / 2;
    
    // Convert to board coordinates
    const location = {
      x: (viewportCenterX - rect.left) / boardScale + origin.x,
      y: (viewportCenterY - rect.top) / boardScale + origin.y,
    };
    
    // Try each plugin to see if it can handle the paste
    for (const plugin of plugins) {
      if (plugin.canHandlePaste(items)) {
        const result = plugin.handlePaste(items, board, location);
        if (result && typeof result.then === 'function') {
          // Promise-based paste handling
          result.then(id => {
            if (id) {
              const selectionType = plugin.getSelectionType();
              const selection = selections[selectionType];
              if (selection) {
                selection.replaceSelection(id);
              }
              render();
            }
          }).catch(err => {
            console.error('Paste handling error:', err);
          });
        } else if (result) {
          // Synchronous paste handling
          const selectionType = plugin.getSelectionType();
          const selection = selections[selectionType];
          if (selection) {
            selection.replaceSelection(result);
          }
          render();
        }
        return; // Only handle with first plugin that can handle it
      }
    }
  });
  
  domElement.onclick = (event) => {
    // Check if any plugin has creation mode active
    let handled = false;
    for (const plugin of plugins) {
      const creationFlag = plugin.getCreationModeFlag();
      if (creationFlag && appState.ui[creationFlag]) {
        appState.ui[creationFlag] = false;
        const rect = domElement.getBoundingClientRect();
        const origin = board.getOrigin();
        const type = plugin.getType();
        const colorKey = `current${type.charAt(0).toUpperCase() + type.slice(1)}Color`;
        const defaultColor = appState.ui[colorKey] || plugin.getDefaultColor();
        
        const location = {
          x:
            (event.clientX - rect.left - 50 * appState.ui.boardScale) /
              appState.ui.boardScale +
            origin.x,
          y:
            (event.clientY - rect.top - 50 * appState.ui.boardScale) /
              appState.ui.boardScale +
            origin.y,
        };
        
        // Create item with plugin-specific defaults
        const itemData = { location };
        // Check if plugin supports color property (sticky does, image doesn't)
        // Use plugin's default color if available
        if (plugin.getColorPalette && plugin.getColorPalette().length > 0) {
          itemData.color = defaultColor;
        }
        
        const id = board.putBoardItem(type, itemData);
        const selectionType = plugin.getSelectionType();
        const selection = selections[selectionType];
        if (selection) {
          selection.replaceSelection(id);
        }
        renderBoard();
        renderMenu();
        
        // Notify keyboard handler that creation is complete
        completeKeyboardAction(`${type} created`, appState);
        handled = true;
        break;
      }
    }
    
    if (handled) {
      return;
    } else if (appState.ui.nextClickCreatesConnector) {
      // Let connector events handle this - don't interfere
      return;
    } else if (event.target === domElement && !event.shiftKey) {
      // Don't clear selection if we just completed a drag
      if (window.dragManager && window.dragManager.justCompletedDrag) {
        return;
      }
      selectionManager.clearAllSelections();
      // Ensure menu reflects empty selection state
      renderMenu();
    }
  };
  // Prevent native text selection on non-textarea elements
  document.addEventListener('selectstart', (event) => {
    // Check if the target is a textarea or its ancestor
    const target = event.target;
    const isTextarea = target.tagName === 'TEXTAREA' || target.closest('textarea');
    // Allow selection inside contentEditable areas (e.g., board title)
    const isContentEditable = target.isContentEditable || target.closest('[contenteditable="true"]');
    
    // If not a textarea, prevent native selection
    if (!isTextarea && !isContentEditable) {
      event.preventDefault();
    }
  });
  
  // Also prevent selection via mousedown on shift-click for images
  document.addEventListener('mousedown', (event) => {
    if (event.shiftKey) {
      const target = event.target;
      const isTextarea = target.tagName === 'TEXTAREA' || target.closest('textarea');
      
      // If clicking on a plugin item or non-textarea element with shift, prevent selection
      if (!isTextarea) {
        // Check if target is a plugin container
        const isPluginContainer = plugins.some(plugin => {
          const baseClass = plugin.getContainerBaseClass();
          return target.closest(`.${baseClass}`);
        });
        if (target.tagName === 'IMG' || isPluginContainer) {
          event.preventDefault();
        }
      }
    }
  }, true); // Use capture phase to catch before other handlers
  
  // Expose board globally for sticky events to access
  window.board = board;
  window.boardRenderCallback = renderBoard;
  // Expose menu render to allow selection-driven UI updates
  window.menuRenderCallback = renderMenu;
  
  // Function to check if board has any content
  function hasBoardContent() {
    const state = store.getState();
    // Check if any plugin items exist
    let hasPluginItems = false;
    plugins.forEach(plugin => {
      const storageKey = plugin.getSelectionType();
      if (Object.keys(state[storageKey] || {}).length > 0) {
        hasPluginItems = true;
      }
    });
    const hasConnectors = Object.keys(state.connectors || {}).length > 0;
    return hasPluginItems || hasConnectors;
  }

  // Function to find the top-leftmost content position
  function getTopLeftmostContentPosition() {
    const state = store.getState();
    const appState = store.getAppState();
    const boardScale = appState.ui.boardScale || zoomScale[zoomScale.length - 1];
    const origin = board.getOrigin();
    
    let minX = Infinity;
    let minY = Infinity;
    
    // Check all plugin items
    plugins.forEach(plugin => {
      const storageKey = plugin.getSelectionType();
      Object.values(state[storageKey] || {}).forEach(item => {
        if (item.location) {
          minX = Math.min(minX, item.location.x);
          minY = Math.min(minY, item.location.y);
        }
      });
    });
    
    // Check all connectors (they might have standalone points)
    Object.values(state.connectors || {}).forEach(connector => {
      if (connector.originPoint) {
        minX = Math.min(minX, connector.originPoint.x);
        minY = Math.min(minY, connector.originPoint.y);
      }
      if (connector.destinationPoint) {
        minX = Math.min(minX, connector.destinationPoint.x);
        minY = Math.min(minY, connector.destinationPoint.y);
      }
    });
    
    // Convert to pixel coordinates and adjust for origin
    const pixelX = (minX - origin.x) * boardScale;
    const pixelY = (minY - origin.y) * boardScale;
    
    return { x: pixelX, y: pixelY };
  }

  // Function to center the board scroll position or focus on content
  function centerBoardScroll() {
    if (!board.isReadyForUse()) {
      return;
    }
    
    // Check if browser has already restored scroll position (e.g., on refresh)
    // If scrollLeft or scrollTop is non-zero, the browser has restored scroll position,
    // so we should NOT perform our automatic scrolling
    if (boardScrollContainer.scrollLeft !== 0 || boardScrollContainer.scrollTop !== 0) {
      return;
    }
    
    const appState = store.getAppState();
    const boardScale = appState.ui.boardScale || zoomScale[zoomScale.length - 1];
    
    let targetX, targetY;
    
    if (hasBoardContent()) {
      // Focus on top-leftmost content
      const contentPos = getTopLeftmostContentPosition();
      targetX = contentPos.x;
      targetY = contentPos.y;
    } else {
      // Center the board when no content
      const size = board.getBoardSize();
      targetX = (size.width * boardScale) / 2;
      targetY = (size.height * boardScale) / 2;
    }
    
    // Calculate the container's viewport center
    const viewportCenterX = boardScrollContainer.clientWidth / 2;
    const viewportCenterY = boardScrollContainer.clientHeight / 2;
    
    // Calculate the scroll position needed to center the target
    const scrollX = targetX - viewportCenterX;
    const scrollY = targetY - viewportCenterY;
    
    // Apply the scroll position instantly (not smooth)
    boardScrollContainer.scrollLeft = Math.max(0, scrollX);
    boardScrollContainer.scrollTop = Math.max(0, scrollY);
  }
  
  render();
  
  // Center the board scroll position after initial render (skip in test environment)
  if (!window.navigator.userAgent.includes('HeadlessChrome')) {
    requestAnimationFrame(() => {
      centerBoardScroll();
    });
  }
  
  // Create minimap (pass board DOM element for cloning)
  minimap = createMinimap(board, boardScrollContainer, domElement, store, render);
  
  return {
    render,
    observer,
    minimap,
  };
}
