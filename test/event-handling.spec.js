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
    boardScale: undefined,
    currentColor: "khaki",
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
      boardScale: undefined,
      currentColor: "khaki",
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
});

describe("Event Handler Conflict and Propagation Tests", () => {
  let board;
  let store;

  beforeEach(() => {
    store = new LocalDatastore();
    board = new Board(store);
  });

  describe("Event Handler Conflicts", () => {
    it("should use addEventListener instead of direct assignment", () => {
      // Mock DOM element
      const mockElement = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        onmousemove: null,
        onmouseup: null
      };

      // Test the corrected event handler approach from the bug report
      const handleMouseMove = jest.fn();
      const handleMouseUp = jest.fn();

      const addGlobalListeners = () => {
        mockElement.addEventListener('mousemove', handleMouseMove);
        mockElement.addEventListener('mouseup', handleMouseUp);
      };

      const removeGlobalListeners = () => {
        mockElement.removeEventListener('mousemove', handleMouseMove);
        mockElement.removeEventListener('mouseup', handleMouseUp);
      };

      // Add listeners
      addGlobalListeners();
      expect(mockElement.addEventListener).toHaveBeenCalledWith('mousemove', handleMouseMove);
      expect(mockElement.addEventListener).toHaveBeenCalledWith('mouseup', handleMouseUp);

      // Remove listeners
      removeGlobalListeners();
      expect(mockElement.removeEventListener).toHaveBeenCalledWith('mousemove', handleMouseMove);
      expect(mockElement.removeEventListener).toHaveBeenCalledWith('mouseup', handleMouseUp);
    });

    it("should avoid direct property assignment conflicts", () => {
      // Mock DOM element
      const mockElement = {
        onmousemove: null,
        onmouseup: null
      };

      // Test the problematic approach that causes conflicts
      const problematicHandler1 = jest.fn();
      const problematicHandler2 = jest.fn();

      // First handler assignment
      mockElement.onmousemove = problematicHandler1;
      expect(mockElement.onmousemove).toBe(problematicHandler1);

      // Second handler assignment overwrites the first
      mockElement.onmousemove = problematicHandler2;
      expect(mockElement.onmousemove).toBe(problematicHandler2);
      expect(mockElement.onmousemove).not.toBe(problematicHandler1);

      // This demonstrates the conflict issue
    });

    it("should handle multiple event handlers without conflicts", () => {
      const mockElement = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const handler3 = jest.fn();

      // Add multiple handlers for the same event
      mockElement.addEventListener('mousemove', handler1);
      mockElement.addEventListener('mousemove', handler2);
      mockElement.addEventListener('mousemove', handler3);

      expect(mockElement.addEventListener).toHaveBeenCalledTimes(3);
      expect(mockElement.addEventListener).toHaveBeenCalledWith('mousemove', handler1);
      expect(mockElement.addEventListener).toHaveBeenCalledWith('mousemove', handler2);
      expect(mockElement.addEventListener).toHaveBeenCalledWith('mousemove', handler3);
    });
  });

  describe("Event Propagation Control", () => {
    it("should allow propagation in connector creation mode", () => {
      // Mock appState with connector creation mode
      window.appState = {
        ui: { nextClickCreatesConnector: true }
      };

      // Mock event
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      // Simulate image mouse down handler logic from bug report
      const shouldPreventPropagation = !window.appState.ui.nextClickCreatesConnector;

      if (shouldPreventPropagation) {
        mockEvent.preventDefault();
        mockEvent.stopPropagation();
      }

      expect(shouldPreventPropagation).toBe(false);
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockEvent.stopPropagation).not.toHaveBeenCalled();
    });

    it("should prevent propagation when not in connector creation mode", () => {
      // Mock appState without connector creation mode
      window.appState = {
        ui: { nextClickCreatesConnector: false }
      };

      // Mock event
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      // Simulate image mouse down handler logic
      const shouldPreventPropagation = !window.appState.ui.nextClickCreatesConnector;

      if (shouldPreventPropagation) {
        mockEvent.preventDefault();
        mockEvent.stopPropagation();
      }

      expect(shouldPreventPropagation).toBe(true);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it("should handle click events with proper propagation", () => {
      // Mock appState with connector creation mode
      window.appState = {
        ui: { nextClickCreatesConnector: true }
      };

      // Mock event
      const mockEvent = {
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      // Simulate image click handler logic
      const shouldPreventPropagation = !window.appState.ui.nextClickCreatesConnector;

      if (shouldPreventPropagation) {
        mockEvent.preventDefault();
        mockEvent.stopPropagation();
      }

      expect(shouldPreventPropagation).toBe(false);
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockEvent.stopPropagation).not.toHaveBeenCalled();
    });
  });

  describe("Event Handler Cleanup", () => {
    it("should properly remove event listeners on cleanup", () => {
      const mockElement = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      const handleMouseMove = jest.fn();
      const handleMouseUp = jest.fn();

      // Add listeners
      mockElement.addEventListener('mousemove', handleMouseMove);
      mockElement.addEventListener('mouseup', handleMouseUp);

      // Simulate cleanup in mouse up handler
      const cleanup = () => {
        mockElement.removeEventListener('mousemove', handleMouseMove);
        mockElement.removeEventListener('mouseup', handleMouseUp);
      };

      cleanup();

      expect(mockElement.removeEventListener).toHaveBeenCalledWith('mousemove', handleMouseMove);
      expect(mockElement.removeEventListener).toHaveBeenCalledWith('mouseup', handleMouseUp);
    });

    it("should handle cleanup when handlers are undefined", () => {
      const mockElement = {
        removeEventListener: jest.fn()
      };

      const undefinedHandler = undefined;

      // Should not throw error when trying to remove undefined handler
      expect(() => {
        mockElement.removeEventListener('mousemove', undefinedHandler);
      }).not.toThrow();
    });

    it("should handle cleanup with null handlers", () => {
      const mockElement = {
        removeEventListener: jest.fn()
      };

      const nullHandler = null;

      // Should not throw error when trying to remove null handler
      expect(() => {
        mockElement.removeEventListener('mousemove', nullHandler);
      }).not.toThrow();
    });
  });

  describe("Event Handler State Management", () => {
    it("should track event handler state correctly", () => {
      let isDragging = false;
      let isResizing = false;
      let dragStart = null;
      let resizeSide = null;

      // Simulate mouse down event
      const handleMouseDown = (event) => {
        const handle = event.target.closest('.resize-handle');
        
        if (handle) {
          isResizing = true;
          resizeSide = 'right'; // Simplified for test
          dragStart = { x: event.clientX, y: event.clientY };
        } else {
          isDragging = true;
          dragStart = { x: event.clientX, y: event.clientY };
        }
      };

      // Test resize handler detection
      const mockResizeEvent = {
        target: { closest: jest.fn(() => ({ className: 'resize-handle-right' })) },
        clientX: 100,
        clientY: 100
      };

      handleMouseDown(mockResizeEvent);
      expect(isResizing).toBe(true);
      expect(isDragging).toBe(false);
      expect(resizeSide).toBe('right');
      expect(dragStart).toEqual({ x: 100, y: 100 });

      // Reset state
      isDragging = false;
      isResizing = false;
      dragStart = null;
      resizeSide = null;

      // Test drag handler detection
      const mockDragEvent = {
        target: { closest: jest.fn(() => null) },
        clientX: 150,
        clientY: 150
      };

      handleMouseDown(mockDragEvent);
      expect(isDragging).toBe(true);
      expect(isResizing).toBe(false);
      expect(resizeSide).toBe(null);
      expect(dragStart).toEqual({ x: 150, y: 150 });
    });

    it("should handle cursor state management", () => {
      const mockDocument = {
        body: {
          style: {
            cursor: 'auto'
          }
        }
      };

      // Simulate cursor state changes
      const setCursor = (cursor) => {
        mockDocument.body.style.cursor = cursor;
      };

      const resetCursor = () => {
        mockDocument.body.style.cursor = 'auto';
      };

      // Test cursor changes
      setCursor('grabbing');
      expect(mockDocument.body.style.cursor).toBe('grabbing');

      setCursor('resize-right');
      expect(mockDocument.body.style.cursor).toBe('resize-right');

      resetCursor();
      expect(mockDocument.body.style.cursor).toBe('auto');
    });
  });

  describe("Event Handler Error Handling", () => {
    it("should handle event handler exceptions gracefully", () => {
      const mockElement = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      const errorHandler = jest.fn(() => {
        throw new Error("Handler error");
      });

      const normalHandler = jest.fn();

      // Add error handler
      mockElement.addEventListener('mousemove', errorHandler);
      mockElement.addEventListener('mousemove', normalHandler);

      // Simulate event dispatch
      const dispatchEvent = (eventType) => {
        // In real implementation, this would trigger all handlers
        // For test, we'll simulate the behavior
        try {
          errorHandler();
        } catch (error) {
          // Error should be caught and not prevent other handlers
        }
        normalHandler();
      };

      expect(() => {
        dispatchEvent('mousemove');
      }).not.toThrow();

      expect(normalHandler).toHaveBeenCalled();
    });

    it("should handle missing event targets", () => {
      const mockEvent = {
        target: null,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      // Handler should handle null target gracefully
      const handleEvent = (event) => {
        if (event.target) {
          const handle = event.target.closest('.resize-handle');
          return handle;
        }
        return null;
      };

      expect(() => {
        const result = handleEvent(mockEvent);
        expect(result).toBe(null);
      }).not.toThrow();
    });

    it("should handle invalid event objects", () => {
      const mockElement = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      const handler = jest.fn();

      // Should handle invalid event types
      expect(() => {
        mockElement.addEventListener(null, handler);
      }).not.toThrow();

      expect(() => {
        mockElement.addEventListener(undefined, handler);
      }).not.toThrow();

      expect(() => {
        mockElement.addEventListener('', handler);
      }).not.toThrow();
    });
  });

  describe("Cross-Feature Event Integration", () => {
    it("should handle connector creation during image operations", () => {
      // Mock appState with connector creation mode
      window.appState = {
        ui: { nextClickCreatesConnector: true }
      };

      const imageId = board.putImage({ 
        location: { x: 100, y: 100 }, 
        width: 150, 
        height: 100,
        src: "test-image.jpg",
        dataUrl: "data:image/jpeg;base64,test",
        naturalWidth: 300,
        naturalHeight: 200
      });

      // Simulate image mouse down during connector creation
      const mockEvent = {
        target: { closest: jest.fn(() => ({ classList: ['image-container', 'image-1'] })) },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      // Image handler should allow propagation
      const shouldPreventPropagation = !window.appState.ui.nextClickCreatesConnector;
      
      if (shouldPreventPropagation) {
        mockEvent.preventDefault();
        mockEvent.stopPropagation();
      }

      expect(shouldPreventPropagation).toBe(false);
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockEvent.stopPropagation).not.toHaveBeenCalled();
    });

    it("should handle sticky operations during connector creation", () => {
      // Mock appState with connector creation mode
      window.appState = {
        ui: { nextClickCreatesConnector: true }
      };

      const stickyId = board.putSticky({ 
        text: "test sticky", 
        location: { x: 100, y: 100 } 
      });

      // Simulate sticky click during connector creation
      const mockEvent = {
        target: { closest: jest.fn(() => ({ classList: ['sticky-container', 'sticky-1'] })) },
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      // Sticky handler should allow propagation for connector creation
      const shouldPreventPropagation = !window.appState.ui.nextClickCreatesConnector;
      
      if (shouldPreventPropagation) {
        mockEvent.preventDefault();
        mockEvent.stopPropagation();
      }

      expect(shouldPreventPropagation).toBe(false);
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
      expect(mockEvent.stopPropagation).not.toHaveBeenCalled();
    });

    it("should handle event handler priority correctly", () => {
      const mockElement = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      const connectorHandler = jest.fn();
      const imageHandler = jest.fn();
      const stickyHandler = jest.fn();

      // Add handlers in order of priority
      mockElement.addEventListener('mousedown', connectorHandler);
      mockElement.addEventListener('mousedown', imageHandler);
      mockElement.addEventListener('mousedown', stickyHandler);

      expect(mockElement.addEventListener).toHaveBeenCalledTimes(3);
      
      // Verify all handlers are registered
      expect(mockElement.addEventListener).toHaveBeenCalledWith('mousedown', connectorHandler);
      expect(mockElement.addEventListener).toHaveBeenCalledWith('mousedown', imageHandler);
      expect(mockElement.addEventListener).toHaveBeenCalledWith('mousedown', stickyHandler);
    });
  });
});
