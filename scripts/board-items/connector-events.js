/**
 * Sets up connector creation and interaction events
 * 
 * @param {HTMLElement} boardElement - The board DOM element
 * @param {Object} board - Board instance
 * @param {Object} selectedConnectors - Selection management object
 * @param {Function} renderCallback - Callback to trigger re-rendering
 * @param {Object} store - Store instance for state access
 */
export function setupConnectorEvents(boardElement, board, selectedConnectors, renderCallback, store) {
  const appState = store.getAppState();
  let isDraggingConnector = false;
  let dragStartPoint = null;
  let currentConnectorId = null;
  let isDraggingHandle = false;
  let draggedHandle = null;
  let draggedConnectorId = null;

  // Handle board mouse events for connector creation
  boardElement.addEventListener('mousedown', (event) => {
    if (!appState.ui.nextClickCreatesConnector) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const rect = boardElement.getBoundingClientRect();
    const boardOrigin = board.getOrigin();
    const point = {
      x: event.clientX - rect.left + boardOrigin.x,
      y: event.clientY - rect.top + boardOrigin.y
    };
    
    // Check if we're starting from a sticky
    const stickyContainer = event.target.closest('.sticky-container');
    let originStickyId = null;
    
    if (stickyContainer) {
      // Extract sticky ID from class name
      const stickyIdClass = Array.from(stickyContainer.classList).find(cls => cls.startsWith('sticky-'));
      originStickyId = stickyIdClass ? stickyIdClass.replace('sticky-', '') : null;
    }
    
    // Start dragging to create connector
    isDraggingConnector = true;
    dragStartPoint = point;
    
    // Create a temporary connector
    const connectorData = {
      destinationPoint: point,
      arrowHead: appState.ui.currentArrowHead,
    };
    
    if (originStickyId) {
      connectorData.originId = originStickyId;
    } else {
      connectorData.originPoint = point;
    }
    
    currentConnectorId = board.putConnector(connectorData);
    
    // Set up global mouse events
    document.addEventListener('mousemove', handleConnectorDrag);
    document.addEventListener('mouseup', handleConnectorDragEnd);
  });

  // Handle connector handle dragging
  boardElement.addEventListener('mousedown', (event) => {
    const handle = event.target.closest('.connector-handle');
    if (!handle) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    isDraggingHandle = true;
    draggedHandle = handle.classList.contains('origin-handle') ? 'origin' : 'destination';
    
    // Find the connector ID from the container
    const container = handle.closest('.connector-container');
    const connectorIdClass = Array.from(container.classList).find(cls => cls.startsWith('connector-'));
    draggedConnectorId = connectorIdClass ? connectorIdClass.replace('connector-', '') : null;
    
    if (draggedConnectorId) {
      // Set up global mouse events
      document.addEventListener('mousemove', handleHandleDrag);
      document.addEventListener('mouseup', handleHandleDragEnd);
    }
  });

  function handleConnectorDrag(event) {
    if (!isDraggingConnector || !currentConnectorId) return;
    
    const rect = boardElement.getBoundingClientRect();
    const boardOrigin = board.getOrigin();
    const point = {
      x: event.clientX - rect.left + boardOrigin.x,
      y: event.clientY - rect.top + boardOrigin.y
    };
    
    // Update the destination point
    board.updateConnectorEndpoint(currentConnectorId, 'destination', { point });
  }

  function handleConnectorDragEnd(event) {
    if (!isDraggingConnector || !currentConnectorId) return;
    
    const rect = boardElement.getBoundingClientRect();
    const boardOrigin = board.getOrigin();
    const point = {
      x: event.clientX - rect.left + boardOrigin.x,
      y: event.clientY - rect.top + boardOrigin.y
    };
    
    // Check if we're over a sticky
    const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
    const stickyContainer = elementBelow?.closest('.sticky-container');
    
    if (stickyContainer) {
      // Extract sticky ID from class name
      const stickyIdClass = Array.from(stickyContainer.classList).find(cls => cls.startsWith('sticky-'));
      const stickyId = stickyIdClass ? stickyIdClass.replace('sticky-', '') : null;
      
      if (stickyId) {
        // Connect to the sticky
        board.updateConnectorEndpoint(currentConnectorId, 'destination', { stickyId });
      }
    } else {
      // Keep as unconnected endpoint
      board.updateConnectorEndpoint(currentConnectorId, 'destination', { point });
    }
    
    // Clean up
    isDraggingConnector = false;
    dragStartPoint = null;
    currentConnectorId = null;
    
    // Remove global event listeners
    document.removeEventListener('mousemove', handleConnectorDrag);
    document.removeEventListener('mouseup', handleConnectorDragEnd);
    
    // Exit connector creation mode
    appState.ui.nextClickCreatesConnector = false;
    
    // Trigger re-render
    if (renderCallback) {
      renderCallback();
    }
  }

  function handleHandleDrag(event) {
    if (!isDraggingHandle || !draggedConnectorId) return;
    
    const rect = boardElement.getBoundingClientRect();
    const boardOrigin = board.getOrigin();
    const point = {
      x: event.clientX - rect.left + boardOrigin.x,
      y: event.clientY - rect.top + boardOrigin.y
    };
    
    // Update the dragged handle position
    board.updateConnectorEndpoint(draggedConnectorId, draggedHandle, { point });
  }

  function handleHandleDragEnd(event) {
    if (!isDraggingHandle || !draggedConnectorId) return;
    
    const rect = boardElement.getBoundingClientRect();
    const boardOrigin = board.getOrigin();
    const point = {
      x: event.clientX - rect.left + boardOrigin.x,
      y: event.clientY - rect.top + boardOrigin.y
    };
    
    // Check if we're over a sticky
    const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
    const stickyContainer = elementBelow?.closest('.sticky-container');
    
    if (stickyContainer) {
      // Extract sticky ID from class name
      const stickyIdClass = Array.from(stickyContainer.classList).find(cls => cls.startsWith('sticky-'));
      const stickyId = stickyIdClass ? stickyIdClass.replace('sticky-', '') : null;
      
      if (stickyId) {
        // Connect to the sticky
        board.updateConnectorEndpoint(draggedConnectorId, draggedHandle, { stickyId });
      }
    } else {
      // Keep as unconnected endpoint
      board.updateConnectorEndpoint(draggedConnectorId, draggedHandle, { point });
    }
    
    // Clean up
    isDraggingHandle = false;
    draggedHandle = null;
    draggedConnectorId = null;
    
    // Remove global event listeners
    document.removeEventListener('mousemove', handleHandleDrag);
    document.removeEventListener('mouseup', handleHandleDragEnd);
    
    // Trigger re-render
    if (renderCallback) {
      renderCallback();
    }
  }

  // Handle connector selection
  boardElement.addEventListener('click', (event) => {
    const connectorContainer = event.target.closest('.connector-container');
    if (!connectorContainer) return;
    
    // Only allow selection when clicking on the actual path or marker elements
    const isPathClick = event.target.classList.contains('connector-path');
    const isMarkerClick = event.target.closest('marker') !== null || 
                        (event.target.tagName === 'path' && 
                         event.target.parentElement && 
                         event.target.parentElement.tagName === 'marker');
    const isHandleClick = event.target.classList.contains('connector-handle');
    
    if (!isPathClick && !isMarkerClick && !isHandleClick) {
      return; // Don't select if clicking on empty SVG area
    }
    
    event.stopPropagation();
    
    // Extract connector ID from class name
    const connectorIdClass = Array.from(connectorContainer.classList).find(cls => cls.startsWith('connector-'));
    const connectorId = connectorIdClass ? connectorIdClass.replace('connector-', '') : null;
    
    if (connectorId) {
      if (event.shiftKey) {
        selectedConnectors.toggleSelected(connectorId);
      } else {
        selectedConnectors.replaceSelection(connectorId);
      }
    }
  });

  return {
    // Cleanup function if needed
    cleanup: () => {
      document.removeEventListener('mousemove', handleConnectorDrag);
      document.removeEventListener('mouseup', handleConnectorDragEnd);
      document.removeEventListener('mousemove', handleHandleDrag);
      document.removeEventListener('mouseup', handleHandleDragEnd);
    }
  };
}
