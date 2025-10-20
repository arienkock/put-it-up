import { StateMachine, GlobalListenerManager } from "../ui/state-machine-base.js";
import { createStateConfig } from "../ui/state-config-pattern.js";
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
  DRAGGING_CURVE_HANDLE: 'dragging_curve_handle',
  DRAGGING_DISCONNECTED: 'dragging_disconnected'
};

/**
 * Connector State Machine Implementation
 * Uses the new StateMachine base class for consistent behavior
 */
class ConnectorStateMachine extends StateMachine {
  constructor(boardElement, board, selectionManager, renderCallback, store) {
    const stateConfig = createStateConfig(ConnectorState);
    
    // Configure each state
    stateConfig[ConnectorState.IDLE] = {
      setup: (stateData, stateMachine) => {
        // Only setup if properties are initialized
        if (stateMachine.globalListeners) {
          stateMachine.enableProximityDetection();
          stateMachine.setupIdleListeners();
        }
      },
      cleanup: (stateData, stateMachine) => {
        if (stateMachine.globalListeners) {
          stateMachine.disableProximityDetection();
          stateMachine.clearAllListeners();
        }
      },
      validate: (stateData, stateMachine) => {
        return stateMachine.proximityDetectionActive === true;
      }
    };
    
    stateConfig[ConnectorState.DRAGGING_NEW] = {
      setup: (stateData, stateMachine) => {
        if (stateMachine.globalListeners) {
          stateMachine.disableProximityDetection();
          stateMachine.setupDragListeners();
        }
      },
      cleanup: (stateData, stateMachine) => {
        if (stateMachine.globalListeners) {
          stateMachine.clearAllListeners();
        }
      }
    };
    
    stateConfig[ConnectorState.CLICK_TO_CLICK_WAITING] = {
      setup: (stateData, stateMachine) => {
        if (stateMachine.globalListeners) {
          stateMachine.disableProximityDetection();
          stateMachine.setupClickToClickListeners();
          stateMachine.ensureHandleVisibility(stateData.connectorId);
        }
      },
      cleanup: (stateData, stateMachine) => {
        if (stateMachine.globalListeners) {
          stateMachine.clearAllListeners();
        }
        if (stateData.timeout) {
          clearTimeout(stateData.timeout);
          stateData.timeout = null;
        }
      }
    };
    
    stateConfig[ConnectorState.DRAGGING_HANDLE] = {
      setup: (stateData, stateMachine) => {
        if (stateMachine.globalListeners) {
          stateMachine.disableProximityDetection();
          stateMachine.setupHandleDragListeners();
          stateMachine.ensureHandleVisibility(stateData.connectorId);
        }
      },
      cleanup: (stateData, stateMachine) => {
        if (stateMachine.globalListeners) {
          stateMachine.clearAllListeners();
        }
      }
    };
    
    stateConfig[ConnectorState.DRAGGING_CURVE_HANDLE] = {
      setup: (stateData, stateMachine) => {
        if (stateMachine.globalListeners) {
          stateMachine.disableProximityDetection();
          stateMachine.setupCurveHandleDragListeners();
          stateMachine.ensureHandleVisibility(stateData.connectorId);
        }
      },
      cleanup: (stateData, stateMachine) => {
        if (stateMachine.globalListeners) {
          stateMachine.clearAllListeners();
        }
      }
    };
    
    stateConfig[ConnectorState.DRAGGING_DISCONNECTED] = {
      setup: (stateData, stateMachine) => {
        if (stateMachine.globalListeners) {
          stateMachine.disableProximityDetection();
          stateMachine.setupDisconnectedDragListeners();
        }
      },
      cleanup: (stateData, stateMachine) => {
        if (stateMachine.globalListeners) {
          stateMachine.clearAllListeners();
        }
      }
    };
    
    super(ConnectorState.IDLE, stateConfig);
    
    // Initialize properties after super constructor
    this.boardElement = boardElement;
    this.board = board;
    this.selectionManager = selectionManager;
    this.renderCallback = renderCallback;
    this.store = store;
    
    // Global listener manager
    this.globalListeners = new GlobalListenerManager();
    
    // Proximity detection state
    this.proximityDetectionActive = true;
    this.lastProximityUpdate = 0;
    this.PROXIMITY_THRESHOLD = 70; // pixels
    this.PROXIMITY_UPDATE_THROTTLE = 16; // ~60fps
    
    this.setupEventListeners();
  }
  
  enableProximityDetection() {
    this.proximityDetectionActive = true;
    this.globalListeners.setListeners({
      'mousemove': this.handleProximityDetection.bind(this)
    });
  }
  
  disableProximityDetection() {
    this.proximityDetectionActive = false;
  }
  
  setupIdleListeners() {
    // Proximity detection is already set up in enableProximityDetection
  }
  
  setupDragListeners() {
    this.globalListeners.setListeners({
      'mousemove': this.handleConnectorDrag.bind(this),
      'mouseup': this.handleConnectorDragEnd.bind(this)
    });
  }
  
  setupClickToClickListeners() {
    this.globalListeners.setListeners({
      'mousemove': this.handleClickToClickMove.bind(this)
    });
  }
  
  setupHandleDragListeners() {
    this.globalListeners.setListeners({
      'mousemove': this.handleHandleDrag.bind(this),
      'mouseup': this.handleHandleDragEnd.bind(this)
    });
  }
  
  setupCurveHandleDragListeners() {
    this.globalListeners.setListeners({
      'mousemove': this.handleCurveHandleDrag.bind(this),
      'mouseup': this.handleCurveHandleDragEnd.bind(this)
    });
  }
  
  setupDisconnectedDragListeners() {
    this.globalListeners.setListeners({
      'mousemove': this.handleDisconnectedConnectorDrag.bind(this),
      'mouseup': this.handleDisconnectedConnectorDragEnd.bind(this)
    });
  }
  
  clearAllListeners() {
    this.globalListeners.clearAll();
  }
  
  ensureHandleVisibility(connectorId) {
    if (connectorId) {
      const activeConnector = document.querySelector(`.connector-${connectorId}`);
      if (activeConnector) {
        const handles = activeConnector.querySelectorAll('.connector-handle');
        handles.forEach(handle => handle.classList.remove('connector-handle-hidden'));
      }
    }
  }
  
  /**
   * Proximity detection handler for connector handles
   * Updates handle visibility based on mouse proximity
   */
  handleProximityDetection(event) {
    if (!this.proximityDetectionActive) return;
    
    // Throttle updates for performance
    const now = Date.now();
    if (now - this.lastProximityUpdate < this.PROXIMITY_UPDATE_THROTTLE) {
      return;
    }
    this.lastProximityUpdate = now;
    
    const rect = this.boardElement.getBoundingClientRect();
    const boardOrigin = this.board.getOrigin();
    const appState = this.store.getAppState();
    const boardScale = appState.ui.boardScale || 1;
    
    // Validate coordinates
    if (typeof event.clientX !== 'number' || typeof event.clientY !== 'number' ||
        isNaN(event.clientX) || isNaN(event.clientY) ||
        !boardOrigin || typeof boardOrigin.x !== 'number' || typeof boardOrigin.y !== 'number' ||
        isNaN(boardOrigin.x) || isNaN(boardOrigin.y)) {
      return;
    }
    
    // Convert mouse position to board coordinates
    const mouseBoardX = (event.clientX - rect.left) / boardScale - boardOrigin.x;
    const mouseBoardY = (event.clientY - rect.top) / boardScale - boardOrigin.y;
    
    // Get all connector handles on the page
    const allHandles = document.querySelectorAll('.connector-handle');
    
    allHandles.forEach(handle => {
      const positionAttr = handle.getAttribute('data-handle-position');
      if (!positionAttr) return;
      
      const [handleX, handleY] = positionAttr.split(',').map(Number);
      if (isNaN(handleX) || isNaN(handleY)) return;
      
      // Calculate distance from mouse to handle
      const deltaX = mouseBoardX - handleX;
      const deltaY = mouseBoardY - handleY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // Check if handle should be visible based on proximity
      const shouldBeVisible = distance <= this.PROXIMITY_THRESHOLD;
      
      // Handle special cases - always show handles for selected connectors
      const connectorContainer = handle.closest('.connector-container');
      const isSelected = connectorContainer?.classList.contains('selected');
      
      if (isSelected) {
        // Always show handles for selected connectors
        handle.classList.remove('connector-handle-hidden');
      } else if (shouldBeVisible) {
        // Show based on proximity for non-selected connectors
        handle.classList.remove('connector-handle-hidden');
      } else {
        // Hide based on proximity for non-selected connectors
        handle.classList.add('connector-handle-hidden');
      }
    });
  }
  
  /**
   * Event handling wrapper with debug logging
   */
  handleEvent(eventName, event, handlerFn) {
    if (this.isDebugMode()) {
      console.log(`[ConnectorEvent] ${eventName} in ${this.currentState}`, {
        target: event.target?.className || 'unknown',
        handler: handlerFn.name,
        stateData: { ...this.stateData }
      });
    }
    
    try {
      return handlerFn(event, this.stateData);
    } catch (error) {
      console.error(`[ConnectorError] in ${handlerFn.name}:`, error);
      // Reset to safe state
      this.transitionTo(ConnectorState.IDLE, 'error recovery');
      throw error;
    }
  }
  
  /**
   * Sub-handler architecture with explicit precedence
   */
  getConnectorHandlers() {
    return {
      // Handler for new connector creation
      newConnectorCreation: {
        canHandle: (event, state, appState) => {
          return state === ConnectorState.IDLE && 
                 appState.ui.nextClickCreatesConnector;
        },
        
        onMouseDown: (event, stateData) => {
          const appState = this.store.getAppState();
          
          event.preventDefault();
          event.stopPropagation();
          
          const rect = this.boardElement.getBoundingClientRect();
          const boardOrigin = this.board.getOrigin();
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
          
          stateData.connectorId = this.board.putConnector(connectorData);
          
          // Select the newly created connector
          this.selectionManager.selectItem('connectors', stateData.connectorId);
          
          // Trigger menu update
          if (window.menuRenderCallback) {
            window.menuRenderCallback();
          }
          
          // Transition to dragging state
          this.transitionTo(ConnectorState.DRAGGING_NEW, 'new connector creation started');
        }
      },
      
      // Handler for dragging curve control handles
      curveHandleDragging: {
        canHandle: (event, state, appState) => {
          const handle = event.target.closest('.curve-control-handle');
          return state === ConnectorState.IDLE && 
                 handle !== null &&
                 !appState.ui.nextClickCreatesConnector;
        },
        
        onMouseDown: (event, stateData) => {
          const handle = event.target.closest('.curve-control-handle');
          const container = handle.closest('.connector-container');
          const connectorIdClass = Array.from(container.classList).find(cls => cls.startsWith('connector-'));
          const handleConnectorId = connectorIdClass ? connectorIdClass.replace('connector-', '') : null;
          
          event.preventDefault();
          event.stopPropagation();
          
          stateData.connectorId = handleConnectorId;
          
          this.transitionTo(ConnectorState.DRAGGING_CURVE_HANDLE, 'curve handle drag started');
        }
      },
      
      // Handler for dragging existing connector handles
      handleDragging: {
        canHandle: (event, state, appState) => {
          const handle = event.target.closest('.connector-handle');
          // Exclude curve control handles - they have their own handler
          const isCurveHandle = handle && handle.classList.contains('curve-control-handle');
          return state === ConnectorState.IDLE && 
                 handle !== null &&
                 !isCurveHandle &&
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
          
          this.transitionTo(ConnectorState.DRAGGING_HANDLE, 'handle drag started');
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
          
          const rect = this.boardElement.getBoundingClientRect();
          const boardOrigin = this.board.getOrigin();
          const appState = this.store.getAppState();
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
              this.board.updateConnectorEndpoint(stateData.connectorId, 'destination', { stickyId });
            }
          } else if (imageContainer) {
            const imageIdClass = Array.from(imageContainer.classList).find(cls => cls.startsWith('image-') && cls !== 'image-container');
            const imageId = imageIdClass ? imageIdClass.replace('image-', '') : null;
            
            if (imageId) {
              this.board.updateConnectorEndpoint(stateData.connectorId, 'destination', { imageId });
            }
          } else {
            this.board.updateConnectorEndpoint(stateData.connectorId, 'destination', { point });
          }
          
          // Complete connector creation
          appState.ui.nextClickCreatesConnector = false;
          
          this.transitionTo(ConnectorState.IDLE, 'click-to-click connector creation completed');
          
          // Notify keyboard handler that connector creation is complete
          completeKeyboardAction('connector created (click-to-click)', appState);
          
          // Trigger re-render
          if (this.renderCallback) {
            this.renderCallback();
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
          
          const connector = this.board.getConnectorSafe(connectorId);
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
          this.selectionManager.selectItem('connectors', connectorId, {
            addToSelection: event.shiftKey
          });
          
          // Trigger full render to update menu
          this.renderCallback();
          
          stateData.connectorId = connectorId;
          
          const rect = this.boardElement.getBoundingClientRect();
          const boardOrigin = this.board.getOrigin();
          const appState = this.store.getAppState();
          const boardScale = appState.ui.boardScale || 1;
          
          stateData.dragStartPoint = {
            x: (event.clientX - rect.left) / boardScale - boardOrigin.x,
            y: (event.clientY - rect.top) / boardScale - boardOrigin.y
          };
          
          this.transitionTo(ConnectorState.DRAGGING_DISCONNECTED, 'disconnected connector drag started');
        }
      }
    };
  }
  
  // Explicit priority order
  getHandlerPriority() {
    return [
      'clickToClickCompletion',    // Highest - overrides everything
      'curveHandleDragging',        // High priority - curve handle dragging
      'handleDragging',             // Mid priority
      'disconnectedDragging',       // Mid priority
      'newConnectorCreation',       // Lowest - only if nothing else matched
    ];
  }
  
  /**
   * Single entry point with routing
   */
  routeMouseDown(event) {
    const appState = this.store.getAppState();
    const handlers = this.getConnectorHandlers();
    
    // Route to appropriate handler based on current state and context
    for (const handlerName of this.getHandlerPriority()) {
      const handler = handlers[handlerName];
      if (handler.canHandle && handler.canHandle(event, this.currentState, appState)) {
        if (handler.onMouseDown) {
          return this.handleEvent('mousedown', event, handler.onMouseDown);
        }
      }
    }
  }
  
  routeMouseUp(event) {
    // Route based on current state
    switch(this.currentState) {
      case ConnectorState.DRAGGING_NEW:
        return this.handleEvent('mouseup', event, this.handleConnectorDragEnd.bind(this));
      
      case ConnectorState.CLICK_TO_CLICK_WAITING:
        const handlers = this.getConnectorHandlers();
        const handler = handlers.clickToClickCompletion;
        if (handler.onMouseUp) {
          return this.handleEvent('mouseup', event, handler.onMouseUp);
        }
        break;
      
      case ConnectorState.DRAGGING_HANDLE:
        return this.handleEvent('mouseup', event, this.handleHandleDragEnd.bind(this));
      
      case ConnectorState.DRAGGING_CURVE_HANDLE:
        return this.handleEvent('mouseup', event, this.handleCurveHandleDragEnd.bind(this));
      
      case ConnectorState.DRAGGING_DISCONNECTED:
        return this.handleEvent('mouseup', event, this.handleDisconnectedConnectorDragEnd.bind(this));
      
      default:
        return; // Ignore mouseup in other states
    }
  }
  
  // Event handlers for different states
  handleConnectorDrag(event) {
    if (this.currentState !== ConnectorState.DRAGGING_NEW || !this.stateData.connectorId) return;
    
    const rect = this.boardElement.getBoundingClientRect();
    const boardOrigin = this.board.getOrigin();
    const appState = this.store.getAppState();
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
    const deltaX = point.x - this.stateData.dragStartPoint.x;
    const deltaY = point.y - this.stateData.dragStartPoint.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance > minDragDistance) {
      // This is a drag, not a click - exit click-to-click mode
      if (this.stateData.timeout) {
        clearTimeout(this.stateData.timeout);
        this.stateData.timeout = null;
      }
    }
    
    // Update the destination point
    this.board.updateConnectorEndpoint(this.stateData.connectorId, 'destination', { point });
  }

  handleConnectorDragEnd(event) {
    if (this.currentState !== ConnectorState.DRAGGING_NEW || !this.stateData.connectorId) return;
    
    const rect = this.boardElement.getBoundingClientRect();
    const boardOrigin = this.board.getOrigin();
    const appState = this.store.getAppState();
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
    const deltaX = point.x - this.stateData.dragStartPoint.x;
    const deltaY = point.y - this.stateData.dragStartPoint.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance <= minDragDistance) {
      // This was a click, not a drag - enter click-to-click mode
      this.stateData.timeout = setTimeout(() => {
        this.cancelClickToClickMode();
      }, 30000);
      
      this.transitionTo(ConnectorState.CLICK_TO_CLICK_WAITING, 'small movement detected, entering click-to-click mode');
      
      // Trigger re-render
      if (this.renderCallback) {
        this.renderCallback();
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
        this.board.updateConnectorEndpoint(this.stateData.connectorId, 'destination', { stickyId });
      }
    } else if (imageContainer) {
      const imageIdClass = Array.from(imageContainer.classList).find(cls => cls.startsWith('image-') && cls !== 'image-container');
      const imageId = imageIdClass ? imageIdClass.replace('image-', '') : null;
      
      if (imageId) {
        this.board.updateConnectorEndpoint(this.stateData.connectorId, 'destination', { imageId });
      }
    } else {
      this.board.updateConnectorEndpoint(this.stateData.connectorId, 'destination', { point });
    }
    
    // Exit connector creation mode
    appState.ui.nextClickCreatesConnector = false;
    
    this.transitionTo(ConnectorState.IDLE, 'connector creation completed');
    
    // Notify keyboard handler that connector creation is complete
    completeKeyboardAction('connector created', appState);
    
    // Trigger re-render
    if (this.renderCallback) {
      this.renderCallback();
    }
  }

  handleClickToClickMove(event) {
    if (this.currentState !== ConnectorState.CLICK_TO_CLICK_WAITING || !this.stateData.connectorId) return;
    
    const rect = this.boardElement.getBoundingClientRect();
    const boardOrigin = this.board.getOrigin();
    const appState = this.store.getAppState();
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
    this.board.updateConnectorEndpoint(this.stateData.connectorId, 'destination', { point });
  }

  handleHandleDrag(event) {
    if (this.currentState !== ConnectorState.DRAGGING_HANDLE || !this.stateData.connectorId) return;
    
    const rect = this.boardElement.getBoundingClientRect();
    const boardOrigin = this.board.getOrigin();
    const appState = this.store.getAppState();
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
    this.board.updateConnectorEndpoint(this.stateData.connectorId, this.stateData.handleType, { point });
  }

  handleHandleDragEnd(event) {
    if (this.currentState !== ConnectorState.DRAGGING_HANDLE || !this.stateData.connectorId) return;
    
    const rect = this.boardElement.getBoundingClientRect();
    const boardOrigin = this.board.getOrigin();
    const appState = this.store.getAppState();
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
        this.board.updateConnectorEndpoint(this.stateData.connectorId, this.stateData.handleType, { stickyId });
      }
    } else if (imageContainer) {
      const imageIdClass = Array.from(imageContainer.classList).find(cls => cls.startsWith('image-') && cls !== 'image-container');
      const imageId = imageIdClass ? imageIdClass.replace('image-', '') : null;
      
      if (imageId) {
        this.board.updateConnectorEndpoint(this.stateData.connectorId, this.stateData.handleType, { imageId });
      }
    } else {
      this.board.updateConnectorEndpoint(this.stateData.connectorId, this.stateData.handleType, { point });
    }
    
    this.transitionTo(ConnectorState.IDLE, 'handle drag completed');
    
    // Trigger re-render
    if (this.renderCallback) {
      this.renderCallback();
    }
  }

  handleCurveHandleDrag(event) {
    if (this.currentState !== ConnectorState.DRAGGING_CURVE_HANDLE || !this.stateData.connectorId) return;
    
    const rect = this.boardElement.getBoundingClientRect();
    const boardOrigin = this.board.getOrigin();
    const appState = this.store.getAppState();
    const boardScale = appState.ui.boardScale || 1;
    
    // Validate coordinates
    if (typeof event.clientX !== 'number' || typeof event.clientY !== 'number' ||
        isNaN(event.clientX) || isNaN(event.clientY) ||
        !boardOrigin || typeof boardOrigin.x !== 'number' || typeof boardOrigin.y !== 'number' ||
        isNaN(boardOrigin.x) || isNaN(boardOrigin.y)) {
      console.warn('Invalid mouse coordinates or board origin during curve handle drag:', { 
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
    
    // Update the curve control point
    this.board.updateCurveControlPoint(this.stateData.connectorId, point);
  }

  handleCurveHandleDragEnd(event) {
    if (this.currentState !== ConnectorState.DRAGGING_CURVE_HANDLE || !this.stateData.connectorId) return;
    
    this.transitionTo(ConnectorState.IDLE, 'curve handle drag completed');
    
    // Trigger re-render
    if (this.renderCallback) {
      this.renderCallback();
    }
  }

  handleDisconnectedConnectorDrag(event) {
    if (this.currentState !== ConnectorState.DRAGGING_DISCONNECTED || !this.stateData.connectorId) return;
    
    const rect = this.boardElement.getBoundingClientRect();
    const boardOrigin = this.board.getOrigin();
    const appState = this.store.getAppState();
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
    const deltaX = currentPoint.x - this.stateData.dragStartPoint.x;
    const deltaY = currentPoint.y - this.stateData.dragStartPoint.y;
    
    // Only start dragging if we've moved a minimum distance (to distinguish from clicks)
    const minDragDistance = 5; // pixels
    if (Math.abs(deltaX) > minDragDistance || Math.abs(deltaY) > minDragDistance) {
      // Move the connector
      this.board.moveConnector(this.stateData.connectorId, deltaX, deltaY);
      
      // Update the drag start point for smooth dragging
      this.stateData.dragStartPoint = currentPoint;
    }
  }

  handleDisconnectedConnectorDragEnd(event) {
    if (this.currentState !== ConnectorState.DRAGGING_DISCONNECTED || !this.stateData.connectorId) return;
    
    this.transitionTo(ConnectorState.IDLE, 'disconnected connector drag completed');
    
    // Trigger re-render
    if (this.renderCallback) {
      this.renderCallback();
    }
  }

  // Helper function to cancel click-to-click mode
  cancelClickToClickMode() {
    if (this.currentState === ConnectorState.CLICK_TO_CLICK_WAITING && this.stateData.connectorId) {
      // Remove the temporary connector
      this.board.deleteConnector(this.stateData.connectorId);
      
      // Exit connector creation mode
      const appState = this.store.getAppState();
      appState.ui.nextClickCreatesConnector = false;
      
      this.transitionTo(ConnectorState.IDLE, 'click-to-click mode cancelled');
      
      // Notify keyboard handler that connector creation is cancelled
      completeKeyboardAction('connector creation cancelled', appState);
      
      // Trigger re-render
      if (this.renderCallback) {
        this.renderCallback();
      }
    }
  }
  
  setupEventListeners() {
    // Single entry point event listeners
    this.boardElement.addEventListener('mousedown', this.routeMouseDown.bind(this));
    this.boardElement.addEventListener('mouseup', this.routeMouseUp.bind(this));
    
    // Handle connector selection
    this.boardElement.addEventListener('click', (event) => {
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
      const connector = this.board.getConnectorSafe(connectorId);
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
        this.selectionManager.selectItem('connectors', connectorId, {
          addToSelection: event.shiftKey
        });
        
        // Trigger full render to update menu
        this.renderCallback();
      }
    });

    // Handle escape key to cancel click-to-click mode
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.currentState === ConnectorState.CLICK_TO_CLICK_WAITING) {
        this.cancelClickToClickMode();
      }
    });
  }
  
  cleanup() {
    this.globalListeners.clearAll();
    
    // Disable proximity detection
    this.proximityDetectionActive = false;
    
    // Clean up click-to-click mode
    if (this.stateData.timeout) {
      clearTimeout(this.stateData.timeout);
      this.stateData.timeout = null;
    }
    
    // Reset state
    this.transitionTo(ConnectorState.IDLE, 'cleanup');
  }
  
  // Debug functions
  getCurrentState() {
    return this.currentState;
  }
  
  getStateData() {
    return { ...this.stateData };
  }
  
  getActiveListeners() {
    return this.globalListeners.getActiveListeners();
  }
}

/**
 * Setup function that creates and returns a ConnectorStateMachine instance
 */
export function setupConnectorEvents(boardElement, board, selectionManager, renderCallback, store) {
  const stateMachine = new ConnectorStateMachine(boardElement, board, selectionManager, renderCallback, store);
  
  return {
    // Cleanup function
    cleanup: () => stateMachine.cleanup(),
    
    // Debug functions
    getCurrentState: () => stateMachine.getCurrentState(),
    getStateData: () => stateMachine.getStateData(),
    getActiveListeners: () => stateMachine.getActiveListeners()
  };
}
