/**
 * Test suite for the new refactored sticky resize architecture
 * Tests the state machine, listener manager, and handler architecture
 */

import { setupStickyEvents } from '../scripts/board-items/sticky-events.js';

describe('Refactored Sticky Resize Architecture', () => {
  let mockContainer;
  let mockStore;
  let mockSelectionManager;
  let mockUpdateTextById;
  let mockGetStickyLocation;

  beforeEach(() => {
    // Create mock DOM elements
    mockContainer = document.createElement('div');
    mockContainer.style.position = 'absolute';
    mockContainer.style.left = '100px';
    mockContainer.style.top = '100px';
    mockContainer.style.width = '100px';
    mockContainer.style.height = '100px';
    
    // Create resize handles
    const handles = ['top', 'right', 'bottom', 'left'];
    handles.forEach(side => {
      const handle = document.createElement('div');
      handle.className = `resize-handle-${side}`;
      handle.style.position = 'absolute';
      mockContainer.appendChild(handle);
    });

    // Create sticky element
    const sticky = document.createElement('div');
    sticky.className = 'sticky';
    mockContainer.appendChild(sticky);

    // Create input element
    const inputElement = document.createElement('textarea');
    inputElement.value = 'Test sticky';
    mockContainer.inputElement = inputElement;
    mockContainer.sticky = sticky;
    mockContainer.appendChild(inputElement);

    // Mock store
    mockStore = {
      getSticky: jest.fn().mockReturnValue({
        id: 'test-sticky',
        text: 'Test sticky',
        location: { x: 100, y: 100 },
        size: { x: 1, y: 1 }
      }),
      updateSize: jest.fn(),
      setLocation: jest.fn(),
      getAppState: jest.fn().mockReturnValue({
        board: { origin: { x: 0, y: 0 } },
        ui: { nextClickCreatesConnector: false }
      })
    };

    // Mock selection manager
    mockSelectionManager = {
      selectItem: jest.fn(),
      getSelection: jest.fn().mockReturnValue({
        isSelected: jest.fn().mockReturnValue(false),
        forEach: jest.fn()
      })
    };

    // Mock functions
    mockUpdateTextById = jest.fn().mockReturnValue('Test sticky');
    mockGetStickyLocation = jest.fn().mockReturnValue({ x: 100, y: 100 });

    // Add to DOM for proper event handling
    document.body.appendChild(mockContainer);
  });

  afterEach(() => {
    // Clean up DOM
    if (mockContainer && mockContainer.parentNode) {
      mockContainer.parentNode.removeChild(mockContainer);
    }
    
    // Reset document styles
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    
    // Clear all event listeners
    document.removeEventListener('mousemove', jest.fn());
    document.removeEventListener('mouseup', jest.fn());
  });

  describe('State Machine Architecture', () => {
    test('should initialize in IDLE state', () => {
      setupStickyEvents(
        mockContainer,
        'test-sticky',
        mockUpdateTextById,
        mockGetStickyLocation,
        mockSelectionManager,
        mockStore
      );

      // State should be IDLE initially
      expect(document.body.style.cursor).toBe('');
      expect(document.body.style.userSelect).toBe('');
    });

    test('should transition to RESIZING state on mousedown', () => {
      setupStickyEvents(
        mockContainer,
        'test-sticky',
        mockUpdateTextById,
        mockGetStickyLocation,
        mockSelectionManager,
        mockStore
      );

      const rightHandle = mockContainer.querySelector('.resize-handle-right');
      const mousedownEvent = new MouseEvent('mousedown', {
        pageX: 200,
        pageY: 150,
        bubbles: true
      });

      rightHandle.dispatchEvent(mousedownEvent);

      // Should transition to RESIZING state
      expect(document.body.style.cursor).toBe('ew-resize');
      expect(document.body.style.userSelect).toBe('none');
    });

    test('should transition back to IDLE state on mouseup', () => {
      setupStickyEvents(
        mockContainer,
        'test-sticky',
        mockUpdateTextById,
        mockGetStickyLocation,
        mockSelectionManager,
        mockStore
      );

      const rightHandle = mockContainer.querySelector('.resize-handle-right');
      
      // Start resize
      const mousedownEvent = new MouseEvent('mousedown', {
        pageX: 200,
        pageY: 150,
        bubbles: true
      });
      rightHandle.dispatchEvent(mousedownEvent);

      // End resize
      const mouseupEvent = new MouseEvent('mouseup', {
        pageX: 300,
        pageY: 150,
        bubbles: true
      });
      document.dispatchEvent(mouseupEvent);

      // Should transition back to IDLE state
      expect(document.body.style.cursor).toBe('');
      expect(document.body.style.userSelect).toBe('');
    });

    test('should handle error recovery by transitioning to IDLE', () => {
      // Mock console.error to avoid noise in tests
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      setupStickyEvents(
        mockContainer,
        'test-sticky',
        mockUpdateTextById,
        mockGetStickyLocation,
        mockSelectionManager,
        mockStore
      );

      const rightHandle = mockContainer.querySelector('.resize-handle-right');
      
      // Start resize
      const mousedownEvent = new MouseEvent('mousedown', {
        pageX: 200,
        pageY: 150,
        bubbles: true
      });
      rightHandle.dispatchEvent(mousedownEvent);

      // Simulate error by making store.getSticky return null
      mockStore.getSticky.mockReturnValue(null);

      // Try to move (this should trigger error recovery)
      const mousemoveEvent = new MouseEvent('mousemove', {
        pageX: 300,
        pageY: 150,
        bubbles: true
      });
      document.dispatchEvent(mousemoveEvent);

      // Should recover to IDLE state
      expect(document.body.style.cursor).toBe('');
      expect(document.body.style.userSelect).toBe('');

      consoleSpy.mockRestore();
    });
  });

  describe('Listener Manager Architecture', () => {
    test('should properly manage global listeners', () => {
      setupStickyEvents(
        mockContainer,
        'test-sticky',
        mockUpdateTextById,
        mockGetStickyLocation,
        mockSelectionManager,
        mockStore
      );

      const rightHandle = mockContainer.querySelector('.resize-handle-right');
      
      // Start resize
      const mousedownEvent = new MouseEvent('mousedown', {
        pageX: 200,
        pageY: 150,
        bubbles: true
      });
      rightHandle.dispatchEvent(mousedownEvent);

      // Should have active listeners during resize
      expect(document.body.style.cursor).toBe('ew-resize');

      // End resize
      const mouseupEvent = new MouseEvent('mouseup', {
        pageX: 300,
        pageY: 150,
        bubbles: true
      });
      document.dispatchEvent(mouseupEvent);

      // Listeners should be cleaned up
      expect(document.body.style.cursor).toBe('');
    });

    test('should prevent listener overlap', () => {
      setupStickyEvents(
        mockContainer,
        'test-sticky',
        mockUpdateTextById,
        mockGetStickyLocation,
        mockSelectionManager,
        mockStore
      );

      const rightHandle = mockContainer.querySelector('.resize-handle-right');
      
      // Start first resize
      const mousedownEvent1 = new MouseEvent('mousedown', {
        pageX: 200,
        pageY: 150,
        bubbles: true
      });
      rightHandle.dispatchEvent(mousedownEvent1);

      // Start second resize (should replace first)
      const mousedownEvent2 = new MouseEvent('mousedown', {
        pageX: 250,
        pageY: 150,
        bubbles: true
      });
      rightHandle.dispatchEvent(mousedownEvent2);

      // Should still be in resizing state
      expect(document.body.style.cursor).toBe('ew-resize');
    });
  });

  describe('Handler Architecture', () => {
    test('should use resizeStartHandler for mousedown events', () => {
      setupStickyEvents(
        mockContainer,
        'test-sticky',
        mockUpdateTextById,
        mockGetStickyLocation,
        mockSelectionManager,
        mockStore
      );

      const rightHandle = mockContainer.querySelector('.resize-handle-right');
      const mousedownEvent = new MouseEvent('mousedown', {
        pageX: 200,
        pageY: 150,
        bubbles: true
      });

      const preventDefaultSpy = jest.spyOn(mousedownEvent, 'preventDefault');
      const stopPropagationSpy = jest.spyOn(mousedownEvent, 'stopPropagation');

      rightHandle.dispatchEvent(mousedownEvent);

      expect(preventDefaultSpy).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();
      expect(document.body.style.cursor).toBe('ew-resize');
    });

    test('should use resizeEndHandler for mouseup events', () => {
      setupStickyEvents(
        mockContainer,
        'test-sticky',
        mockUpdateTextById,
        mockGetStickyLocation,
        mockSelectionManager,
        mockStore
      );

      const rightHandle = mockContainer.querySelector('.resize-handle-right');
      
      // Start resize
      const mousedownEvent = new MouseEvent('mousedown', {
        pageX: 200,
        pageY: 150,
        bubbles: true
      });
      rightHandle.dispatchEvent(mousedownEvent);

      // Move mouse
      const mousemoveEvent = new MouseEvent('mousemove', {
        pageX: 300,
        pageY: 150,
        bubbles: true
      });
      document.dispatchEvent(mousemoveEvent);

      // End resize
      const mouseupEvent = new MouseEvent('mouseup', {
        pageX: 300,
        pageY: 150,
        bubbles: true
      });
      document.dispatchEvent(mouseupEvent);

      // Should call store methods
      expect(mockStore.updateSize).toHaveBeenCalled();
      expect(mockStore.setLocation).toHaveBeenCalled();
    });

    test('should handle canHandle logic correctly', () => {
      setupStickyEvents(
        mockContainer,
        'test-sticky',
        mockUpdateTextById,
        mockGetStickyLocation,
        mockSelectionManager,
        mockStore
      );

      const rightHandle = mockContainer.querySelector('.resize-handle-right');
      
      // First mousedown should work
      const mousedownEvent1 = new MouseEvent('mousedown', {
        pageX: 200,
        pageY: 150,
        bubbles: true
      });
      rightHandle.dispatchEvent(mousedownEvent1);

      expect(document.body.style.cursor).toBe('ew-resize');

      // Second mousedown while already resizing should be ignored
      const mousedownEvent2 = new MouseEvent('mousedown', {
        pageX: 250,
        pageY: 150,
        bubbles: true
      });
      rightHandle.dispatchEvent(mousedownEvent2);

      // Should still be in resizing state (not reset)
      expect(document.body.style.cursor).toBe('ew-resize');
    });
  });

  describe('Debug Logging', () => {
    test('should log state transitions when DEBUG_MODE is enabled', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      setupStickyEvents(
        mockContainer,
        'test-sticky',
        mockUpdateTextById,
        mockGetStickyLocation,
        mockSelectionManager,
        mockStore
      );

      const rightHandle = mockContainer.querySelector('.resize-handle-right');
      const mousedownEvent = new MouseEvent('mousedown', {
        pageX: 200,
        pageY: 150,
        bubbles: true
      });

      rightHandle.dispatchEvent(mousedownEvent);

      // Should log state transition
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[StickyResizeState]'),
        expect.objectContaining({
          reason: 'resize started'
        })
      );

      consoleSpy.mockRestore();
    });

    test('should log resize events when DEBUG_MODE is enabled', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      setupStickyEvents(
        mockContainer,
        'test-sticky',
        mockUpdateTextById,
        mockGetStickyLocation,
        mockSelectionManager,
        mockStore
      );

      const rightHandle = mockContainer.querySelector('.resize-handle-right');
      const mousedownEvent = new MouseEvent('mousedown', {
        pageX: 200,
        pageY: 150,
        bubbles: true
      });

      rightHandle.dispatchEvent(mousedownEvent);

      // Should log resize event
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[StickyResizeEvent]'),
        expect.objectContaining({
          target: expect.any(String),
          handler: expect.any(String)
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Integration with Existing Functionality', () => {
    test('should preserve all existing resize behaviors', () => {
      setupStickyEvents(
        mockContainer,
        'test-sticky',
        mockUpdateTextById,
        mockGetStickyLocation,
        mockSelectionManager,
        mockStore
      );

      const rightHandle = mockContainer.querySelector('.resize-handle-right');
      
      // Start resize
      const mousedownEvent = new MouseEvent('mousedown', {
        pageX: 200,
        pageY: 150,
        bubbles: true
      });
      rightHandle.dispatchEvent(mousedownEvent);

      // Move mouse right
      const mousemoveEvent = new MouseEvent('mousemove', {
        pageX: 300, // 100px to the right
        pageY: 150,
        bubbles: true
      });
      document.dispatchEvent(mousemoveEvent);

      // Should increase width by 100px (1 sticky unit)
      expect(mockContainer.style.width).toBe('200px');

      // End resize
      const mouseupEvent = new MouseEvent('mouseup', {
        pageX: 300,
        pageY: 150,
        bubbles: true
      });
      document.dispatchEvent(mouseupEvent);

      // Should call store with correct values
      expect(mockStore.updateSize).toHaveBeenCalledWith('test-sticky', {
        x: 2, // Should be rounded to 2
        y: 1
      });
    });

    test('should not interfere with sticky selection', () => {
      setupStickyEvents(
        mockContainer,
        'test-sticky',
        mockUpdateTextById,
        mockGetStickyLocation,
        mockSelectionManager,
        mockStore
      );

      const sticky = mockContainer.querySelector('.sticky');
      const clickEvent = new MouseEvent('click', {
        bubbles: true
      });

      sticky.dispatchEvent(clickEvent);

      expect(mockSelectionManager.selectItem).toHaveBeenCalledWith('stickies', 'test-sticky', {
        addToSelection: false
      });
    });

    test('should not interfere with text editing', () => {
      setupStickyEvents(
        mockContainer,
        'test-sticky',
        mockUpdateTextById,
        mockGetStickyLocation,
        mockSelectionManager,
        mockStore
      );

      const inputElement = mockContainer.inputElement;
      const focusEvent = new Event('focus');
      
      inputElement.dispatchEvent(focusEvent);

      expect(mockContainer.classList.contains('editing')).toBe(true);
    });
  });

  describe('Cleanup Functionality', () => {
    test('should provide cleanup function', () => {
      const result = setupStickyEvents(
        mockContainer,
        'test-sticky',
        mockUpdateTextById,
        mockGetStickyLocation,
        mockSelectionManager,
        mockStore
      );

      expect(typeof result.cleanup).toBe('function');

      // Start a resize
      const rightHandle = mockContainer.querySelector('.resize-handle-right');
      const mousedownEvent = new MouseEvent('mousedown', {
        pageX: 200,
        pageY: 150,
        bubbles: true
      });
      rightHandle.dispatchEvent(mousedownEvent);

      expect(document.body.style.cursor).toBe('ew-resize');

      // Call cleanup
      result.cleanup();

      // Should reset to IDLE state
      expect(document.body.style.cursor).toBe('');
      expect(document.body.style.userSelect).toBe('');
    });
  });
});
