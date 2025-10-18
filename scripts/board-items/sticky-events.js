import { fitContentInSticky } from "./text-fitting.js";
import { STICKY_TYPE } from "./sticky.js";
import { SelectionManager } from "../ui/selection-manager.js";

/**
 * Sets up all event handlers for a sticky note
 * 
 * @param {HTMLElement} container - The sticky container element
 * @param {string} id - Sticky ID
 * @param {Function} updateTextById - Function to update sticky text
 * @param {Function} getStickyLocation - Function to get sticky location
 * @param {SelectionManager} selectionManager - Selection manager instance
 * @param {Object} store - Store instance for state access
 * @returns {Object} Object with cleanup functions if needed
 */
export function setupStickyEvents(
  container,
  id,
  updateTextById,
  getStickyLocation,
  selectionManager,
  store
) {
  const appState = store.getAppState();
  // Drag start event
  container.ondragstart = (event) => {
    // Don't start sticky drag if we're in connector creation mode
    if (appState.ui.nextClickCreatesConnector) {
      event.preventDefault();
      return;
    }
    
    const { pageX: x, pageY: y } = event;
    let originalLocations = {};
    
    const selectedStickies = selectionManager.getSelection('stickies');
    if (selectedStickies && selectedStickies.isSelected(id)) {
      selectedStickies.forEach((sid) => {
        originalLocations[sid] = getStickyLocation(sid);
      });
    } else {
      originalLocations[id] = getStickyLocation(id);
    }
    
    event.dataTransfer.setData(
      STICKY_TYPE,
      JSON.stringify({ originalLocations, dragStart: { x, y } })
    );
    moveToFront();
  };

  // Editable state management
  function setEditable(enabled) {
    if (enabled) {
      container.classList.add("editing");
      container.inputElement.focus();
    } else {
      container.classList.remove("editing");
      container.inputElement.blur();
    }
  }

  // Input element events
  container.inputElement.onblur = () => setEditable(false);
  
  container.inputElement.onfocus = () => {
    setEditable(true);
    moveToFront();
  };
  
  container.inputElement.onkeydown = (event) => {
    // Don't stop propagation for Delete key so it reaches the global handler
    if (event.key !== "Delete") {
      event.stopPropagation();
    }
    if (event.key === "Escape") {
      setEditable(false);
    }
  };
  
  container.inputElement.onkeyup = (event) => {
    event.stopPropagation();
    if (event.keyCode === 13) {
      setEditable(false);
    }
  };
  
  container.inputElement.onclick = (event) => {
    if (event.shiftKey) {
      event.preventDefault();
    }
  };

  // Move sticky to front (z-index)
  function moveToFront() {
    [...container.parentNode.children].forEach((el) => {
      if (el === container) {
        el.style.zIndex = "1";
      } else {
        el.style.zIndex = "unset";
      }
    });
  }

  // Input event for text updates
  container.inputElement.addEventListener("input", () => {
    moveToFront();
    container.inputElement.value = updateTextById(
      id,
      container.inputElement.value
    );
    fitContentInSticky(container.sticky, container.inputElement);
  });

  // Sticky click event for selection
  container.sticky.onclick = (event) => {
    // Don't handle sticky selection if we're in connector creation mode
    if (appState.ui.nextClickCreatesConnector) {
      return;
    }
    
    moveToFront();
    
    // Use selection manager to handle cross-type selection clearing
    selectionManager.selectItem('stickies', id, {
      addToSelection: event.shiftKey
    });
    
    // Only exit editing mode if not clicking on the textarea
    if (!event.shiftKey && event.target !== container.inputElement) {
      setEditable(false);
    }
    
    if (window.menuRenderCallback) {
      window.menuRenderCallback();
    }
  };

  // Initial state
  moveToFront();

  // Setup resize handle events
  setupResizeHandles(container, id, store);

  return {
    // Could add cleanup functions here if needed
  };
}

/**
 * Sets up resize handle event handlers for a sticky
 * 
 * @param {HTMLElement} container - The sticky container element
 * @param {string} id - Sticky ID
 * @param {Object} store - Store instance for state access
 */
function setupResizeHandles(container, id, store) {
  const STICKY_SIZE = 100; // pixels per size unit
  let isResizing = false;
  let resizeData = null;

  // Get all resize handles
  const handles = {
    top: container.querySelector('.resize-handle-top'),
    right: container.querySelector('.resize-handle-right'),
    bottom: container.querySelector('.resize-handle-bottom'),
    left: container.querySelector('.resize-handle-left')
  };

  // Add mousedown event to each handle
  Object.entries(handles).forEach(([side, handle]) => {
    if (!handle) return;

    handle.addEventListener('mousedown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      const sticky = store.getSticky(id);
      if (!sticky) return;

      const currentSize = {
        x: (sticky.size && sticky.size.x) || 1,
        y: (sticky.size && sticky.size.y) || 1
      };

      const currentLocation = {
        x: sticky.location.x,
        y: sticky.location.y
      };

      resizeData = {
        side,
        startX: event.pageX,
        startY: event.pageY,
        startSize: { ...currentSize },
        startLocation: { ...currentLocation },
        currentSize: { ...currentSize },
        currentLocation: { ...currentLocation }
      };

      isResizing = true;
      document.body.style.cursor = getCursorForSide(side);
      
      // Prevent text selection during resize
      document.body.style.userSelect = 'none';
    });
  });

  // Global mouse move handler for resize
  document.addEventListener('mousemove', (event) => {
    if (!isResizing || !resizeData) return;

    event.preventDefault();
    
    const deltaX = event.pageX - resizeData.startX;
    const deltaY = event.pageY - resizeData.startY;
    
    // Calculate new size based on which side is being dragged
    let newSize = { ...resizeData.startSize };
    let newLocation = { ...resizeData.startLocation };
    
    switch (resizeData.side) {
      case 'right':
        newSize.x = Math.max(1, resizeData.startSize.x + deltaX / STICKY_SIZE);
        break;
      case 'left':
        newSize.x = Math.max(1, resizeData.startSize.x - deltaX / STICKY_SIZE);
        newLocation.x = resizeData.startLocation.x + (resizeData.startSize.x - newSize.x) * STICKY_SIZE;
        break;
      case 'bottom':
        newSize.y = Math.max(1, resizeData.startSize.y + deltaY / STICKY_SIZE);
        break;
      case 'top':
        newSize.y = Math.max(1, resizeData.startSize.y - deltaY / STICKY_SIZE);
        newLocation.y = resizeData.startLocation.y + (resizeData.startSize.y - newSize.y) * STICKY_SIZE;
        break;
    }

    // Update DOM for live preview
    const widthPx = newSize.x * STICKY_SIZE;
    const heightPx = newSize.y * STICKY_SIZE;
    container.style.width = widthPx + 'px';
    container.style.height = heightPx + 'px';
    
    // Update position for left/top resizing
    if (resizeData.side === 'left' || resizeData.side === 'top') {
      const appState = store.getAppState();
      const origin = appState.board.origin;
      container.style.left = (newLocation.x - origin.x) + 'px';
      container.style.top = (newLocation.y - origin.y) + 'px';
    }

    resizeData.currentSize = newSize;
    resizeData.currentLocation = newLocation;
  });

  // Global mouse up handler for resize
  document.addEventListener('mouseup', (event) => {
    if (!isResizing || !resizeData) return;

    isResizing = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    // Apply the final size to the store
    const finalSize = {
      x: Math.max(1, Math.round(resizeData.currentSize.x)),
      y: Math.max(1, Math.round(resizeData.currentSize.y))
    };
    
    // Recalculate location for left/top resizing to ensure proper snapping
    let finalLocation = { ...resizeData.currentLocation };
    if (resizeData.side === 'left') {
      finalLocation.x = resizeData.startLocation.x + (resizeData.startSize.x - finalSize.x) * STICKY_SIZE;
    }
    if (resizeData.side === 'top') {
      finalLocation.y = resizeData.startLocation.y + (resizeData.startSize.y - finalSize.y) * STICKY_SIZE;
    }
    
    store.updateSize(id, finalSize);
    store.setLocation(id, finalLocation);
    
    resizeData = null;
  });

  // Prevent handle clicks from triggering sticky selection
  Object.values(handles).forEach(handle => {
    if (!handle) return;
    handle.addEventListener('click', (event) => {
      event.stopPropagation();
    });
  });
}

/**
 * Returns the appropriate cursor for the given resize side
 * @param {string} side - The resize side ('top', 'right', 'bottom', 'left')
 * @returns {string} CSS cursor value
 */
function getCursorForSide(side) {
  switch (side) {
    case 'top':
    case 'bottom':
      return 'ns-resize';
    case 'left':
    case 'right':
      return 'ew-resize';
    default:
      return 'default';
  }
}
