import { SelectionManager } from "../ui/selection-manager.js";
import { completeKeyboardAction } from "../ui/keyboard-handlers.js";

/**
 * Connector State Machine
 * Centralized state management for connector events
 */
const ConnectorState = {
  IDLE: 'idle',
  DRAGGING_NEW: 'dragging_new',
  CLICK_TO_CLICK_WAITING: 'click_to_click_waiting',
  DRAGGING_HANDLE: 'dragging_handle',
  DRAGGING_DISCONNECTED: 'dragging_disconnected'
};

/**
 * Global Listener Manager
 * Prevents listener overlap and manages document-level event listeners
 */
class GlobalListenerManager {
  constructor() {
    this.activeListeners = new Map(); // type -> Set of handlers
  }
  
  /**
   * Set listeners for a specific state
   * Automatically removes any existing listeners first
   */
  setListeners(listenerMap) {
    this.clearAll();
    
    Object.entries(listenerMap).forEach(([eventType, handler]) => {
      document.addEventListener(eventType, handler);
      
      if (!this.activeListeners.has(eventType)) {
        this.activeListeners.set(eventType, new Set());
      }
      this.activeListeners.get(eventType).add(handler);
    });
  }
  
  clearAll() {
    this.activeListeners.forEach((handlers, eventType) => {
      handlers.forEach(handler => {
        document.removeEventListener(eventType, handler);
      });
    });
    this.activeListeners.clear();
  }
  
  // Debug: log active listeners
  getActiveListeners() {
    const result = {};
    this.activeListeners.forEach((handlers, eventType) => {
      result[eventType] = handlers.size;
    });
    return result;
  }
}

/**
 * Connector Events State Machine Implementation
 * Replaces scattered boolean flags with centralized state management
 */
export function setupConnectorEvents(boardElement, board, selectionManager, renderCallback, store) {
  // Centralized state
  let currentState = ConnectorState.IDLE;
  let stateData = {
    connectorId: null,
    originData: null,
    dragStartPoint: null,
    handleType: null,
    timeout: null,
    justEntered: false
  };

  // Global listener manager
  const globalListeners = new GlobalListenerManager();

  // Debug mode - can be toggled for development
  const DEBUG_MODE = true;

  /**
   * Transition to new state with logging and cleanup
   */
  function transitionState(newState, reason, data = {}) {
    const oldState = currentState;
    
    if (DEBUG_MODE) {
      console.log(`[ConnectorState] ${oldState} → ${newState}`, {
        reason,
        data,
        timestamp: Date.now()
      });
    }
    
    // Clean up old state
    switch (oldState) {
      case ConnectorState.DRAGGING_NEW:
        globalListeners.clearAll();
        break;
      case ConnectorState.CLICK_TO_CLICK_WAITING:
        if (stateData.timeout) {
          clearTimeout(stateData.timeout);
          stateData.timeout = null;
        }
        globalListeners.clearAll();
        break;
      case ConnectorState.DRAGGING_HANDLE:
        globalListeners.clearAll();
        break;
      case ConnectorState.DRAGGING_DISCONNECTED:
        globalListeners.clearAll();
        break;
    }
    
    currentState = newState;
    
    // Set up new state
    switch (newState) {
      case ConnectorState.IDLE:
        stateData = {
          connectorId: null,
          originData: null,
          dragStartPoint: null,
          handleType: null,
          timeout: null,
          justEntered: false
        };
        break;
      case ConnectorState.CLICK_TO_CLICK_WAITING:
        stateData.justEntered = true;
        setTimeout(() => { stateData.justEntered = false; }, 0);
        globalListeners.setListeners({
          'mousemove': handleClickToClickMove
        });
        break;
      case ConnectorState.DRAGGING_NEW:
        globalListeners.setListeners({
          'mousemove': handleConnectorDrag,
          'mouseup': handleConnectorDragEnd
        });
        break;
      case ConnectorState.DRAGGING_HANDLE:
        globalListeners.setListeners({
          'mousemove': handleHandleDrag,
          'mouseup': handleHandleDragEnd
        });
        break;
      case ConnectorState.DRAGGING_DISCONNECTED:
        globalListeners.setListeners({
          'mousemove': handleDisconnectedConnectorDrag,
          'mouseup': handleDisconnectedConnectorDragEnd
        });
        break;
    }
  }

  /**
   * Event handling wrapper with debug logging
   */
  function handleEvent(eventName, event, handlerFn) {
    if (DEBUG_MODE) {
      console.log(`[ConnectorEvent] ${eventName} in ${currentState}`, {
        target: event.target?.className || 'unknown',
        handler: handlerFn.name,
        stateData: { ...stateData }
      });
    }
    
    try {
      return handlerFn(event, stateData);
    } catch (error) {
      console.error(`[ConnectorError] in ${handlerFn.name}:`, error);
      // Reset to safe state
      transitionState(ConnectorState.IDLE, 'error recovery');
      throw error;
    }
  }

  /**
   * Sub-handler architecture with explicit precedence
   */
  const connectorHandlers = {
    // Handler for new connector creation
    newConnectorCreation: {
      canHandle: (event, state, appState) => {
        return state === ConnectorState.IDLE && 
               appState.ui.nextClickCreatesConnector;
      },
      
      onMouseDown: (event, stateData) => {
        const appState = store.getAppState();
        
        event.preventDefault();
        event.stopPropagation();
        
        const rect = boardElement.getBoundingClientRect();
        const boardOrigin = board.getOrigin();
        const boardScale = appState.ui.boardScale || 1;
        
        // Validate coordinates
        if (typeof event.clientX !== 'number' || typeof event.clientY !== 'number' ||
            isNaN(event.clientX) || isNaN(event.clientY) ||
            !boardOrigin || typeof boardOrigin.x !== 'number' || typeof boardOrigin.y !== 'number' ||
            isNaN(boardOrigin.x) || isNaN(boardOrigin.y)) {
          console.warn('Invalid mouse coordinates or board origin:', { 
            clientX: event.clientX, 
            clientY: event.clientY, 
            boardOrigin 
          });
          return;
        }
        
        const point = {
          x: (event.clientX - rect.left) / boardScale - boardOrigin.x,
          y: (event.clientY - rect.top) / boardScale - boardOrigin.y
        };
        
        // Check if we're starting from a sticky or image
        const stickyContainer = event.target.closest('.sticky-container');
        const imageContainer = event.target.closest('.image-container');
        let originStickyId = null;
        let originImageId = null;
        
        if (stickyContainer) {
          const stickyIdClass = Array.from(stickyContainer.classList).find(cls => cls.startsWith('sticky-'));
          originStickyId = stickyIdClass ? stickyIdClass.replace('sticky-', '') : null;
        } else if (imageContainer) {
          const imageIdClass = Array.from(imageContainer.classList).find(cls => cls.startsWith('image-') && cls !== 'image-container');
          originImageId = imageIdClass ? imageIdClass.replace('image-', '') : null;
        }
        
        // Store origin data
        stateData.originData = {
          point,
          originStickyId,
          originImageId
        };
        stateData.dragStartPoint = point;
        
        // Create connector
        const connectorData = {
          destinationPoint: point,
          arrowHead: appState.ui.currentArrowHead,
          color: appState.ui.currentConnectorColor,
        };
        
        if (originStickyId) {
          connectorData.originId = originStickyId;
        } else if (originImageId) {
          connectorData.originImageId = originImageId;
        } else {
          connectorData.originPoint = point;
        }
        
        stateData.connectorId = board.putConnector(connectorData);
        
        // Select the newly created connector
        selectionManager.selectItem('connectors', stateData.connectorId);
        
        // Trigger menu update
        if (window.menuRenderCallback) {
          window.menuRenderCallback();
        }
        
        // Transition to dragging state
        transitionState(ConnectorState.DRAGGING_NEW, 'new connector creation started');
      }
    },
    
    // Handler for dragging existing connector handles
    handleDragging: {
      canHandle: (event, state, appState) => {
        const handle = event.target.closest('.connector-handle');
        return state === ConnectorState.IDLE && 
               handle !== null &&
               !appState.ui.nextClickCreatesConnector;
      },
      
      onMouseDown: (event, stateData) => {
        const handle = event.target.closest('.connector-handle');
        const container = handle.closest('.connector-container');
        const connectorIdClass = Array.from(container.classList).find(cls => cls.startsWith('connector-'));
        const handleConnectorId = connectorIdClass ? connectorIdClass.replace('connector-', '') : null;
        
        event.preventDefault();
        event.stopPropagation();
        
        stateData.connectorId = handleConnectorId;
        stateData.handleType = handle.classList.contains('origin-handle') ? 'origin' : 'destination';
        
        transitionState(ConnectorState.DRAGGING_HANDLE, 'handle drag started');
      }
    },
    
    // Handler for click-to-click completion
    clickToClickCompletion: {
      canHandle: (event, state, appState) => {
        return state === ConnectorState.CLICK_TO_CLICK_WAITING;
      },
      
      onMouseUp: (event, stateData) => {
        if (stateData.justEntered) {
          return; // Ignore the mouseup event that immediately follows entering click-to-click mode
        }
        
        event.preventDefault();
        event.stopPropagation();
        
        const rect = boardElement.getBoundingClientRect();
        const boardOrigin = board.getOrigin();
        const appState = store.getAppState();
        const boardScale = appState.ui.boardScale || 1;
        
        // Validate coordinates
        if (typeof event.clientX !== 'number' || typeof event.clientY !== 'number' ||
            isNaN(event.clientX) || isNaN(event.clientY) ||
            !boardOrigin || typeof boardOrigin.x !== 'number' || typeof boardOrigin.y !== 'number' ||
            isNaN(boardOrigin.x) || isNaN(boardOrigin.y)) {
          console.warn('Invalid mouse coordinates or board origin during click-to-click:', { 
            clientX: event.clientX, 
            clientY: event.clientY, 
            boardOrigin 
          });
          return;
        }
        
        const point = {
          x: (event.clientX - rect.left) / boardScale - boardOrigin.x,
          y: (event.clientY - rect.top) / boardScale - boardOrigin.y
        };
        
        // Check if we're clicking on our own connector's handle
        const connectorHandle = event.target.closest('.connector-handle');
        if (connectorHandle) {
          const connectorContainer = connectorHandle.closest('.connector-container');
          if (connectorContainer) {
            const connectorIdClass = Array.from(connectorContainer.classList).find(cls => cls.startsWith('connector-'));
            const connectorId = connectorIdClass ? connectorIdClass.replace('connector-', '') : null;
            if (connectorId === stateData.connectorId) {
              // Continue with point-based connection (empty space)
            }
          }
        }
        
        // Check if we're clicking on a sticky or image
        const isOwnHandle = connectorHandle && connectorHandle.closest('.connector-container')?.classList.contains(`connector-${stateData.connectorId}`);
        const stickyContainer = !isOwnHandle ? event.target.closest('.sticky-container') : null;
        const imageContainer = !isOwnHandle ? event.target.closest('.image-container') : null;
        
        if (stickyContainer) {
          const stickyIdClass = Array.from(stickyContainer.classList).find(cls => cls.startsWith('sticky-'));
          const stickyId = stickyIdClass ? stickyIdClass.replace('sticky-', '') : null;
          
          if (stickyId) {
            board.updateConnectorEndpoint(stateData.connectorId, 'destination', { stickyId });
          }
        } else if (imageContainer) {
          const imageIdClass = Array.from(imageContainer.classList).find(cls => cls.startsWith('image-') && cls !== 'image-container');
          const imageId = imageIdClass ? imageIdClass.replace('image-', '') : null;
          
          if (imageId) {
            board.updateConnectorEndpoint(stateData.connectorId, 'destination', { imageId });
          }
        } else {
          board.updateConnectorEndpoint(stateData.connectorId, 'destination', { point });
        }
        
        // Complete connector creation
        appState.ui.nextClickCreatesConnector = false;
        
        transitionState(ConnectorState.IDLE, 'click-to-click connector creation completed');
        
        // Notify keyboard handler that connector creation is complete
        completeKeyboardAction('connector created (click-to-click)', appState);
        
        // Trigger re-render
        if (renderCallback) {
          renderCallback();
        }
      }
    },
    
    // Handler for dragging disconnected connectors
    disconnectedDragging: {
      canHandle: (event, state, appState) => {
        const connectorContainer = event.target.closest('.connector-container');
        if (!connectorContainer) return false;
        
        const isPathClick = event.target.classList.contains('connector-path');
        const isHandleClick = event.target.classList.contains('connector-handle');
        
        if (!isPathClick || isHandleClick) return false;
        
        const connectorIdClass = Array.from(connectorContainer.classList).find(cls => cls.startsWith('connector-'));
        const connectorId = connectorIdClass ? connectorIdClass.replace('connector-', '') : null;
        
        if (!connectorId) return false;
        
        const connector = board.getConnectorSafe(connectorId);
        if (!connector) return false;
        
        const hasDisconnectedOrigin = connector.originPoint && !connector.originId && !connector.originImageId;
        const hasDisconnectedDestination = connector.destinationPoint && !connector.destinationId && !connector.destinationImageId;
        
        return state === ConnectorState.IDLE && (hasDisconnectedOrigin || hasDisconnectedDestination);
      },
      
      onMouseDown: (event, stateData) => {
        const connectorContainer = event.target.closest('.connector-container');
        const connectorIdClass = Array.from(connectorContainer.classList).find(cls => cls.startsWith('connector-'));
        const connectorId = connectorIdClass ? connectorIdClass.replace('connector-', '') : null;
        
        event.stopPropagation();
        
        // Handle selection
        selectionManager.selectItem('connectors', connectorId, {
          addToSelection: event.shiftKey
        });
        
        // Trigger full render to update menu
        renderCallback();
        
        stateData.connectorId = connectorId;
        
        const rect = boardElement.getBoundingClientRect();
        const boardOrigin = board.getOrigin();
        const appState = store.getAppState();
        const boardScale = appState.ui.boardScale || 1;
        
        stateData.dragStartPoint = {
          x: (event.clientX - rect.left) / boardScale - boardOrigin.x,
          y: (event.clientY - rect.top) / boardScale - boardOrigin.y
        };
        
        transitionState(ConnectorState.DRAGGING_DISCONNECTED, 'disconnected connector drag started');
      }
    }
  };

  // Explicit priority order
  const HANDLER_PRIORITY = [
    'clickToClickCompletion',    // Highest - overrides everything
    'handleDragging',             // Mid priority
    'disconnectedDragging',       // Mid priority
    'newConnectorCreation',       // Lowest - only if nothing else matched
  ];

  /**
   * Single entry point with routing
   */
  function routeMouseDown(event) {
    const appState = store.getAppState();
    
    // Route to appropriate handler based on current state and context
    for (const handlerName of HANDLER_PRIORITY) {
      const handler = connectorHandlers[handlerName];
      if (handler.canHandle && handler.canHandle(event, currentState, appState)) {
        if (handler.onMouseDown) {
          return handleEvent('mousedown', event, handler.onMouseDown);
        }
      }
    }
  }

  function routeMouseUp(event) {
    // Route based on current state
    switch(currentState) {
      case ConnectorState.DRAGGING_NEW:
        return handleEvent('mouseup', event, handleConnectorDragEnd);
      
      case ConnectorState.CLICK_TO_CLICK_WAITING:
        const handler = connectorHandlers.clickToClickCompletion;
        if (handler.onMouseUp) {
          return handleEvent('mouseup', event, handler.onMouseUp);
        }
        break;
      
      case ConnectorState.DRAGGING_HANDLE:
        return handleEvent('mouseup', event, handleHandleDragEnd);
      
      case ConnectorState.DRAGGING_DISCONNECTED:
        return handleEvent('mouseup', event, handleDisconnectedConnectorDragEnd);
      
      default:
        return; // Ignore mouseup in other states
    }
  }

  // Event handlers for different states
  function handleConnectorDrag(event) {
    if (currentState !== ConnectorState.DRAGGING_NEW || !stateData.connectorId) return;
    
    const rect = boardElement.getBoundingClientRect();
    const boardOrigin = board.getOrigin();
    const appState = store.getAppState();
    const boardScale = appState.ui.boardScale || 1;
    
    // Validate coordinates
    if (typeof event.clientX !== 'number' || typeof event.clientY !== 'number' ||
        isNaN(event.clientX) || isNaN(event.clientY) ||
        !boardOrigin || typeof boardOrigin.x !== 'number' || typeof boardOrigin.y !== 'number' ||
        isNaN(boardOrigin.x) || isNaN(boardOrigin.y)) {
      console.warn('Invalid mouse coordinates or board origin during drag:', { 
        clientX: event.clientX, 
        clientY: event.clientY, 
        boardOrigin 
      });
      return;
    }
    
    const point = {
      x: (event.clientX - rect.left) / boardScale - boardOrigin.x,
      y: (event.clientY - rect.top) / boardScale - boardOrigin.y
    };
    
    // Check if we've moved enough to consider this a drag (vs a click)
    const minDragDistance = 5; // pixels
    const deltaX = point.x - stateData.dragStartPoint.x;
    const deltaY = point.y - stateData.dragStartPoint.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance > minDragDistance) {
      // This is a drag, not a click - exit click-to-click mode
      if (stateData.timeout) {
        clearTimeout(stateData.timeout);
        stateData.timeout = null;
      }
    }
    
    // Update the destination point
    board.updateConnectorEndpoint(stateData.connectorId, 'destination', { point });
  }

  function handleConnectorDragEnd(event) {
    if (currentState !== ConnectorState.DRAGGING_NEW || !stateData.connectorId) return;
    
    const rect = boardElement.getBoundingClientRect();
    const boardOrigin = board.getOrigin();
    const appState = store.getAppState();
    const boardScale = appState.ui.boardScale || 1;
    
    // Validate coordinates
    if (typeof event.clientX !== 'number' || typeof event.clientY !== 'number' ||
        isNaN(event.clientX) || isNaN(event.clientY) ||
        !boardOrigin || typeof boardOrigin.x !== 'number' || typeof boardOrigin.y !== 'number' ||
        isNaN(boardOrigin.x) || isNaN(boardOrigin.y)) {
      console.warn('Invalid mouse coordinates or board origin during drag end:', { 
        clientX: event.clientX, 
        clientY: event.clientY, 
        boardOrigin 
      });
      return;
    }
    
    const point = {
      x: (event.clientX - rect.left) / boardScale - boardOrigin.x,
      y: (event.clientY - rect.top) / boardScale - boardOrigin.y
    };
    
    // Check if this was a click (not a drag) by measuring distance moved
    const minDragDistance = 5; // pixels
    const deltaX = point.x - stateData.dragStartPoint.x;
    const deltaY = point.y - stateData.dragStartPoint.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance <= minDragDistance) {
      // This was a click, not a drag - enter click-to-click mode
      stateData.timeout = setTimeout(() => {
        cancelClickToClickMode();
      }, 30000);
      
      transitionState(ConnectorState.CLICK_TO_CLICK_WAITING, 'small movement detected, entering click-to-click mode');
      
      // Trigger re-render
      if (renderCallback) {
        renderCallback();
      }
      
      return; // Don't complete connector creation yet
    }
    
    // This was a drag - complete connector creation normally
    const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
    const stickyContainer = elementBelow?.closest('.sticky-container');
    const imageContainer = elementBelow?.closest('.image-container');
    
    if (stickyContainer) {
      const stickyIdClass = Array.from(stickyContainer.classList).find(cls => cls.startsWith('sticky-'));
      const stickyId = stickyIdClass ? stickyIdClass.replace('sticky-', '') : null;
      
      if (stickyId) {
        board.updateConnectorEndpoint(stateData.connectorId, 'destination', { stickyId });
      }
    } else if (imageContainer) {
      const imageIdClass = Array.from(imageContainer.classList).find(cls => cls.startsWith('image-') && cls !== 'image-container');
      const imageId = imageIdClass ? imageIdClass.replace('image-', '') : null;
      
      if (imageId) {
        board.updateConnectorEndpoint(stateData.connectorId, 'destination', { imageId });
      }
    } else {
      board.updateConnectorEndpoint(stateData.connectorId, 'destination', { point });
    }
    
    // Exit connector creation mode
    appState.ui.nextClickCreatesConnector = false;
    
    transitionState(ConnectorState.IDLE, 'connector creation completed');
    
    // Notify keyboard handler that connector creation is complete
    completeKeyboardAction('connector created', appState);
    
    // Trigger re-render
    if (renderCallback) {
      renderCallback();
    }
  }

  function handleClickToClickMove(event) {
    if (currentState !== ConnectorState.CLICK_TO_CLICK_WAITING || !stateData.connectorId) return;
    
    const rect = boardElement.getBoundingClientRect();
    const boardOrigin = board.getOrigin();
    const appState = store.getAppState();
    const boardScale = appState.ui.boardScale || 1;
    
    // Validate coordinates
    if (typeof event.clientX !== 'number' || typeof event.clientY !== 'number' ||
        isNaN(event.clientX) || isNaN(event.clientY) ||
        !boardOrigin || typeof boardOrigin.x !== 'number' || typeof boardOrigin.y !== 'number' ||
        isNaN(boardOrigin.x) || isNaN(boardOrigin.y)) {
      return;
    }
    
    const point = {
      x: (event.clientX - rect.left) / boardScale - boardOrigin.x,
      y: (event.clientY - rect.top) / boardScale - boardOrigin.y
    };
    
    // Update the destination point to follow the mouse
    board.updateConnectorEndpoint(stateData.connectorId, 'destination', { point });
  }

  function handleHandleDrag(event) {
    if (currentState !== ConnectorState.DRAGGING_HANDLE || !stateData.connectorId) return;
    
    const rect = boardElement.getBoundingClientRect();
    const boardOrigin = board.getOrigin();
    const appState = store.getAppState();
    const boardScale = appState.ui.boardScale || 1;
    
    // Validate coordinates
    if (typeof event.clientX !== 'number' || typeof event.clientY !== 'number' ||
        isNaN(event.clientX) || isNaN(event.clientY) ||
        !boardOrigin || typeof boardOrigin.x !== 'number' || typeof boardOrigin.y !== 'number' ||
        isNaN(boardOrigin.x) || isNaN(boardOrigin.y)) {
      console.warn('Invalid mouse coordinates or board origin during handle drag:', { 
        clientX: event.clientX, 
        clientY: event.clientY, 
        boardOrigin 
      });
      return;
    }
    
    const point = {
      x: (event.clientX - rect.left) / boardScale - boardOrigin.x,
      y: (event.clientY - rect.top) / boardScale - boardOrigin.y
    };
    
    // Update the dragged handle position
    board.updateConnectorEndpoint(stateData.connectorId, stateData.handleType, { point });
  }

  function handleHandleDragEnd(event) {
    if (currentState !== ConnectorState.DRAGGING_HANDLE || !stateData.connectorId) return;
    
    const rect = boardElement.getBoundingClientRect();
    const boardOrigin = board.getOrigin();
    const appState = store.getAppState();
    const boardScale = appState.ui.boardScale || 1;
    
    // Validate coordinates
    if (typeof event.clientX !== 'number' || typeof event.clientY !== 'number' ||
        isNaN(event.clientX) || isNaN(event.clientY) ||
        !boardOrigin || typeof boardOrigin.x !== 'number' || typeof boardOrigin.y !== 'number' ||
        isNaN(boardOrigin.x) || isNaN(boardOrigin.y)) {
      console.warn('Invalid mouse coordinates or board origin during handle drag end:', { 
        clientX: event.clientX, 
        clientY: event.clientY, 
        boardOrigin 
      });
      return;
    }
    
    const point = {
      x: (event.clientX - rect.left) / boardScale - boardOrigin.x,
      y: (event.clientY - rect.top) / boardScale - boardOrigin.y
    };
    
    // Check if we're over a sticky or image
    const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
    const stickyContainer = elementBelow?.closest('.sticky-container');
    const imageContainer = elementBelow?.closest('.image-container');
    
    if (stickyContainer) {
      const stickyIdClass = Array.from(stickyContainer.classList).find(cls => cls.startsWith('sticky-'));
      const stickyId = stickyIdClass ? stickyIdClass.replace('sticky-', '') : null;
      
      if (stickyId) {
        board.updateConnectorEndpoint(stateData.connectorId, stateData.handleType, { stickyId });
      }
    } else if (imageContainer) {
      const imageIdClass = Array.from(imageContainer.classList).find(cls => cls.startsWith('image-') && cls !== 'image-container');
      const imageId = imageIdClass ? imageIdClass.replace('image-', '') : null;
      
      if (imageId) {
        board.updateConnectorEndpoint(stateData.connectorId, stateData.handleType, { imageId });
      }
    } else {
      board.updateConnectorEndpoint(stateData.connectorId, stateData.handleType, { point });
    }
    
    transitionState(ConnectorState.IDLE, 'handle drag completed');
    
    // Trigger re-render
    if (renderCallback) {
      renderCallback();
    }
  }

  function handleDisconnectedConnectorDrag(event) {
    if (currentState !== ConnectorState.DRAGGING_DISCONNECTED || !stateData.connectorId) return;
    
    const rect = boardElement.getBoundingClientRect();
    const boardOrigin = board.getOrigin();
    const appState = store.getAppState();
    const boardScale = appState.ui.boardScale || 1;
    
    // Validate coordinates
    if (typeof event.clientX !== 'number' || typeof event.clientY !== 'number' ||
        isNaN(event.clientX) || isNaN(event.clientY) ||
        !boardOrigin || typeof boardOrigin.x !== 'number' || typeof boardOrigin.y !== 'number' ||
        isNaN(boardOrigin.x) || isNaN(boardOrigin.y)) {
      console.warn('Invalid mouse coordinates or board origin during disconnected connector drag:', { 
        clientX: event.clientX, 
        clientY: event.clientY, 
        boardOrigin 
      });
      return;
    }
    
    const currentPoint = {
      x: (event.clientX - rect.left) / boardScale - boardOrigin.x,
      y: (event.clientY - rect.top) / boardScale - boardOrigin.y
    };
    
    // Calculate the delta from the start point
    const deltaX = currentPoint.x - stateData.dragStartPoint.x;
    const deltaY = currentPoint.y - stateData.dragStartPoint.y;
    
    // Only start dragging if we've moved a minimum distance (to distinguish from clicks)
    const minDragDistance = 5; // pixels
    if (Math.abs(deltaX) > minDragDistance || Math.abs(deltaY) > minDragDistance) {
      // Move the connector
      board.moveConnector(stateData.connectorId, deltaX, deltaY);
      
      // Update the drag start point for smooth dragging
      stateData.dragStartPoint = currentPoint;
    }
  }

  function handleDisconnectedConnectorDragEnd(event) {
    if (currentState !== ConnectorState.DRAGGING_DISCONNECTED || !stateData.connectorId) return;
    
    transitionState(ConnectorState.IDLE, 'disconnected connector drag completed');
    
    // Trigger re-render
    if (renderCallback) {
      renderCallback();
    }
  }

  // Helper function to cancel click-to-click mode
  function cancelClickToClickMode() {
    if (currentState === ConnectorState.CLICK_TO_CLICK_WAITING && stateData.connectorId) {
      // Remove the temporary connector
      board.deleteConnector(stateData.connectorId);
      
      // Exit connector creation mode
      const appState = store.getAppState();
      appState.ui.nextClickCreatesConnector = false;
      
      transitionState(ConnectorState.IDLE, 'click-to-click mode cancelled');
      
      // Notify keyboard handler that connector creation is cancelled
      completeKeyboardAction('connector creation cancelled', appState);
      
      // Trigger re-render
      if (renderCallback) {
        renderCallback();
      }
    }
  }

  // Single entry point event listeners
  boardElement.addEventListener('mousedown', routeMouseDown);
  boardElement.addEventListener('mouseup', routeMouseUp);

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
    
    // Extract connector ID from class name
    const connectorIdClass = Array.from(connectorContainer.classList).find(cls => cls.startsWith('connector-'));
    const connectorId = connectorIdClass ? connectorIdClass.replace('connector-', '') : null;
    
    if (!connectorId) return;
    
    // Check if this connector is disconnected - if so, it was handled in mousedown
    const connector = board.getConnectorSafe(connectorId);
    if (connector) {
      const hasDisconnectedOrigin = connector.originPoint && !connector.originId && !connector.originImageId;
      const hasDisconnectedDestination = connector.destinationPoint && !connector.destinationId && !connector.destinationImageId;
      
      if (hasDisconnectedOrigin || hasDisconnectedDestination) {
        return; // Disconnected connectors are handled in mousedown
      }
    }
    
    event.stopPropagation();
    
    if (connectorId) {
      // Use selection manager to handle cross-type selection clearing
      selectionManager.selectItem('connectors', connectorId, {
        addToSelection: event.shiftKey
      });
      
      // Trigger full render to update menu
      renderCallback();
    }
  });

  // Handle escape key to cancel click-to-click mode
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && currentState === ConnectorState.CLICK_TO_CLICK_WAITING) {
      cancelClickToClickMode();
    }
  });

  return {
    // Cleanup function
    cleanup: () => {
      globalListeners.clearAll();
      
      // Clean up click-to-click mode
      if (stateData.timeout) {
        clearTimeout(stateData.timeout);
        stateData.timeout = null;
      }
      
      // Reset state
      transitionState(ConnectorState.IDLE, 'cleanup');
    },
    
    // Debug functions
    getCurrentState: () => currentState,
    getStateData: () => ({ ...stateData }),
    getActiveListeners: () => globalListeners.getActiveListeners()
  };
}
