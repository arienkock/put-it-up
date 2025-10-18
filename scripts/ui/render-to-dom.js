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
  createRenderer,
  STICKY_TYPE,
  DEFAULT_STICKY_COLOR,
} from "../board-items/sticky.js";
import {
  createRenderer as createConnectorRenderer,
  DEFAULT_ARROW_HEAD,
} from "../board-items/connector.js";
import {
  createRenderer as createImageRenderer,
  IMAGE_TYPE,
} from "../board-items/image.js";
import { setupConnectorEvents } from "../board-items/connector-events.js";
import { Selection } from "./selection.js";
import { SelectionManager } from "./selection-manager.js";
import { createMenu } from "./menu.js";
import { setupKeyboardHandlers } from "./keyboard-handlers.js";
import { zoomScale, applyZoomToBoard } from "./zoom.js";
import { colorPalette } from "./color-management.js";

export { colorPalette };

export function mount(board, root, Observer, store) {
  root.innerHTML =
    '<div class="board-container"><div class="board"></div></div>';
  const boardContainer = root.firstElementChild;
  const domElement = boardContainer.firstElementChild;
  const appState = store.getAppState();
  // Use globally stored UI state
  let stickiesMovedByDragging = appState.ui.stickiesMovedByDragging;
  let imagesMovedByDragging = appState.ui.imagesMovedByDragging || [];
  
  // Create selections first
  const selectedStickies = new Selection(null, "selection", "onStickyChange", store);
  const selectedConnectors = new Selection(null, "connectorSelection", "onConnectorChange", store);
  const selectedImages = new Selection(null, "imageSelection", "onImageChange", store);
  
  // Create selection manager and register all selection types
  const selectionManager = new SelectionManager();
  selectionManager.registerSelection('stickies', selectedStickies);
  selectionManager.registerSelection('connectors', selectedConnectors);
  selectionManager.registerSelection('images', selectedImages);
  
  const renderSticky = createRenderer(
    board,
    domElement,
    selectionManager,
    stickiesMovedByDragging,
    store
  );
  const renderConnector = createConnectorRenderer(
    board,
    domElement,
    getSelectedConnectors
  );
  const renderImage = createImageRenderer(
    board,
    domElement,
    selectionManager,
    imagesMovedByDragging,
    store
  );
  
  // Now create observer with the render functions
  const observer = new Observer(board, render, renderSticky, renderConnector, renderImage);
  board.addObserver(observer);
  
  // Update the selections with the observer
  selectedStickies.observer = observer;
  selectedConnectors.observer = observer;
  selectedImages.observer = observer;
  
  appState.ui.currentColor = appState.ui.currentColor || colorPalette[0];
  appState.ui.currentArrowHead = appState.ui.currentArrowHead || DEFAULT_ARROW_HEAD;
  function getSelectedStickies() {
    return selectedStickies;
  }
  function getSelectedConnectors() {
    return selectedConnectors;
  }
  function getSelectedImages() {
    return selectedImages;
  }
  function renderBoard() {
    if (!board.isReadyForUse()) {
      return;
    }
    appState.ui.boardScale =
      appState.ui.boardScale || zoomScale[zoomScale.length - 1];
    const size = board.getBoardSize();
    applyZoomToBoard(domElement, boardContainer, root, appState.ui.boardScale, size);
    
    if (appState.ui.nextClickCreatesNewSticky) {
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
  const menu = createMenu(board, selectedStickies, selectedConnectors, root, appState, render);
  const renderMenu = menu.render;
  function render() {
    renderBoard();
    renderMenu();
    const state = board.getState();
    Object.entries(state.connectors).forEach(([connectorId, connector]) =>
      renderConnector(connectorId, connector)
    );
    Object.entries(state.stickies).forEach(([stickyId, sticky]) =>
      renderSticky(stickyId, sticky)
    );
    Object.entries(state.images).forEach(([imageId, image]) =>
      renderImage(imageId, image)
    );
  }

  domElement.ondragover = (event) => {
    event.preventDefault();
  };

  domElement.ondrop = (event) => {
    const { pageX: x, pageY: y } = event;
    const { originalLocations, dragStart } = JSON.parse(
      event.dataTransfer.getData(STICKY_TYPE)
    );
    const offset = {
      x: (x - dragStart.x) / appState.ui.boardScale,
      y: (y - dragStart.y) / appState.ui.boardScale,
    };
    Object.keys(originalLocations).forEach((id) => {
      const originalLocation = originalLocations[id];
      const newLocation = {
        x: originalLocation.x + offset.x,
        y: originalLocation.y + offset.y,
      };
      appState.ui.stickiesMovedByDragging.push(id);
      board.moveSticky(id, newLocation);
    });
  };

  // Set up keyboard handlers
  setupKeyboardHandlers(board, selectedStickies, selectedConnectors, selectedImages, appState, {
    onZoomChange: () => render(),
    onColorChange: () => renderMenu(),
    onNewStickyRequest: () => renderBoard(),
    onConnectorRequest: () => renderBoard(),
    onCancelAction: () => renderBoard(),
  });

  // Set up connector events
  const connectorEvents = setupConnectorEvents(domElement, board, selectionManager, render, store);
  
  // Set up paste event handler for images
  document.addEventListener('paste', (event) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            // Get cursor position or center of viewport
            const rect = domElement.getBoundingClientRect();
            const origin = board.getOrigin();
            const boardScale = appState.ui.boardScale || 1;
            
            // Calculate center of viewport in board coordinates
            const viewportCenterX = window.innerWidth / 2;
            const viewportCenterY = window.innerHeight / 2;
            
            // Convert to board coordinates
            const location = {
              x: (viewportCenterX - rect.left) / boardScale + origin.x,
              y: (viewportCenterY - rect.top) / boardScale + origin.y,
            };
            
            const imageData = {
              dataUrl: e.target.result,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
              location: location
            };
            
            const id = board.putImage(imageData);
            selectedImages.replaceSelection(id);
            render();
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  });
  
  domElement.onclick = (event) => {
    if (appState.ui.nextClickCreatesNewSticky) {
      appState.ui.nextClickCreatesNewSticky = false;
      const rect = domElement.getBoundingClientRect();
      const origin = board.getOrigin();
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
      const id = board.putSticky({ color: appState.ui.currentColor, location });
      selectedStickies.replaceSelection(id);
      renderBoard();
      renderMenu();
    } else if (event.target === domElement && !event.shiftKey && !appState.ui.nextClickCreatesConnector) {
      selectionManager.clearAllSelections();
      // Ensure menu reflects empty selection state
      renderMenu();
    }
  };
  // Expose board globally for sticky events to access
  window.board = board;
  window.boardRenderCallback = renderBoard;
  // Expose menu render to allow selection-driven UI updates
  window.menuRenderCallback = renderMenu;
  
  // Function to check if board has any content
  function hasBoardContent() {
    const state = store.getState();
    const hasStickies = Object.keys(state.stickies || {}).length > 0;
    const hasConnectors = Object.keys(state.connectors || {}).length > 0;
    const hasImages = Object.keys(state.images || {}).length > 0;
    return hasStickies || hasConnectors || hasImages;
  }

  // Function to find the top-leftmost content position
  function getTopLeftmostContentPosition() {
    const state = store.getState();
    const appState = store.getAppState();
    const boardScale = appState.ui.boardScale || zoomScale[zoomScale.length - 1];
    const origin = board.getOrigin();
    
    let minX = Infinity;
    let minY = Infinity;
    
    // Check all stickies
    Object.values(state.stickies || {}).forEach(sticky => {
      if (sticky.location) {
        minX = Math.min(minX, sticky.location.x);
        minY = Math.min(minY, sticky.location.y);
      }
    });
    
    // Check all images
    Object.values(state.images || {}).forEach(image => {
      if (image.location) {
        minX = Math.min(minX, image.location.x);
        minY = Math.min(minY, image.location.y);
      }
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
    
    // Calculate the viewport center
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;
    
    // Calculate the scroll position needed to center the target
    const scrollX = targetX - viewportCenterX;
    const scrollY = targetY - viewportCenterY;
    
    // Apply the scroll position
    window.scrollTo({
      left: Math.max(0, scrollX),
      top: Math.max(0, scrollY),
      behavior: 'smooth'
    });
  }
  
  render();
  
  // Center the board scroll position after initial render (skip in test environment)
  if (!window.navigator.userAgent.includes('HeadlessChrome')) {
    requestAnimationFrame(() => {
      centerBoardScroll();
    });
  }
  
  return {
    render,
    observer,
  };
}
