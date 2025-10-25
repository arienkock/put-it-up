// Image Events Refactored Implementation
// Based on the refactoring plan to eliminate scattered boolean flags and improve maintainability

import { moveItemFromOriginal, calculateMovementDelta } from "../ui/movement-utils.js";

// Centralized state machine
const ImageState = {
  IDLE: 'idle',
  DRAGGING: 'dragging',
  RESIZING: 'resizing'
};

// Global listener management - simpler approach
let activeListeners = new Map(); // type -> handler

function setListeners(listenerMap) {
  clearAllListeners();
  
  Object.entries(listenerMap).forEach(([eventType, handler]) => {
    document.addEventListener(eventType, handler);
    activeListeners.set(eventType, handler);
  });
}

function clearAllListeners() {
  activeListeners.forEach((handler, eventType) => {
    document.removeEventListener(eventType, handler);
  });
  activeListeners.clear();
}

// Debug mode - controlled by global window.DEBUG_MODE
// Use a function to check DEBUG_MODE dynamically
const isDebugMode = () => window.DEBUG_MODE || false;

// Global state and data
let currentState = ImageState.IDLE;
let stateData = {
  imageId: null,
  dragStart: null,
  originalLocations: {},
  resizeSide: null,
  originalSize: null,
  aspectRatio: null,
  resizeStart: null
};

// No longer needed - using direct functions

// Helper function to extract resize side from class name
function extractResizeSide(handle) {
  if (!handle) return null;
  
  const classNames = handle.className.split(' ');
  for (const className of classNames) {
    if (className.startsWith('resize-handle-')) {
      return className.replace('resize-handle-', '');
    }
  }
  return null;
}

// Helper function to get cursor for resize side
function getCursorForResizeSide(resizeSide) {
  switch (resizeSide) {
    case 'left':
    case 'right':
      return 'ew-resize';
    case 'top':
    case 'bottom':
      return 'ns-resize';
    default:
      return 'default';
  }
}

// Explicit state transitions with logging
function transitionState(newState, reason, data = {}) {
  const oldState = currentState;
  
  if (isDebugMode()) {
    console.log(`[ImageState] ${oldState} → ${newState}`, {
      reason,
      data,
      timestamp: Date.now()
    });
  }
  
  // Clean up old state
  switch (oldState) {
    case ImageState.DRAGGING:
      clearAllListeners();
      document.body.style.cursor = '';
      break;
    case ImageState.RESIZING:
      clearAllListeners();
      document.body.style.cursor = '';
      break;
  }
  
  currentState = newState;
  
  // Set up new state
  switch (newState) {
    case ImageState.IDLE:
      stateData = {
        imageId: null,
        dragStart: null,
        originalLocations: {},
        resizeSide: null,
        originalSize: null,
        aspectRatio: null,
        resizeStart: null
      };
      break;
    case ImageState.DRAGGING:
      document.body.style.cursor = "grabbing";
      setListeners({
        'mousemove': handleImageDrag,
        'mouseup': handleImageDragEnd
      });
      break;
    case ImageState.RESIZING:
      document.body.style.cursor = getCursorForResizeSide(stateData.resizeSide);
      setListeners({
        'mousemove': handleImageResize,
        'mouseup': handleImageResizeEnd
      });
      break;
  }
}

// Event handling wrapper with debug logging
function handleEvent(eventName, event, handlerFn) {
  if (isDebugMode()) {
    console.log(`[ImageEvent] ${eventName} in ${currentState}`, {
      target: event.target?.className || 'unknown',
      handler: handlerFn.name,
      stateData: { ...stateData }
    });
  }
  
  try {
    return handlerFn(event, stateData);
  } catch (error) {
    console.error(`[ImageError] in ${handlerFn.name}:`, error);
    // Reset to safe state
    transitionState(ImageState.IDLE, 'error recovery');
    throw error;
  }
}

// Handler factory functions to create handlers with proper scope
function createResizeHandler(id, getImageLocation, selectionManager, store) {
  return {
    canHandle: (event, state, appState) => {
      const handle = event.target?.closest?.('.resize-handle');
      return state === ImageState.IDLE && 
             handle !== null &&
             !appState.ui.nextClickCreatesConnector;
    },
    
    onMouseDown: (event, stateData) => {
      const handle = event.target.closest('.resize-handle');
      const resizeSide = extractResizeSide(handle);
      
      if (!resizeSide) {
        console.error('Could not determine resize side from class name:', handle.className);
        return;
      }
      
      event.preventDefault();
      event.stopPropagation();
      
      stateData.imageId = id;
      stateData.resizeSide = resizeSide;
      stateData.resizeStart = { x: event.clientX, y: event.clientY };
      
      // Guard against missing image id
      let image;
      try {
        image = store.getImage(id);
      } catch (e) {
        console.warn('[ImageWarning] Missing image on resize start, aborting', { id, error: e?.message });
        return;
      }
      stateData.originalSize = { width: image.width, height: image.height };
      stateData.aspectRatio = image.naturalWidth / image.naturalHeight;
      
      transitionState(ImageState.RESIZING, 'resize started');
    }
  };
}

function createDragHandler(id, getImageLocation, selectionManager, store) {
  return {
    canHandle: (event, state, appState) => {
      const handle = event.target?.closest?.('.resize-handle');
      return state === ImageState.IDLE && 
             handle === null &&
             !appState.ui.nextClickCreatesConnector;
    },
    
    onMouseDown: (event, stateData) => {
      // Store drag start info but don't prevent events yet
      // Let click events fire normally for selection
      
      stateData.imageId = id;
      stateData.dragStart = { x: event.clientX, y: event.clientY };
      
      // Check if this image is part of a multi-selection
      const selectedImages = selectionManager.getSelection('images');
      if (selectedImages && selectedImages.isSelected(id)) {
        // Multi-selection: store all selected image locations
        stateData.originalLocations = {};
        selectedImages.forEach((imageId) => {
          try {
            stateData.originalLocations[imageId] = getImageLocation(imageId);
          } catch (e) {
            console.warn('[ImageWarning] Missing image location', { imageId, error: e?.message });
          }
        });
        // Don't clear selection - preserve it for multi-drag
      } else {
        // Single image: store only this image location
        stateData.originalLocations = {};
        try {
          stateData.originalLocations[id] = getImageLocation(id);
        } catch (e) {
          console.warn('[ImageWarning] Missing image on drag start, aborting', { id, error: e?.message });
          return;
        }
      }
      
      // Set up mousemove listener to detect actual drag
      const handleMouseMove = (moveEvent) => {
        const dx = moveEvent.clientX - stateData.dragStart.x;
        const dy = moveEvent.clientY - stateData.dragStart.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If mouse moved more than 5 pixels, start drag
        if (distance > 5) {
          // Remove the temporary listener
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          
          // Only clear/replace selection if image wasn't already selected
          if (!selectedImages || !selectedImages.isSelected(id)) {
            selectionManager.clearAllSelections();
            selectionManager.getSelection('images').replaceSelection(id);
          }
          
          // Now prevent events and start drag
          moveEvent.preventDefault();
          moveEvent.stopPropagation();
          transitionState(ImageState.DRAGGING, 'drag started');
        }
      };
      
      const handleMouseUp = () => {
        // Remove listeners if mouse is released without dragging
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      // Add temporary listeners
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };
}

function createSelectionHandler(id, getImageLocation, selectionManager, store) {
  return {
    canHandle: (event, state, appState) => {
      return state === ImageState.IDLE && 
             appState.ui.nextClickCreatesConnector;
    },
    
    onClick: (event, stateData) => {
      event.stopPropagation();
      
      if (!event.shiftKey) {
        selectionManager.clearAllSelections();
      }
      
      selectionManager.getSelection('images').toggleSelected(id);
    }
  };
}

function createNormalSelectionHandler(id, getImageLocation, selectionManager, store) {
  return {
    canHandle: (event, state, appState) => {
      return state === ImageState.IDLE && 
             !appState.ui.nextClickCreatesConnector;
    },
    
    onClick: (event, stateData) => {
      event.stopPropagation();
      
      if (!event.shiftKey) {
        selectionManager.clearAllSelections();
      }
      
      selectionManager.getSelection('images').toggleSelected(id);
    }
  };
}

// Explicit priority order
const HANDLER_PRIORITY = [
  'resizeHandler',     // Highest - resize takes precedence over drag
  'dragHandler',       // Mid priority
  'normalSelectionHandler', // Normal selection (not in connector mode)
  'selectionHandler',  // Lowest - only if in connector mode
];

// Handler registry removed - now instance-specific per image

// Global references for mouse move handlers
let globalStore = null;

// Mouse move handler for dragging
function handleImageDrag(event) {
  if (currentState !== ImageState.DRAGGING) return;
  
  const appState = globalStore.getAppState();
  const boardScale = appState.ui.boardScale || 1;
  
  // Calculate movement delta using movement utils
  const delta = calculateMovementDelta(
    stateData.dragStart.x,
    stateData.dragStart.y,
    event.clientX,
    event.clientY,
    boardScale
  );
  
  // Move all images in the selection
  Object.keys(stateData.originalLocations).forEach((imageId) => {
    const originalLocation = stateData.originalLocations[imageId];
    moveItemFromOriginal(imageId, originalLocation, delta.dx, delta.dy, window.board, 'image');
  });
}

// Mouse up handler for dragging
function handleImageDragEnd() {
  if (currentState !== ImageState.DRAGGING) return;
  
  transitionState(ImageState.IDLE, 'drag ended');
}

// Mouse move handler for resizing
function handleImageResize(event) {
  if (currentState !== ImageState.RESIZING) return;
  
  const appState = globalStore.getAppState();
  const boardScale = appState.ui.boardScale || 1;
  
  const dx = event.clientX - stateData.resizeStart.x;
  const dy = event.clientY - stateData.resizeStart.y;
  
  // Calculate resize based on side, accounting for board scale
  let delta = 0;
  
  switch (stateData.resizeSide) {
    case 'left':
      delta = -dx / boardScale;
      break;
    case 'right':
      delta = dx / boardScale;
      break;
    case 'top':
      delta = -dy / boardScale;
      break;
    case 'bottom':
      delta = dy / boardScale;
      break;
  }
  
  // Only resize if there's significant movement (threshold of 5 pixels)
  if (Math.abs(delta) >= 5) {
    const isGrow = delta > 0;
    
    // Resize the image (this will be handled by the board)
    window.board.resizeImage(stateData.imageId, isGrow, stateData.resizeSide);
    
    // Update resize start to prevent accumulation
    stateData.resizeStart = { x: event.clientX, y: event.clientY };
  }
}

// Mouse up handler for resizing
function handleImageResizeEnd() {
  if (currentState !== ImageState.RESIZING) return;
  
  transitionState(ImageState.IDLE, 'resize ended');
}

// Main setup function - replaces the old setupImageEvents
export function setupImageEvents(
  container,
  id,
  getImageLocation,
  selectionManager,
  store
) {
  // Store global reference for mouse move handlers
  globalStore = store;
  
  // Create handlers for this specific image instance - each image gets its own handlers
  const imageHandlers = {
    resizeHandler: createResizeHandler(id, getImageLocation, selectionManager, store),
    dragHandler: createDragHandler(id, getImageLocation, selectionManager, store),
    normalSelectionHandler: createNormalSelectionHandler(id, getImageLocation, selectionManager, store),
    selectionHandler: createSelectionHandler(id, getImageLocation, selectionManager, store)
  };
  
  // Single mousedown handler with routing
  container.onmousedown = (event) => {
    const appState = store.getAppState();
    
    // Route to appropriate handler based on current state and context
    for (const handlerName of HANDLER_PRIORITY) {
      const handler = imageHandlers[handlerName];
      if (handler.canHandle && handler.canHandle(event, currentState, appState)) {
        if (handler.onMouseDown) {
          return handleEvent('mousedown', event, handler.onMouseDown);
        }
      }
    }
  };

  // Click handler for selection
  container.onclick = (event) => {
    const appState = store.getAppState();
    
    // Route to appropriate handler based on current state and context
    for (const handlerName of HANDLER_PRIORITY) {
      const handler = imageHandlers[handlerName];
      if (handler.canHandle && handler.canHandle(event, currentState, appState)) {
        if (handler.onClick) {
          return handleEvent('click', event, handler.onClick);
        }
      }
    }
  };
}

// Export for testing
export {
  ImageState,
  currentState,
  stateData,
  transitionState,
  HANDLER_PRIORITY,
  setListeners,
  clearAllListeners
};
