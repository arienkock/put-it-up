/**
 * Creates and manages a minimap component for the board
 * Uses DOM cloning with CSS transforms for hardware-accelerated rendering
 * @param {Object} board - Board instance
 * @param {HTMLElement} boardScrollContainer - The scroll container element
 * @param {HTMLElement} boardElement - The board DOM element containing all items
 * @param {Object} store - Datastore instance
 * @param {Function} renderCallback - Callback to trigger re-rendering
 * @returns {Object} Object with update methods
 */
export function createMinimap(board, boardScrollContainer, boardElement, store, renderCallback) {
  // Get the board container element (parent of board element) which changes size on zoom
  const boardContainer = boardElement.parentElement;
  const appState = store.getAppState();
  
  // Create minimap container
  const minimapContainer = document.createElement('div');
  minimapContainer.className = 'minimap-container';
  
  // Create minimap board wrapper
  const minimapBoardWrapper = document.createElement('div');
  minimapBoardWrapper.className = 'minimap-board-wrapper';
  
  // Create viewport indicator overlay
  const viewportIndicator = document.createElement('div');
  viewportIndicator.className = 'minimap-viewport-indicator';
  
  minimapContainer.appendChild(minimapBoardWrapper);
  minimapContainer.appendChild(viewportIndicator);
  
  // Add to root element (app container)
  const root = boardScrollContainer.parentElement;
  root.appendChild(minimapContainer);
  
  // Minimap dimensions
  const MINIMAP_WIDTH = 250;
  const MINIMAP_HEIGHT = 150;
  minimapContainer.style.width = MINIMAP_WIDTH + 'px';
  minimapContainer.style.height = MINIMAP_HEIGHT + 'px';
  
  let updateTimeout = null;
  let viewportUpdateFrame = null;
  let needsContentUpdate = false;
  let lastBoardScale = getBoardScale();
  
  /**
   * Gets the current board scale
   */
  function getBoardScale() {
    return appState.ui.boardScale || 1.0;
  }
  
  /**
   * Gets the board origin and size
   */
  function getBoardBounds() {
    const origin = board.getOrigin();
    const size = board.getBoardSize();
    return {
      origin,
      size,
      minX: origin.x,
      minY: origin.y,
      maxX: origin.x + size.width,
      maxY: origin.y + size.height
    };
  }
  
  /**
   * Calculates the scale factor to fit board into minimap
   */
  function getMinimapScale(boardBounds) {
    const scaleX = MINIMAP_WIDTH / boardBounds.size.width;
    const scaleY = MINIMAP_HEIGHT / boardBounds.size.height;
    return Math.min(scaleX, scaleY);
  }
  
  /**
   * Converts board coordinates to minimap coordinates
   */
  function boardToMinimap(boardX, boardY, boardBounds, minimapScale) {
    const x = (boardX - boardBounds.origin.x) * minimapScale;
    const y = (boardY - boardBounds.origin.y) * minimapScale;
    return { x, y };
  }
  
  /**
   * Converts minimap coordinates to board coordinates
   */
  function minimapToBoard(minimapX, minimapY, boardBounds, minimapScale) {
    const boardX = minimapX / minimapScale + boardBounds.origin.x;
    const boardY = minimapY / minimapScale + boardBounds.origin.y;
    return { x: boardX, y: boardY };
  }
  
  /**
   * Clones and simplifies a DOM element for minimap
   */
  function cloneElementForMinimap(element) {
    const clone = element.cloneNode(true);
    
    // Remove interactive elements
    const textareas = clone.querySelectorAll('textarea, input');
    textareas.forEach(el => el.remove());
    
    // Remove resize handles
    const resizeHandles = clone.querySelectorAll('.resize-handle');
    resizeHandles.forEach(el => el.remove());
    
    // Hide text content in stickies
    const stickyText = clone.querySelector('.sticky .text');
    if (stickyText) {
      stickyText.style.display = 'none';
    }
    
    // Keep images visible in minimap - they are the visual content
    // Images will be automatically scaled down by the minimap transform
    
    // Simplify connector paths - keep them visible but minimal
    const connectorPaths = clone.querySelectorAll('.connector-path');
    connectorPaths.forEach(path => {
      path.style.strokeWidth = '2';
    });
    
    // Remove selection indicators
    clone.classList.remove('selected');
    
    // Disable pointer events on cloned elements
    clone.style.pointerEvents = 'none';
    
    return clone;
  }
  
  /**
   * Updates the minimap DOM by cloning board elements
   */
  function updateMinimapContent() {
    if (!board.isReadyForUse()) {
      return;
    }
    
    const boardBounds = getBoardBounds();
    const minimapScale = getMinimapScale(boardBounds);
    
    // Clear existing content
    minimapBoardWrapper.innerHTML = '';
    
    // Clone all board children
    const boardChildren = Array.from(boardElement.children);
    boardChildren.forEach(child => {
      const clone = cloneElementForMinimap(child);
      minimapBoardWrapper.appendChild(clone);
    });
    
    // Apply transform to scale down
    minimapBoardWrapper.style.transform = `scale(${minimapScale})`;
    minimapBoardWrapper.style.transformOrigin = 'top left';
    
    // Set wrapper size to match scaled board
    minimapBoardWrapper.style.width = boardBounds.size.width + 'px';
    minimapBoardWrapper.style.height = boardBounds.size.height + 'px';
    minimapBoardWrapper.style.position = 'relative';
    
    // Update viewport indicator
    updateViewportIndicator();
  }
  
  /**
   * Updates the viewport indicator rectangle
   */
  function updateViewportIndicator() {
    if (!board.isReadyForUse()) {
      return;
    }
    
    const boardBounds = getBoardBounds();
    const minimapScale = getMinimapScale(boardBounds);
    const boardScale = getBoardScale();
    
    // Force a layout read to ensure we get current dimensions
    void boardScrollContainer.offsetWidth;
    void boardScrollContainer.offsetHeight;
    
    // Calculate viewport bounds in board coordinates
    const scrollLeft = boardScrollContainer.scrollLeft;
    const scrollTop = boardScrollContainer.scrollTop;
    const viewportWidth = boardScrollContainer.clientWidth;
    const viewportHeight = boardScrollContainer.clientHeight;
    
    // Convert scroll position to board coordinates
    const viewportBoardX = scrollLeft / boardScale + boardBounds.origin.x;
    const viewportBoardY = scrollTop / boardScale + boardBounds.origin.y;
    const viewportBoardWidth = viewportWidth / boardScale;
    const viewportBoardHeight = viewportHeight / boardScale;
    
    // Convert to minimap coordinates
    const viewportPos = boardToMinimap(viewportBoardX, viewportBoardY, boardBounds, minimapScale);
    const viewportMinimapWidth = viewportBoardWidth * minimapScale;
    const viewportMinimapHeight = viewportBoardHeight * minimapScale;
    
    // Update viewport indicator position and size
    viewportIndicator.style.left = viewportPos.x + 'px';
    viewportIndicator.style.top = viewportPos.y + 'px';
    viewportIndicator.style.width = viewportMinimapWidth + 'px';
    viewportIndicator.style.height = viewportMinimapHeight + 'px';
  }
  
  /**
   * Schedules a content update with 1-second debounce
   */
  function scheduleContentUpdate() {
    needsContentUpdate = true;
    
    if (updateTimeout) {
      clearTimeout(updateTimeout);
    }
    
    updateTimeout = setTimeout(() => {
      if (needsContentUpdate) {
        updateMinimapContent();
        needsContentUpdate = false;
      }
      updateTimeout = null;
    }, 1000);
  }
  
  /**
   * Updates viewport indicator only (for scroll events or zoom changes)
   * Throttled with requestAnimationFrame for smooth updates
   */
  function updateViewportOnly() {
    if (viewportUpdateFrame) {
      cancelAnimationFrame(viewportUpdateFrame);
    }
    
    viewportUpdateFrame = requestAnimationFrame(() => {
      // Check if zoom has changed
      const currentScale = getBoardScale();
      if (currentScale !== lastBoardScale) {
        lastBoardScale = currentScale;
        // Zoom changed - update viewport indicator with new scale
        updateViewportIndicator();
      } else {
        // Only update viewport indicator, content stays the same
        updateViewportIndicator();
      }
      viewportUpdateFrame = null;
    });
  }
  
  /**
   * Public method to update viewport indicator (e.g., when zoom changes)
   */
  function updateViewport() {
    updateViewportOnly();
  }
  
  /**
   * Public method to update minimap when zoom changes
   * Re-renders content immediately and updates viewport indicator
   */
  function updateOnZoomChange() {
    // Update the last known scale immediately
    lastBoardScale = getBoardScale();
    
    // Re-render minimap content with new zoom
    if (board.isReadyForUse()) {
      updateMinimapContent(); // This already calls updateViewportIndicator at the end
    }
    
    // Also force an immediate viewport update after a microtask to ensure DOM is ready
    // Use both setTimeout and requestAnimationFrame as fallbacks
    setTimeout(() => {
      updateViewportIndicator();
    }, 0);
    
    // Also update on next animation frame as backup
    requestAnimationFrame(() => {
      updateViewportIndicator();
    });
  }
  
  /**
   * Handles click on minimap to navigate viewport
   */
  function handleMinimapClick(event) {
    if (!board.isReadyForUse()) {
      return;
    }
    
    // Get click position relative to minimap container
    const rect = minimapContainer.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    // Don't handle clicks on the viewport indicator itself
    const indicatorRect = viewportIndicator.getBoundingClientRect();
    if (clickX >= indicatorRect.left - rect.left && 
        clickX <= indicatorRect.right - rect.left &&
        clickY >= indicatorRect.top - rect.top && 
        clickY <= indicatorRect.bottom - rect.top) {
      return;
    }
    
    const boardBounds = getBoardBounds();
    const minimapScale = getMinimapScale(boardBounds);
    const boardScale = getBoardScale();
    
    // Convert click position to board coordinates
    const boardPos = minimapToBoard(clickX, clickY, boardBounds, minimapScale);
    
    // Calculate scroll position to center viewport on clicked point
    const viewportWidth = boardScrollContainer.clientWidth;
    const viewportHeight = boardScrollContainer.clientHeight;
    
    const scrollX = (boardPos.x - boardBounds.origin.x) * boardScale - viewportWidth / 2;
    const scrollY = (boardPos.y - boardBounds.origin.y) * boardScale - viewportHeight / 2;
    
    // Update scroll position
    boardScrollContainer.scrollLeft = Math.max(0, scrollX);
    boardScrollContainer.scrollTop = Math.max(0, scrollY);
  }
  
  // Set up event listeners
  minimapContainer.addEventListener('click', handleMinimapClick);
  
  // Listen to scroll events for viewport indicator updates
  const scrollHandler = () => {
    updateViewportOnly();
  };
  boardScrollContainer.addEventListener('scroll', scrollHandler);
  
  // Also listen to resize events on the board container to catch zoom changes
  // This is a fallback to ensure viewport updates when zoom changes
  // The board container's actual size changes when zoom changes (see applyZoomToBoard)
  const resizeObserver = new ResizeObserver(() => {
    // Throttle resize updates with requestAnimationFrame
    requestAnimationFrame(() => {
      updateViewportIndicator();
    });
  });
  // Observe the board container which changes size when zoom changes
  if (boardContainer) {
    resizeObserver.observe(boardContainer);
  }
  
  // Create observer for board changes
  const minimapObserver = {
    onStickyChange: () => scheduleContentUpdate(),
    onConnectorChange: () => scheduleContentUpdate(),
    onImageChange: () => scheduleContentUpdate(),
    onBoardChange: () => scheduleContentUpdate(),
    onBoardItemChange: () => scheduleContentUpdate()
  };
  
  board.addObserver(minimapObserver);
  
  // Initial render
  if (board.isReadyForUse()) {
    updateMinimapContent();
  } else {
    // Wait for board to be ready
    const checkReady = setInterval(() => {
      if (board.isReadyForUse()) {
        updateMinimapContent();
        clearInterval(checkReady);
      }
    }, 100);
    
    // Cleanup after 10 seconds
    setTimeout(() => clearInterval(checkReady), 10000);
  }
  
  return {
    update: scheduleContentUpdate,
    updateViewport: updateViewport,
    updateOnZoomChange: updateOnZoomChange,
    destroy: () => {
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      if (viewportUpdateFrame) {
        cancelAnimationFrame(viewportUpdateFrame);
      }
      boardScrollContainer.removeEventListener('scroll', scrollHandler);
      resizeObserver.disconnect();
      minimapContainer.removeEventListener('click', handleMinimapClick);
      minimapContainer.remove();
    }
  };
}
