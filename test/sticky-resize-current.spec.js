/**
 * Test suite for current sticky resize functionality
 * This ensures we preserve all existing behavior during refactoring
 */

import { setupStickyEvents } from '../scripts/board-items/sticky-events.js';

describe('Current Sticky Resize Functionality', () => {
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

  describe('Resize Handle Detection', () => {
    test('should detect all resize handles', () => {
      const handles = {
        top: mockContainer.querySelector('.resize-handle-top'),
        right: mockContainer.querySelector('.resize-handle-right'),
        bottom: mockContainer.querySelector('.resize-handle-bottom'),
        left: mockContainer.querySelector('.resize-handle-left')
      };

      expect(handles.top).toBeTruthy();
      expect(handles.right).toBeTruthy();
      expect(handles.bottom).toBeTruthy();
      expect(handles.left).toBeTruthy();
    });

    test('should extract resize side from handle class', () => {
      const topHandle = mockContainer.querySelector('.resize-handle-top');
      const rightHandle = mockContainer.querySelector('.resize-handle-right');
      const bottomHandle = mockContainer.querySelector('.resize-handle-bottom');
      const leftHandle = mockContainer.querySelector('.resize-handle-left');

      expect(topHandle.className).toContain('resize-handle-top');
      expect(rightHandle.className).toContain('resize-handle-right');
      expect(bottomHandle.className).toContain('resize-handle-bottom');
      expect(leftHandle.className).toContain('resize-handle-left');
    });
  });

  describe('Resize Start Functionality', () => {
    test('should start resize on mousedown', () => {
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

      // Check that cursor changed
      expect(document.body.style.cursor).toBe('ew-resize');
      expect(document.body.style.userSelect).toBe('none');
    });

    test('should prevent default and stop propagation on mousedown', () => {
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
    });

    test('should initialize resize data correctly', () => {
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

      // Verify store was called to get sticky data
      expect(mockStore.getSticky).toHaveBeenCalledWith('test-sticky');
    });
  });

  describe('Resize Move Calculations', () => {
    test('should calculate right resize correctly', () => {
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
    });

    test('should calculate left resize correctly', () => {
      setupStickyEvents(
        mockContainer,
        'test-sticky',
        mockUpdateTextById,
        mockGetStickyLocation,
        mockSelectionManager,
        mockStore
      );

      const leftHandle = mockContainer.querySelector('.resize-handle-left');
      
      // Start resize
      const mousedownEvent = new MouseEvent('mousedown', {
        pageX: 100,
        pageY: 150,
        bubbles: true
      });
      leftHandle.dispatchEvent(mousedownEvent);

      // Move mouse left
      const mousemoveEvent = new MouseEvent('mousemove', {
        pageX: 50, // 50px to the left
        pageY: 150,
        bubbles: true
      });
      document.dispatchEvent(mousemoveEvent);

      // Should decrease width and adjust position
      expect(parseInt(mockContainer.style.width)).toBeLessThan(100);
      expect(parseInt(mockContainer.style.left)).toBeLessThan(100);
    });

    test('should calculate bottom resize correctly', () => {
      setupStickyEvents(
        mockContainer,
        'test-sticky',
        mockUpdateTextById,
        mockGetStickyLocation,
        mockSelectionManager,
        mockStore
      );

      const bottomHandle = mockContainer.querySelector('.resize-handle-bottom');
      
      // Start resize
      const mousedownEvent = new MouseEvent('mousedown', {
        pageX: 150,
        pageY: 200,
        bubbles: true
      });
      bottomHandle.dispatchEvent(mousedownEvent);

      // Move mouse down
      const mousemoveEvent = new MouseEvent('mousemove', {
        pageX: 150,
        pageY: 300, // 100px down
        bubbles: true
      });
      document.dispatchEvent(mousemoveEvent);

      // Should increase height by 100px (1 sticky unit)
      expect(mockContainer.style.height).toBe('200px');
    });

    test('should calculate top resize correctly', () => {
      setupStickyEvents(
        mockContainer,
        'test-sticky',
        mockUpdateTextById,
        mockGetStickyLocation,
        mockSelectionManager,
        mockStore
      );

      const topHandle = mockContainer.querySelector('.resize-handle-top');
      
      // Start resize
      const mousedownEvent = new MouseEvent('mousedown', {
        pageX: 150,
        pageY: 100,
        bubbles: true
      });
      topHandle.dispatchEvent(mousedownEvent);

      // Move mouse up
      const mousemoveEvent = new MouseEvent('mousemove', {
        pageX: 150,
        pageY: 50, // 50px up
        bubbles: true
      });
      document.dispatchEvent(mousemoveEvent);

      // Should decrease height and adjust position
      expect(parseInt(mockContainer.style.height)).toBeLessThan(100);
      expect(parseInt(mockContainer.style.top)).toBeLessThan(100);
    });

    test('should enforce minimum size of 1', () => {
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

      // Move mouse far left to try to make size negative
      const mousemoveEvent = new MouseEvent('mousemove', {
        pageX: 0, // Way to the left
        pageY: 150,
        bubbles: true
      });
      document.dispatchEvent(mousemoveEvent);

      // Should maintain minimum size
      expect(parseInt(mockContainer.style.width)).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Resize End Functionality', () => {
    test('should complete resize on mouseup', () => {
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

      // Check that resize state was cleaned up
      expect(document.body.style.cursor).toBe('');
      expect(document.body.style.userSelect).toBe('');

      // Check that store was updated
      expect(mockStore.updateSize).toHaveBeenCalled();
      expect(mockStore.setLocation).toHaveBeenCalled();
    });

    test('should round final size values', () => {
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

      // Move mouse to create fractional size
      const mousemoveEvent = new MouseEvent('mousemove', {
        pageX: 250, // 50px to the right (0.5 sticky units)
        pageY: 150,
        bubbles: true
      });
      document.dispatchEvent(mousemoveEvent);

      // End resize
      const mouseupEvent = new MouseEvent('mouseup', {
        pageX: 250,
        pageY: 150,
        bubbles: true
      });
      document.dispatchEvent(mouseupEvent);

      // Check that final size was rounded
      const updateSizeCall = mockStore.updateSize.mock.calls[0];
      expect(updateSizeCall[1]).toEqual({
        x: 1, // Should be rounded to 1
        y: 1
      });
    });
  });

  describe('Handle Click Prevention', () => {
    test('should prevent handle clicks from triggering sticky selection', () => {
      setupStickyEvents(
        mockContainer,
        'test-sticky',
        mockUpdateTextById,
        mockGetStickyLocation,
        mockSelectionManager,
        mockStore
      );

      const rightHandle = mockContainer.querySelector('.resize-handle-right');
      const clickEvent = new MouseEvent('click', {
        bubbles: true
      });

      const stopPropagationSpy = jest.spyOn(clickEvent, 'stopPropagation');

      rightHandle.dispatchEvent(clickEvent);

      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing sticky gracefully', () => {
      mockStore.getSticky.mockReturnValue(null);

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

      // Should not throw error
      expect(() => {
        rightHandle.dispatchEvent(mousedownEvent);
      }).not.toThrow();

      // Should not start resize
      expect(document.body.style.cursor).toBe('');
    });

    test('should handle missing resize handles gracefully', () => {
      // Remove all resize handles
      const handles = mockContainer.querySelectorAll('[class*="resize-handle"]');
      handles.forEach(handle => handle.remove());

      // Should not throw error during setup
      expect(() => {
        setupStickyEvents(
          mockContainer,
          'test-sticky',
          mockUpdateTextById,
          mockGetStickyLocation,
          mockSelectionManager,
          mockStore
        );
      }).not.toThrow();
    });
  });

  describe('Integration with Existing Events', () => {
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
});
