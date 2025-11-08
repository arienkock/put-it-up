import { 
  setupKeyboardHandlers, 
  deleteSelectedItems, 
  getKeyboardState, 
  forceKeyboardStateTransition,
  completeKeyboardAction
} from "../scripts/ui/keyboard-handlers.js";
import { Board } from "../scripts/board/board.js";
import { LocalDatastore } from "../scripts/board/local-datastore.js";

// Mock window global for unit tests that import modules directly
if (typeof window === 'undefined') {
  global.window = {};
}

// Mock getAppState function before any imports that use it
const mockAppState = {
  board: undefined,
  stickies: {},
  connectors: {},
  images: {},
  idGen: 0,
  connectorIdGen: 0,
  imageIdGen: 0,
  ui: {
    boardScale: 1.0,
    currentColor: "khaki",
    currentStickyColor: "khaki",
    currentConnectorColor: "#000000",
    currentArrowHead: "filled",
    nextClickCreatesNewSticky: false,
    nextClickCreatesConnector: false,
    connectorOriginId: null,
    stickiesMovedByDragging: [],
    imagesMovedByDragging: [],
    selection: {},
    connectorSelection: {},
    imageSelection: {},
  },
};

// Mock the getAppState function
jest.mock('../scripts/app-state.js', () => ({
  getAppState: () => mockAppState
}));

// Mock DOM methods
const mockDocument = {
  body: {
    onkeydown: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  },
  querySelector: jest.fn()
};

// Mock global document
global.document = mockDocument;

// Mock KeyboardEvent
global.KeyboardEvent = class KeyboardEvent {
  constructor(type, options = {}) {
    this.type = type;
    this.key = options.key || '';
    this.shiftKey = options.shiftKey || false;
    this.ctrlKey = options.ctrlKey || false;
    this.altKey = options.altKey || false;
    this.preventDefault = jest.fn();
    this.stopPropagation = jest.fn();
  }
};

// Mock console methods
const consoleSpy = {
  log: jest.spyOn(console, 'log').mockImplementation(),
  error: jest.spyOn(console, 'error').mockImplementation()
};

beforeEach(() => {
  // Reset window.appState before each test
  window.appState = undefined;
  // Initialize appState properly
  window.appState = {
    board: undefined,
    stickies: {},
    connectors: {},
    images: {},
    idGen: 0,
    connectorIdGen: 0,
    imageIdGen: 0,
    ui: {
      boardScale: 1.0,
      currentColor: "khaki",
      currentStickyColor: "khaki",
      currentConnectorColor: "#000000",
      currentArrowHead: "filled",
      nextClickCreatesNewSticky: false,
      nextClickCreatesConnector: false,
      connectorOriginId: null,
      stickiesMovedByDragging: [],
      imagesMovedByDragging: [],
      selection: {},
      connectorSelection: {},
      imageSelection: {},
    },
  };
  
  // Reset mocks
  jest.clearAllMocks();
  mockDocument.body.onkeydown = null;
  mockDocument.querySelector.mockReturnValue(null);
});

describe("Keyboard Handlers - Refactored Architecture", () => {
  let board;
  let store;
  let selectionManager;
  let selectedConnectors;
  let appState;
  let callbacks;

  beforeEach(() => {
    store = new LocalDatastore();
    board = new Board(store);
    
    // Create mock selections that persist across calls
    const stickySelection = {
      hasItems: jest.fn(() => false),
      forEach: jest.fn(),
      isSelected: jest.fn(() => false)
    };
    const imageSelection = {
      hasItems: jest.fn(() => false),
      forEach: jest.fn(),
      isSelected: jest.fn(() => false)
    };
    
    // Create SelectionManager with mock selections
    selectionManager = {
      getSelection: jest.fn((selectionType) => {
        if (selectionType === 'stickies') {
          return stickySelection;
        } else if (selectionType === 'images') {
          return imageSelection;
        }
        return null;
      })
    };
    
    selectedConnectors = {
      hasItems: jest.fn(() => false),
      forEach: jest.fn(),
      isSelected: jest.fn(() => false)
    };
    
    appState = {
      ui: {
        boardScale: 1.0,
        nextClickCreatesNewSticky: false,
        nextClickCreatesConnector: false,
        connectorOriginId: null
      }
    };
    
    callbacks = {
      onZoomChange: jest.fn(),
      onNewStickyRequest: jest.fn(),
      onConnectorRequest: jest.fn(),
      onCancelAction: jest.fn()
    };
  });

  describe("State Machine", () => {
    it("should initialize in IDLE state", () => {
      const cleanup = setupKeyboardHandlers(
        board, selectionManager, selectedConnectors, appState, callbacks
      );
      
      const state = getKeyboardState();
      expect(state.currentState).toBe('idle');
      expect(state.stateData.activeMode).toBeNull();
      
      cleanup();
    });

    it("should transition to STICKY_CREATION_MODE when 'n' is pressed", () => {
      const cleanup = setupKeyboardHandlers(
        board, selectionManager, selectedConnectors, appState, callbacks
      );
      
      const event = new KeyboardEvent('keydown', { key: 'n' });
      mockDocument.body.addEventListener.mock.calls[0][1](event);
      
      const state = getKeyboardState();
      expect(state.currentState).toBe('sticky_creation_mode');
      expect(state.stateData.activeMode).toBe('sticky_creation');
      expect(appState.ui.nextClickCreatesNewSticky).toBe(true);
      
      cleanup();
    });

    it("should transition to CONNECTOR_CREATION_MODE when 'c' is pressed", () => {
      const cleanup = setupKeyboardHandlers(
        board, selectionManager, selectedConnectors, appState, callbacks
      );
      
      const event = new KeyboardEvent('keydown', { key: 'c' });
      mockDocument.body.addEventListener.mock.calls[0][1](event);
      
      const state = getKeyboardState();
      expect(state.currentState).toBe('connector_creation_mode');
      expect(state.stateData.activeMode).toBe('connector_creation');
      expect(appState.ui.nextClickCreatesConnector).toBe(true);
      
      cleanup();
    });

    it("should transition back to IDLE when Escape is pressed", () => {
      const cleanup = setupKeyboardHandlers(
        board, selectionManager, selectedConnectors, appState, callbacks
      );
      
      // First activate sticky creation mode
      appState.ui.nextClickCreatesNewSticky = true;
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      mockDocument.body.addEventListener.mock.calls[0][1](event);
      
      const state = getKeyboardState();
      expect(state.currentState).toBe('idle');
      expect(state.stateData.activeMode).toBeNull();
      expect(appState.ui.nextClickCreatesNewSticky).toBe(false);
      
      cleanup();
    });

    it("should log state transitions when debug mode is enabled", () => {
      // Set DEBUG_MODE to true for this test
      window.DEBUG_MODE = true;
      const cleanup = setupKeyboardHandlers(
        board, selectionManager, selectedConnectors, appState, callbacks
      );
      
      const event = new KeyboardEvent('keydown', { key: 'n' });
      mockDocument.body.addEventListener.mock.calls[0][1](event);
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[KeyboardStateMachine] idle → sticky_creation_mode'),
        expect.objectContaining({
          reason: 'sticky creation mode activated',
          timestamp: expect.any(Number)
        })
      );
      
      cleanup();
    });
  });

  describe("Handler Precedence", () => {
    beforeEach(() => {
      setupKeyboardHandlers(
        board, selectionManager, selectedConnectors, appState, callbacks
      );
    });

    it("should prioritize cancelHandler over other handlers", () => {
      appState.ui.nextClickCreatesNewSticky = true;
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      
      mockDocument.body.addEventListener.mock.calls[0][1](event);
      
      expect(callbacks.onCancelAction).toHaveBeenCalled();
      expect(appState.ui.nextClickCreatesNewSticky).toBe(false);
    });

    it("should prioritize deleteHandler over movement handlers", () => {
      const stickySelection = selectionManager.getSelection('stickies');
      stickySelection.hasItems.mockReturnValue(true);
      const event = new KeyboardEvent('keydown', { key: 'Delete' });
      
      mockDocument.body.addEventListener.mock.calls[0][1](event);
      
      expect(stickySelection.forEach).toHaveBeenCalled();
    });

    it("should prioritize movementHandler over zoom handlers", () => {
      const stickySelection = selectionManager.getSelection('stickies');
      stickySelection.hasItems.mockReturnValue(true);
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      
      mockDocument.body.addEventListener.mock.calls[0][1](event);
      
      expect(stickySelection.forEach).toHaveBeenCalled();
    });
  });

  describe("Individual Handlers", () => {
    beforeEach(() => {
      setupKeyboardHandlers(
        board, selectionManager, selectedConnectors, appState, callbacks
      );
    });

    describe("zoomHandler", () => {
      it("should handle zoom in with 'o' key", () => {
        const event = new KeyboardEvent('keydown', { key: 'o' });
        
        mockDocument.body.addEventListener.mock.calls[0][1](event);
        
        expect(callbacks.onZoomChange).toHaveBeenCalled();
      });

      it("should handle zoom out with 'O' key (shift)", () => {
        const event = new KeyboardEvent('keydown', { key: 'O', shiftKey: true });
        
        mockDocument.body.addEventListener.mock.calls[0][1](event);
        
        expect(callbacks.onZoomChange).toHaveBeenCalled();
      });
    });

    describe("stickyCreationHandler", () => {
      it("should activate sticky creation mode with 'n' key", () => {
        const event = new KeyboardEvent('keydown', { key: 'n' });
        
        mockDocument.body.addEventListener.mock.calls[0][1](event);
        
        expect(appState.ui.nextClickCreatesNewSticky).toBe(true);
        expect(appState.ui.nextClickCreatesConnector).toBe(false);
        expect(appState.ui.connectorOriginId).toBeNull();
        expect(callbacks.onNewStickyRequest).toHaveBeenCalled();
      });

      it("should not activate sticky creation mode when not in IDLE state", () => {
        // Force transition to sticky creation mode
        forceKeyboardStateTransition('sticky_creation_mode', 'test', appState);
        
        const event = new KeyboardEvent('keydown', { key: 'n' });
        
        mockDocument.body.addEventListener.mock.calls[0][1](event);
        
        expect(callbacks.onNewStickyRequest).not.toHaveBeenCalled();
      });
    });

    describe("connectorCreationHandler", () => {
      it("should activate connector creation mode with 'c' key", () => {
        const event = new KeyboardEvent('keydown', { key: 'c' });
        
        mockDocument.body.addEventListener.mock.calls[0][1](event);
        
        expect(appState.ui.nextClickCreatesConnector).toBe(true);
        expect(appState.ui.nextClickCreatesNewSticky).toBe(false);
        expect(appState.ui.connectorOriginId).toBeNull();
        expect(callbacks.onConnectorRequest).toHaveBeenCalled();
      });

      it("should not activate connector creation mode when not in IDLE state", () => {
        // Force transition to connector creation mode
        forceKeyboardStateTransition('connector_creation_mode', 'test', appState);
        
        const event = new KeyboardEvent('keydown', { key: 'c' });
        
        mockDocument.body.addEventListener.mock.calls[0][1](event);
        
        expect(callbacks.onConnectorRequest).not.toHaveBeenCalled();
      });
    });

    describe("cancelHandler", () => {
      it("should cancel sticky creation mode with Escape", () => {
        appState.ui.nextClickCreatesNewSticky = true;
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        
        mockDocument.body.addEventListener.mock.calls[0][1](event);
        
        expect(appState.ui.nextClickCreatesNewSticky).toBe(false);
        expect(appState.ui.nextClickCreatesConnector).toBe(false);
        expect(appState.ui.connectorOriginId).toBeNull();
        expect(callbacks.onCancelAction).toHaveBeenCalled();
      });

      it("should cancel connector creation mode with Escape", () => {
        appState.ui.nextClickCreatesConnector = true;
        appState.ui.connectorOriginId = 'test-id';
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        
        mockDocument.body.addEventListener.mock.calls[0][1](event);
        
        expect(appState.ui.nextClickCreatesNewSticky).toBe(false);
        expect(appState.ui.nextClickCreatesConnector).toBe(false);
        expect(appState.ui.connectorOriginId).toBeNull();
        expect(callbacks.onCancelAction).toHaveBeenCalled();
      });

      it("should not cancel when not in creation mode", () => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        
        mockDocument.body.addEventListener.mock.calls[0][1](event);
        
        expect(callbacks.onCancelAction).not.toHaveBeenCalled();
      });
    });

    describe("deleteHandler", () => {
      it("should delete selected items with Delete key", () => {
        const stickySelection = selectionManager.getSelection('stickies');
        const imageSelection = selectionManager.getSelection('images');
        stickySelection.hasItems.mockReturnValue(true);
        selectedConnectors.hasItems.mockReturnValue(true);
        imageSelection.hasItems.mockReturnValue(true);
        
        const event = new KeyboardEvent('keydown', { key: 'Delete' });
        
        mockDocument.body.addEventListener.mock.calls[0][1](event);
        
        expect(stickySelection.forEach).toHaveBeenCalled();
        expect(selectedConnectors.forEach).toHaveBeenCalled();
        expect(imageSelection.forEach).toHaveBeenCalled();
      });

      it("should delete selected items with Backspace key", () => {
        const stickySelection = selectionManager.getSelection('stickies');
        const imageSelection = selectionManager.getSelection('images');
        stickySelection.hasItems.mockReturnValue(true);
        selectedConnectors.hasItems.mockReturnValue(true);
        imageSelection.hasItems.mockReturnValue(true);
        
        const event = new KeyboardEvent('keydown', { key: 'Backspace' });
        
        mockDocument.body.addEventListener.mock.calls[0][1](event);
        
        expect(stickySelection.forEach).toHaveBeenCalled();
        expect(selectedConnectors.forEach).toHaveBeenCalled();
        expect(imageSelection.forEach).toHaveBeenCalled();
      });

      it("should not delete when editing sticky with Backspace", () => {
        const mockElement = {
          classList: {
            contains: jest.fn((cls) => cls === 'sticky-container' || cls === 'editing')
          }
        };
        mockDocument.querySelector.mockReturnValue(mockElement);
        const stickySelection = selectionManager.getSelection('stickies');
        const imageSelection = selectionManager.getSelection('images');
        const event = new KeyboardEvent('keydown', { key: 'Backspace' });
        
        mockDocument.body.addEventListener.mock.calls[0][1](event);
        
        expect(stickySelection.forEach).not.toHaveBeenCalled();
        expect(selectedConnectors.forEach).not.toHaveBeenCalled();
        expect(imageSelection.forEach).not.toHaveBeenCalled();
      });

      it("should still delete with Delete key when editing sticky", () => {
        const mockElement = {
          classList: {
            contains: jest.fn((cls) => cls === 'sticky-container' || cls === 'editing')
          }
        };
        mockDocument.querySelector.mockReturnValue(mockElement);
        const stickySelection = selectionManager.getSelection('stickies');
        const imageSelection = selectionManager.getSelection('images');
        stickySelection.hasItems.mockReturnValue(true);
        selectedConnectors.hasItems.mockReturnValue(true);
        imageSelection.hasItems.mockReturnValue(true);
        
        const event = new KeyboardEvent('keydown', { key: 'Delete' });
        
        mockDocument.body.addEventListener.mock.calls[0][1](event);
        
        expect(stickySelection.forEach).toHaveBeenCalled();
        expect(selectedConnectors.forEach).toHaveBeenCalled();
        expect(imageSelection.forEach).toHaveBeenCalled();
      });
    });

    describe("movementHandler", () => {
      it("should move selection with ArrowUp", () => {
        const stickySelection = selectionManager.getSelection('stickies');
        stickySelection.hasItems.mockReturnValue(true);
        const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
        
        mockDocument.body.addEventListener.mock.calls[0][1](event);
        
        expect(event.preventDefault).toHaveBeenCalled();
        expect(stickySelection.forEach).toHaveBeenCalled();
      });

      it("should move selection with ArrowDown", () => {
        const stickySelection = selectionManager.getSelection('stickies');
        stickySelection.hasItems.mockReturnValue(true);
        const event = new KeyboardEvent('keydown', { key: 'ArrowDown' });
        
        mockDocument.body.addEventListener.mock.calls[0][1](event);
        
        expect(event.preventDefault).toHaveBeenCalled();
        expect(stickySelection.forEach).toHaveBeenCalled();
      });

      it("should move selection with ArrowLeft", () => {
        const stickySelection = selectionManager.getSelection('stickies');
        stickySelection.hasItems.mockReturnValue(true);
        const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
        
        mockDocument.body.addEventListener.mock.calls[0][1](event);
        
        expect(event.preventDefault).toHaveBeenCalled();
        expect(stickySelection.forEach).toHaveBeenCalled();
      });

      it("should move selection with ArrowRight", () => {
        const stickySelection = selectionManager.getSelection('stickies');
        stickySelection.hasItems.mockReturnValue(true);
        const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
        
        mockDocument.body.addEventListener.mock.calls[0][1](event);
        
        expect(event.preventDefault).toHaveBeenCalled();
        expect(stickySelection.forEach).toHaveBeenCalled();
      });

      it("should not move when no items are selected", () => {
        const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
        
        mockDocument.body.addEventListener.mock.calls[0][1](event);
        
        const stickySelection = selectionManager.getSelection('stickies');
        expect(stickySelection.forEach).not.toHaveBeenCalled();
      });

      it("should move images when selected", () => {
        const imageSelection = selectionManager.getSelection('images');
        imageSelection.hasItems.mockReturnValue(true);
        const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
        
        mockDocument.body.addEventListener.mock.calls[0][1](event);
        
        expect(imageSelection.forEach).toHaveBeenCalled();
      });

      it("should move connectors when selected", () => {
        selectedConnectors.hasItems.mockReturnValue(true);
        const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
        
        mockDocument.body.addEventListener.mock.calls[0][1](event);
        
        expect(selectedConnectors.forEach).toHaveBeenCalled();
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle errors gracefully and reset to IDLE state", () => {
      const cleanup = setupKeyboardHandlers(
        board, selectionManager, selectedConnectors, appState, callbacks
      );
      
      // Mock board to throw error
      board.getGridUnit = jest.fn(() => {
        throw new Error('Test error');
      });
      
      const stickySelection = selectionManager.getSelection('stickies');
      stickySelection.hasItems.mockReturnValue(true);
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      
      expect(() => {
        mockDocument.body.addEventListener.mock.calls[0][1](event);
      }).toThrow();
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining('[KeyboardError]'),
        expect.any(Error)
      );
      
      cleanup();
    });

    it("should log debug information for unmatched keys", () => {
      // Set DEBUG_MODE to true for this test
      window.DEBUG_MODE = true;
      const cleanup = setupKeyboardHandlers(
        board, selectionManager, selectedConnectors, appState, callbacks
      );
      
      const event = new KeyboardEvent('keydown', { key: 'z' });
      
      mockDocument.body.addEventListener.mock.calls[0][1](event);
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining('[KeyboardEvent] No handler matched for key: z'),
        expect.objectContaining({
          state: 'idle',
          modifiers: expect.objectContaining({
            shift: false,
            ctrl: false,
            alt: false
          })
        })
      );
      
      cleanup();
    });
  });

  describe("Integration Tests", () => {
    it("should work with real board operations", () => {
      const cleanup = setupKeyboardHandlers(
        board, selectionManager, selectedConnectors, appState, callbacks
      );
      
      // Test zoom
      const zoomEvent = new KeyboardEvent('keydown', { key: 'o' });
      mockDocument.body.addEventListener.mock.calls[0][1](zoomEvent);
      expect(callbacks.onZoomChange).toHaveBeenCalled();
      
      // Test sticky creation
      const stickyEvent = new KeyboardEvent('keydown', { key: 'n' });
      mockDocument.body.addEventListener.mock.calls[0][1](stickyEvent);
      expect(appState.ui.nextClickCreatesNewSticky).toBe(true);
      
      // Test cancellation
      const cancelEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      mockDocument.body.addEventListener.mock.calls[0][1](cancelEvent);
      expect(appState.ui.nextClickCreatesNewSticky).toBe(false);
      
      cleanup();
    });

    it("should properly clean up event listeners", () => {
      const cleanup = setupKeyboardHandlers(
        board, selectionManager, selectedConnectors, appState, callbacks
      );
      
      expect(mockDocument.body.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      
      cleanup();
      
      expect(mockDocument.body.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });

  describe("State Management Functions", () => {
    it("should return current keyboard state", () => {
      const cleanup = setupKeyboardHandlers(
        board, selectionManager, selectedConnectors, appState, callbacks
      );
      
      const state = getKeyboardState();
      
      expect(state).toHaveProperty('currentState');
      expect(state).toHaveProperty('stateData');
      expect(state).toHaveProperty('debugMode');
      expect(state.currentState).toBe('idle');
      
      cleanup();
    });

    it("should allow forced state transitions", () => {
      const cleanup = setupKeyboardHandlers(
        board, selectionManager, selectedConnectors, appState, callbacks
      );
      
      forceKeyboardStateTransition('sticky_creation_mode', 'test transition', appState);
      
      const state = getKeyboardState();
      expect(state.currentState).toBe('sticky_creation_mode');
      expect(state.stateData.lastAction).toBe('test transition');
      
      cleanup();
    });

    it("should transition back to IDLE when action is completed", () => {
      const cleanup = setupKeyboardHandlers(
        board, selectionManager, selectedConnectors, appState, callbacks
      );
      
      // First activate sticky creation mode
      const event = new KeyboardEvent('keydown', { key: 'n' });
      mockDocument.body.addEventListener.mock.calls[0][1](event);
      
      let state = getKeyboardState();
      expect(state.currentState).toBe('sticky_creation_mode');
      expect(appState.ui.nextClickCreatesNewSticky).toBe(true);
      
      // Complete the action (simulate clicking to create sticky)
      completeKeyboardAction('sticky created', appState);
      
      state = getKeyboardState();
      expect(state.currentState).toBe('idle');
      expect(appState.ui.nextClickCreatesNewSticky).toBe(false);
      
      // Now 'n' should work again
      const event2 = new KeyboardEvent('keydown', { key: 'n' });
      mockDocument.body.addEventListener.mock.calls[0][1](event2);
      
      state = getKeyboardState();
      expect(state.currentState).toBe('sticky_creation_mode');
      expect(appState.ui.nextClickCreatesNewSticky).toBe(true);
      
      cleanup();
    });
  });
});

describe("deleteSelectedItems", () => {
  let board;
  let selectionManager;
  let selectedConnectors;

  beforeEach(() => {
    board = {
      deleteBoardItem: jest.fn(),
      deleteConnector: jest.fn()
    };
    
    const stickySelection = {
      forEach: jest.fn(),
      hasItems: jest.fn(() => true)
    };
    const imageSelection = {
      forEach: jest.fn(),
      hasItems: jest.fn(() => true)
    };
    
    selectionManager = {
      getSelection: jest.fn((selectionType) => {
        if (selectionType === 'stickies') return stickySelection;
        if (selectionType === 'images') return imageSelection;
        return null;
      })
    };
    
    selectedConnectors = {
      forEach: jest.fn(),
      hasItems: jest.fn(() => true)
    };
  });

  it("should delete all selected stickies", () => {
    const stickySelection = selectionManager.getSelection('stickies');
    stickySelection.hasItems.mockReturnValue(true);
    stickySelection.forEach.mockImplementation((callback) => {
      callback('sticky1');
      callback('sticky2');
    });
    
    deleteSelectedItems(board, selectionManager, selectedConnectors);
    
    expect(board.deleteBoardItem).toHaveBeenCalledWith('sticky', 'sticky1');
    expect(board.deleteBoardItem).toHaveBeenCalledWith('sticky', 'sticky2');
  });

  it("should delete all selected connectors", () => {
    selectedConnectors.hasItems.mockReturnValue(true);
    selectedConnectors.forEach.mockImplementation((callback) => {
      callback('connector1');
      callback('connector2');
    });
    
    deleteSelectedItems(board, selectionManager, selectedConnectors);
    
    expect(board.deleteConnector).toHaveBeenCalledWith('connector1');
    expect(board.deleteConnector).toHaveBeenCalledWith('connector2');
  });

  it("should delete all selected images", () => {
    const imageSelection = selectionManager.getSelection('images');
    imageSelection.hasItems.mockReturnValue(true);
    imageSelection.forEach.mockImplementation((callback) => {
      callback('image1');
      callback('image2');
    });
    
    deleteSelectedItems(board, selectionManager, selectedConnectors);
    
    expect(board.deleteBoardItem).toHaveBeenCalledWith('image', 'image1');
    expect(board.deleteBoardItem).toHaveBeenCalledWith('image', 'image2');
  });

  it("should handle empty selections", () => {
    const stickySelection = selectionManager.getSelection('stickies');
    const imageSelection = selectionManager.getSelection('images');
    stickySelection.hasItems.mockReturnValue(false);
    selectedConnectors.hasItems.mockReturnValue(false);
    imageSelection.hasItems.mockReturnValue(false);
    
    deleteSelectedItems(board, selectionManager, selectedConnectors);
    
    expect(board.deleteBoardItem).not.toHaveBeenCalled();
    expect(board.deleteConnector).not.toHaveBeenCalled();
  });
});
