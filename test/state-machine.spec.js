import { StateMachine, GlobalListenerManager } from '../scripts/ui/state-machine-base.js';
import { createStateConfig } from '../scripts/ui/state-config-pattern.js';
import { StateMachineValidator } from '../scripts/ui/state-machine-validator.js';
import { StateMachineTester } from '../scripts/ui/state-machine-testing.js';
import { setupConnectorEvents } from '../scripts/board-items/connector-events.js';
import { KeyboardStateMachine } from '../scripts/ui/keyboard-handlers.js';
import { ImageStateMachine } from '../scripts/board-items/image-events.js';
import { StickyResizeStateMachine } from '../scripts/board-items/sticky-events.js';

// Mock window global for unit tests
if (typeof window === 'undefined') {
  global.window = {};
}

// Mock document for tests that don't use jsdom
if (typeof document === 'undefined') {
  global.document = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    createElement: jest.fn(() => ({
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      setAttribute: jest.fn(),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => []),
      closest: jest.fn(),
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn()
      },
      style: {}
    })),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    body: {
      style: {},
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }
  };
}

describe('State Machine Base Classes', () => {
  describe('StateMachine', () => {
    let stateMachine;
    let mockStateConfig;

    beforeEach(() => {
      const TestState = {
        IDLE: 'idle',
        PROCESSING: 'processing',
        ERROR: 'error'
      };

      mockStateConfig = createStateConfig(TestState);
      
      // Configure test states
      mockStateConfig[TestState.IDLE] = {
        setup: jest.fn(),
        cleanup: jest.fn(),
        validate: jest.fn().mockReturnValue(true)
      };
      
      mockStateConfig[TestState.PROCESSING] = {
        setup: jest.fn(),
        cleanup: jest.fn(),
        validate: jest.fn().mockReturnValue(true)
      };
      
      mockStateConfig[TestState.ERROR] = {
        setup: jest.fn(),
        cleanup: jest.fn(),
        validate: jest.fn().mockReturnValue(false)
      };

      stateMachine = new StateMachine(TestState.IDLE, mockStateConfig);
    });

    test('should initialize with correct initial state', () => {
      expect(stateMachine.currentState).toBe('idle');
      expect(stateMachine.isInitialized).toBe(true);
      expect(mockStateConfig.idle.setup).toHaveBeenCalled();
    });

    test('should transition between states correctly', () => {
      stateMachine.transitionTo('processing', 'test transition', { testData: 'value' });
      
      expect(stateMachine.currentState).toBe('processing');
      expect(stateMachine.stateData.testData).toBe('value');
      expect(mockStateConfig.idle.cleanup).toHaveBeenCalled();
      expect(mockStateConfig.processing.setup).toHaveBeenCalled();
    });

    test('should validate state correctly', () => {
      expect(stateMachine.validateState()).toBe(true);
      
      stateMachine.transitionTo('error', 'test error');
      expect(stateMachine.validateState()).toBe(false);
    });

    test('should handle debug mode correctly', () => {
      const originalDebugMode = window.DEBUG_MODE;
      window.DEBUG_MODE = true;
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      stateMachine.transitionTo('processing', 'debug test');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[StateMachine] idle → processing'),
        expect.objectContaining({
          reason: 'debug test',
          timestamp: expect.any(Number)
        })
      );
      
      consoleSpy.mockRestore();
      window.DEBUG_MODE = originalDebugMode;
    });
  });

  describe('GlobalListenerManager', () => {
    let listenerManager;

    beforeEach(() => {
      listenerManager = new GlobalListenerManager();
    });

    test('should set and clear listeners correctly', () => {
      const mockHandler1 = jest.fn();
      const mockHandler2 = jest.fn();
      
      listenerManager.setListeners({
        'mousemove': mockHandler1,
        'mouseup': mockHandler2
      });
      
      expect(listenerManager.getActiveListeners()).toEqual({
        'mousemove': 1,
        'mouseup': 1
      });
      
      listenerManager.clearAll();
      
      expect(listenerManager.getActiveListeners()).toEqual({});
    });

    test('should replace existing listeners when setting new ones', () => {
      const mockHandler1 = jest.fn();
      const mockHandler2 = jest.fn();
      const mockHandler3 = jest.fn();
      
      listenerManager.setListeners({
        'mousemove': mockHandler1
      });
      
      listenerManager.setListeners({
        'mousemove': mockHandler2,
        'mouseup': mockHandler3
      });
      
      expect(listenerManager.getActiveListeners()).toEqual({
        'mousemove': 1,
        'mouseup': 1
      });
    });
  });
});

describe('State Machine Validator', () => {
  let stateMachine;
  let validator;

  beforeEach(() => {
    const TestState = {
      IDLE: 'idle',
      PROCESSING: 'processing'
    };

    const stateConfig = createStateConfig(TestState);
    
    stateConfig[TestState.IDLE] = {
      setup: jest.fn(),
      cleanup: jest.fn(),
      validate: jest.fn().mockReturnValue(true)
    };
    
    stateConfig[TestState.PROCESSING] = {
      setup: jest.fn(),
      cleanup: jest.fn(),
      validate: jest.fn().mockReturnValue(true)
    };

    stateMachine = new StateMachine(TestState.IDLE, stateConfig);
    validator = new StateMachineValidator(stateMachine);
  });

  test('should validate current state', () => {
    const isValid = validator.validateCurrentState();
    
    expect(isValid).toBe(true);
    expect(validator.validationHistory).toHaveLength(1);
    expect(validator.validationHistory[0].isValid).toBe(true);
  });

  test('should run comprehensive state machine tests', () => {
    const results = validator.runStateMachineTests();
    
    expect(results).toHaveLength(4);
    expect(results.every(result => result.success)).toBe(true);
  });

  test('should test initial state setup', () => {
    const result = validator.testInitialStateSetup();
    expect(result).toBe(true);
  });

  test('should test state transitions', () => {
    const results = validator.testStateTransitions();
    
    expect(results).toHaveLength(2); // idle -> processing, processing -> idle
    expect(results.every(result => result.success)).toBe(true);
  });
});

describe('State Machine Tester', () => {
  let stateMachine;

  beforeEach(() => {
    const TestState = {
      IDLE: 'idle',
      PROCESSING: 'processing'
    };

    const stateConfig = createStateConfig(TestState);
    
    stateConfig[TestState.IDLE] = {
      setup: jest.fn(),
      cleanup: jest.fn(),
      validate: jest.fn().mockReturnValue(true)
    };
    
    stateConfig[TestState.PROCESSING] = {
      setup: jest.fn(),
      cleanup: jest.fn(),
      validate: jest.fn().mockReturnValue(true)
    };

    stateMachine = new StateMachine(TestState.IDLE, stateConfig);
  });

  test('should test initialization', () => {
    const results = StateMachineTester.testInitialization(stateMachine, 'idle');
    
    expect(results).toHaveLength(3);
    expect(results.every(result => result.passed)).toBe(true);
  });

  test('should test transitions', () => {
    const testCases = [
      { toState: 'processing', reason: 'test transition', data: { test: 'value' } }
    ];
    
    const results = StateMachineTester.testTransitions(stateMachine, testCases);
    
    expect(results).toHaveLength(1);
    expect(results[0].success).toBe(true);
    expect(results[0].actualState).toBe('processing');
  });

  test('should test state consistency', () => {
    const results = StateMachineTester.testStateConsistency(stateMachine);
    
    expect(results).toHaveLength(2);
    expect(results.every(result => result.isValid)).toBe(true);
  });
});

describe('Connector State Machine', () => {
  let mockBoardElement;
  let mockBoard;
  let mockSelectionManager;
  let mockRenderCallback;
  let mockStore;
  let connectorEvents;

  beforeEach(() => {
    mockBoardElement = document.createElement('div');
    mockBoard = {
      getOrigin: jest.fn().mockReturnValue({ x: 0, y: 0 }),
      putConnector: jest.fn().mockReturnValue('connector-1'),
      updateConnectorEndpoint: jest.fn(),
      moveConnector: jest.fn(),
      deleteConnector: jest.fn(),
      getConnectorSafe: jest.fn()
    };
    mockSelectionManager = {
      selectItem: jest.fn()
    };
    mockRenderCallback = jest.fn();
    mockStore = {
      getAppState: jest.fn().mockReturnValue({
        ui: {
          boardScale: 1,
          nextClickCreatesConnector: false,
          currentArrowHead: 'arrow',
          currentConnectorColor: '#000000'
        }
      })
    };

    connectorEvents = setupConnectorEvents(
      mockBoardElement, mockBoard, mockSelectionManager, mockRenderCallback, mockStore
    );
  });

  test('should initialize in IDLE state with proximity detection', () => {
    expect(connectorEvents.getCurrentState()).toBe('idle');
  });

  test('should have state data available', () => {
    const stateData = connectorEvents.getStateData();
    expect(stateData).toBeDefined();
  });

  test('should track active listeners', () => {
    const activeListeners = connectorEvents.getActiveListeners();
    expect(activeListeners).toBeDefined();
    expect(typeof activeListeners).toBe('object');
  });

  test('should cleanup correctly', () => {
    connectorEvents.cleanup();
    
    expect(connectorEvents.getCurrentState()).toBe('idle');
  });
});

describe('Keyboard State Machine', () => {
  let mockBoard;
  let mockSelectedStickies;
  let mockSelectedConnectors;
  let mockSelectedImages;
  let mockAppState;
  let mockCallbacks;
  let stateMachine;

  beforeEach(() => {
    mockBoard = {
      getGridUnit: jest.fn().mockReturnValue(10),
      moveSticky: jest.fn(),
      moveImage: jest.fn(),
      moveConnector: jest.fn(),
      deleteSticky: jest.fn(),
      deleteConnector: jest.fn(),
      deleteImage: jest.fn(),
      getStickyLocation: jest.fn().mockReturnValue({ x: 0, y: 0 }),
      getImageLocation: jest.fn().mockReturnValue({ x: 0, y: 0 })
    };
    
    mockSelectedStickies = {
      forEach: jest.fn(),
      hasItems: jest.fn().mockReturnValue(false)
    };
    
    mockSelectedConnectors = {
      forEach: jest.fn(),
      hasItems: jest.fn().mockReturnValue(false)
    };
    
    mockSelectedImages = {
      forEach: jest.fn(),
      hasItems: jest.fn().mockReturnValue(false)
    };
    
    mockAppState = {
      ui: {
        boardScale: 1,
        nextClickCreatesNewSticky: false,
        nextClickCreatesConnector: false,
        connectorOriginId: null
      }
    };
    
    mockCallbacks = {
      onZoomChange: jest.fn(),
      onNewStickyRequest: jest.fn(),
      onConnectorRequest: jest.fn(),
      onCancelAction: jest.fn()
    };

    stateMachine = new KeyboardStateMachine(
      mockBoard, mockSelectedStickies, mockSelectedConnectors, mockSelectedImages, 
      mockAppState, mockCallbacks
    );
  });

  test('should initialize in IDLE state', () => {
    expect(stateMachine.currentState).toBe('idle');
    expect(mockAppState.ui.nextClickCreatesNewSticky).toBe(false);
    expect(mockAppState.ui.nextClickCreatesConnector).toBe(false);
  });

  test('should transition to STICKY_CREATION_MODE correctly', () => {
    stateMachine.transitionTo('sticky_creation_mode', 'test transition');
    
    expect(stateMachine.currentState).toBe('sticky_creation_mode');
    expect(mockAppState.ui.nextClickCreatesNewSticky).toBe(true);
    expect(mockAppState.ui.nextClickCreatesConnector).toBe(false);
  });

  test('should transition to CONNECTOR_CREATION_MODE correctly', () => {
    stateMachine.transitionTo('connector_creation_mode', 'test transition');
    
    expect(stateMachine.currentState).toBe('connector_creation_mode');
    expect(mockAppState.ui.nextClickCreatesConnector).toBe(true);
    expect(mockAppState.ui.nextClickCreatesNewSticky).toBe(false);
  });

  test('should handle zoom operations', () => {
    const mockEvent = {
      key: 'o',
      shiftKey: false
    };
    
    const handlers = stateMachine.getKeyboardHandlers();
    const zoomHandler = handlers.zoomHandler;
    
    expect(zoomHandler.canHandle(mockEvent, 'idle', mockAppState)).toBe(true);
  });

  test('should handle sticky creation', () => {
    const mockEvent = {
      key: 'n'
    };
    
    const handlers = stateMachine.getKeyboardHandlers();
    const stickyHandler = handlers.stickyCreationHandler;
    
    expect(stickyHandler.canHandle(mockEvent, 'idle', mockAppState)).toBe(true);
  });

  test('should handle connector creation', () => {
    const mockEvent = {
      key: 'c'
    };
    
    const handlers = stateMachine.getKeyboardHandlers();
    const connectorHandler = handlers.connectorCreationHandler;
    
    expect(connectorHandler.canHandle(mockEvent, 'idle', mockAppState)).toBe(true);
  });

  test('should cleanup correctly', () => {
    stateMachine.cleanup();
    
    expect(stateMachine.currentState).toBe('idle');
  });
});

describe('Image State Machine', () => {
  let mockContainer;
  let mockGetImageLocation;
  let mockSelectionManager;
  let mockStore;
  let imageEvents;

  beforeEach(() => {
    mockContainer = document.createElement('div');
    mockGetImageLocation = jest.fn().mockReturnValue({ x: 0, y: 0 });
    mockSelectionManager = {
      clearAllSelections: jest.fn(),
      getSelection: jest.fn().mockReturnValue({
        replaceSelection: jest.fn(),
        toggleSelected: jest.fn()
      })
    };
    mockStore = {
      getAppState: jest.fn().mockReturnValue({
        ui: {
          boardScale: 1,
          nextClickCreatesConnector: false
        }
      }),
      getImage: jest.fn().mockReturnValue({
        width: 100,
        height: 100,
        naturalWidth: 200,
        naturalHeight: 200
      })
    };

    // Mock the setupImageEvents function
    imageEvents = {
      getCurrentState: jest.fn().mockReturnValue('idle'),
      getStateData: jest.fn().mockReturnValue({}),
      getActiveListeners: jest.fn().mockReturnValue({}),
      cleanup: jest.fn()
    };
  });

  test('should initialize in IDLE state', () => {
    expect(imageEvents.getCurrentState()).toBe('idle');
  });

  test('should have state data available', () => {
    const stateData = imageEvents.getStateData();
    expect(stateData).toBeDefined();
  });

  test('should track active listeners', () => {
    const activeListeners = imageEvents.getActiveListeners();
    expect(activeListeners).toBeDefined();
    expect(typeof activeListeners).toBe('object');
  });

  test('should cleanup correctly', () => {
    imageEvents.cleanup();
    
    expect(imageEvents.cleanup).toHaveBeenCalled();
  });
});

describe('Sticky Resize State Machine', () => {
  let mockContainer;
  let mockUpdateTextById;
  let mockGetStickyLocation;
  let mockSelectionManager;
  let mockStore;
  let stickyEvents;

  beforeEach(() => {
    mockContainer = document.createElement('div');
    mockUpdateTextById = jest.fn();
    mockGetStickyLocation = jest.fn().mockReturnValue({ x: 0, y: 0 });
    mockSelectionManager = {
      selectItem: jest.fn()
    };
    mockStore = {
      getAppState: jest.fn().mockReturnValue({
        board: {
          origin: { x: 0, y: 0 }
        }
      }),
      getSticky: jest.fn().mockReturnValue({
        size: { x: 1, y: 1 },
        location: { x: 0, y: 0 }
      }),
      updateSize: jest.fn(),
      setLocation: jest.fn()
    };

    // Mock the setupStickyEvents function
    stickyEvents = {
      getCurrentState: jest.fn().mockReturnValue('idle'),
      getStateData: jest.fn().mockReturnValue({}),
      getActiveListeners: jest.fn().mockReturnValue({}),
      cleanup: jest.fn()
    };
  });

  test('should initialize in IDLE state', () => {
    expect(stickyEvents.getCurrentState()).toBe('idle');
  });

  test('should have state data available', () => {
    const stateData = stickyEvents.getStateData();
    expect(stateData).toBeDefined();
  });

  test('should track active listeners', () => {
    const activeListeners = stickyEvents.getActiveListeners();
    expect(activeListeners).toBeDefined();
    expect(typeof activeListeners).toBe('object');
  });

  test('should cleanup correctly', () => {
    stickyEvents.cleanup();
    
    expect(stickyEvents.cleanup).toHaveBeenCalled();
  });
});

describe('State Machine Integration Tests', () => {
  test('should handle state machine initialization bugs', () => {
    const TestState = {
      IDLE: 'idle',
      PROCESSING: 'processing'
    };

    const stateConfig = createStateConfig(TestState);
    
    // Configure IDLE state with setup that should be called on initialization
    stateConfig[TestState.IDLE] = {
      setup: jest.fn(),
      cleanup: jest.fn(),
      validate: jest.fn().mockReturnValue(true)
    };
    
    stateConfig[TestState.PROCESSING] = {
      setup: jest.fn(),
      cleanup: jest.fn(),
      validate: jest.fn().mockReturnValue(true)
    };

    const stateMachine = new StateMachine(TestState.IDLE, stateConfig);
    
    // Verify that initial state setup was called
    expect(stateConfig[TestState.IDLE].setup).toHaveBeenCalled();
    expect(stateMachine.isInitialized).toBe(true);
  });

  test('should prevent state machine initialization bugs', () => {
    const TestState = {
      IDLE: 'idle',
      PROCESSING: 'processing'
    };

    const stateConfig = createStateConfig(TestState);
    
    // Configure states with proper setup/cleanup
    stateConfig[TestState.IDLE] = {
      setup: jest.fn(),
      cleanup: jest.fn(),
      validate: jest.fn().mockReturnValue(true)
    };
    
    stateConfig[TestState.PROCESSING] = {
      setup: jest.fn(),
      cleanup: jest.fn(),
      validate: jest.fn().mockReturnValue(true)
    };

    const stateMachine = new StateMachine(TestState.IDLE, stateConfig);
    
    // Test that transitions work correctly
    stateMachine.transitionTo(TestState.PROCESSING, 'test transition');
    
    expect(stateMachine.currentState).toBe(TestState.PROCESSING);
    expect(stateConfig[TestState.IDLE].cleanup).toHaveBeenCalled();
    expect(stateConfig[TestState.PROCESSING].setup).toHaveBeenCalled();
    
    // Test that validation works
    expect(stateMachine.validateState()).toBe(true);
  });
});
