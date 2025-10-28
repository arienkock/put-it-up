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
import { createDragManager } from "./drag-manager.js";
import { createMenu } from "./menu.js";
import { setupKeyboardHandlers, completeKeyboardAction } from "./keyboard-handlers.js";
import { zoomScale, applyZoomToBoard } from "./zoom.js";
import { colorPalette } from "./color-management.js";

export { colorPalette };

// Debug mode - controlled by global window.DEBUG_MODE
// Use a function to check DEBUG_MODE dynamically
const isDebugMode = () => window.DEBUG_MODE || false;

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
  
  appState.ui.currentColor = appState.ui.currentColor || colorPalette[0]; // Legacy
  appState.ui.currentStickyColor = appState.ui.currentStickyColor || colorPalette[0];
  appState.ui.currentConnectorColor = appState.ui.currentConnectorColor || "#000000";
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
  const menu = createMenu(board, selectedStickies, selectedConnectors, selectedImages, root, appState, render);
  const renderMenu = menu.render;
  
  // Make menu immune to browser zoom by detecting devicePixelRatio changes
  let lastDevicePixelRatio = window.devicePixelRatio;
  
  // Store the native DPR in localStorage
  // IMPORTANT: The first time you load this page, make sure browser zoom is at 100% (Ctrl+0)
  const NATIVE_DPR_KEY = 'putitup_native_dpr';
  
  function getNativeDevicePixelRatio() {
    // Check if we have a stored native DPR
    const stored = localStorage.getItem(NATIVE_DPR_KEY);
    if (stored) {
      const nativeDpr = parseFloat(stored);
      if (isDebugMode()) {
        console.log(`Using stored native DPR: ${nativeDpr}`);
      }
      return nativeDpr;
    }
    
    // First time: store current DPR as native
    // User should have browser at 100% zoom when first loading
    const dpr = window.devicePixelRatio;
    localStorage.setItem(NATIVE_DPR_KEY, dpr.toString());
    if (isDebugMode()) {
      console.log(`First load - stored native DPR: ${dpr}. If menu appears wrong size, press Ctrl+0 to reset zoom, clear browser cache, and reload.`);
    }
    
    return dpr;
  }
  
  const nativeDevicePixelRatio = getNativeDevicePixelRatio();
  
  function makeMenuZoomImmune() {
    const menuContainer = root.querySelector('.menu-container');
    if (!menuContainer) {
      setTimeout(makeMenuZoomImmune, 100);
      return;
    }
    
    // Calculate zoom level relative to native DPR
    // zoomLevel = current DPR / native DPR
    const zoomLevel = window.devicePixelRatio / nativeDevicePixelRatio;
    
    if (isDebugMode()) {
      console.log(`devicePixelRatio: ${window.devicePixelRatio}, native: ${nativeDevicePixelRatio}, zoom: ${(zoomLevel * 100).toFixed(0)}%`);
    }
    
    // Only apply counter-scaling if zoom is different from 100%
    if (Math.abs(zoomLevel - 1) > 0.01) {
      const scale = 1 / zoomLevel;
      menuContainer.style.transform = `scale(${scale})`;
      menuContainer.style.transformOrigin = 'top left';
      // Compensate width and positioning
      menuContainer.style.width = `${zoomLevel * 100}%`;
    } else {
      // At 100% zoom, remove any transforms
      menuContainer.style.transform = '';
      menuContainer.style.width = '100%';
    }
    
    lastDevicePixelRatio = window.devicePixelRatio;
  }
  
  // Monitor for devicePixelRatio changes (indicates zoom)
  function monitorZoom() {
    if (window.devicePixelRatio !== lastDevicePixelRatio) {
      makeMenuZoomImmune();
    }
    requestAnimationFrame(monitorZoom);
  }
  
  // Apply immediately
  makeMenuZoomImmune();
  // Start monitoring
  monitorZoom();
  // Also listen to resize as backup
  window.addEventListener('resize', makeMenuZoomImmune);
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

  // Custom drag is now handled by individual item state machines
  // No HTML5 drop handlers needed

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
  
  // Set up drag manager
  const dragManager = createDragManager(domElement, board, selectionManager, store, render);
  window.dragManager = dragManager;
  
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
      const id = board.putSticky({ color: appState.ui.currentStickyColor, location });
      selectedStickies.replaceSelection(id);
      renderBoard();
      renderMenu();
      
      // Notify keyboard handler that sticky creation is complete
      completeKeyboardAction('sticky created', appState);
    } else if (appState.ui.nextClickCreatesConnector) {
      // Let connector events handle this - don't interfere
      return;
    } else if (event.target === domElement && !event.shiftKey) {
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
    
    // If not a textarea, prevent native selection
    if (!isTextarea) {
      event.preventDefault();
    }
  });
  
  // Also prevent selection via mousedown on shift-click for images
  document.addEventListener('mousedown', (event) => {
    if (event.shiftKey) {
      const target = event.target;
      const isTextarea = target.tagName === 'TEXTAREA' || target.closest('textarea');
      
      // If clicking on an image or non-textarea element with shift, prevent selection
      if (!isTextarea && (target.tagName === 'IMG' || target.closest('.sticky-container') || target.closest('.image-container'))) {
        event.preventDefault();
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
    
    // Check if browser has already restored scroll position (e.g., on refresh)
    // If scrollX or scrollY is non-zero, the browser has restored scroll position,
    // so we should NOT perform our automatic scrolling
    if (window.scrollX !== 0 || window.scrollY !== 0) {
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
    
    // Apply the scroll position instantly (not smooth)
    window.scrollTo({
      left: Math.max(0, scrollX),
      top: Math.max(0, scrollY),
      behavior: 'auto'
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
