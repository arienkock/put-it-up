export function setupImageEvents(
  container,
  id,
  getImageLocation,
  selectionManager,
  store
) {
  let isDragging = false;
  let isResizing = false;
  let resizeSide = null;
  let dragStart = null;
  let originalLocation = null;
  let originalSize = null;
  let aspectRatio = null;

  // Mouse down handler
  container.onmousedown = (event) => {
    // Don't prevent propagation if we're in connector creation mode
    const appState = store.getAppState();
    if (appState.ui.nextClickCreatesConnector) {
      return; // Let connector events handle this
    }
    
    event.preventDefault();
    event.stopPropagation();
    
    // Check if clicking on a resize handle
    const handle = event.target.closest('.resize-handle');
    if (handle) {
      // Extract side from class name - look for resize-handle-[side] pattern
      const classNames = handle.className.split(' ');
      resizeSide = null;
      for (const className of classNames) {
        if (className.startsWith('resize-handle-')) {
          resizeSide = className.replace('resize-handle-', '');
          break;
        }
      }
      
      console.log('Resize handle clicked:', handle.className, 'Side:', resizeSide);
      
      if (!resizeSide) {
        console.error('Could not determine resize side from class name:', handle.className);
        return;
      }
      
      isResizing = true;
      const image = store.getImage(id);
      aspectRatio = image.naturalWidth / image.naturalHeight;
      originalSize = { width: image.width, height: image.height };
      originalLocation = { x: image.location.x, y: image.location.y };
      dragStart = { x: event.clientX, y: event.clientY }; // Initialize dragStart for resize
      document.body.style.cursor = handle.style.cursor;
      console.log('Resize started for side:', resizeSide);
      return;
    }
    
    // Otherwise, start dragging
    isDragging = true;
    dragStart = { x: event.clientX, y: event.clientY };
    originalLocation = getImageLocation(id);
    
    // Select this image
    selectionManager.clearAllSelections();
    selectionManager.getSelection('images').replaceSelection(id);
    
    document.body.style.cursor = "grabbing";
  };

  // Mouse move handler
  document.onmousemove = (event) => {
    if (isDragging && !isResizing) {
      const dx = event.clientX - dragStart.x;
      const dy = event.clientY - dragStart.y;
      
      const newLocation = {
        x: originalLocation.x + dx,
        y: originalLocation.y + dy
      };
      
      // Move the image (this will be handled by the board)
      window.board.moveImage(id, newLocation);
    } else if (isResizing && resizeSide) {
      console.log('Resizing mouse move:', resizeSide);
      const dx = event.clientX - dragStart.x;
      const dy = event.clientY - dragStart.y;
      
      // Calculate resize based on side
      let delta = 0;
      
      switch (resizeSide) {
        case 'left':
          delta = -dx;
          break;
        case 'right':
          delta = dx;
          break;
        case 'top':
          delta = -dy;
          break;
        case 'bottom':
          delta = dy;
          break;
      }
      
      console.log('Delta:', delta, 'Threshold check:', Math.abs(delta) >= 5);
      
      // Only resize if there's significant movement (threshold of 5 pixels)
      if (Math.abs(delta) >= 5) {
        const isGrow = delta > 0;
        console.log('Calling resizeImage:', id, isGrow, resizeSide);
        
        // Resize the image (this will be handled by the board)
        window.board.resizeImage(id, isGrow, resizeSide);
        
        // Update drag start to prevent accumulation
        dragStart = { x: event.clientX, y: event.clientY };
      }
    }
  };

  // Mouse up handler
  document.onmouseup = () => {
    if (isDragging || isResizing) {
      isDragging = false;
      isResizing = false;
      resizeSide = null;
      dragStart = null;
      originalLocation = null;
      originalSize = null;
      aspectRatio = null;
      document.body.style.cursor = "default";
    }
  };

  // Click handler for selection
  container.onclick = (event) => {
    // Don't prevent propagation if we're in connector creation mode
    const appState = store.getAppState();
    if (appState.ui.nextClickCreatesConnector) {
      return; // Let connector events handle this
    }
    
    event.stopPropagation();
    
    if (!event.shiftKey) {
      selectionManager.clearAllSelections();
    }
    
    selectionManager.getSelection('images').toggleSelection(id);
  };
}
