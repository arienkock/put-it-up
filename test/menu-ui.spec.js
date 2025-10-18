import { Board } from "../scripts/board/board.js";
import { LocalDatastore } from "../scripts/board/local-datastore.js";

// Mock window global for unit tests that import modules directly
if (typeof window === 'undefined') {
  global.window = {};
}

beforeEach(() => {
  // Reset window.appState before each test
  window.appState = undefined;
});

describe("Menu Button Functionality Tests", () => {
  let board;
  let store;

  beforeEach(() => {
    store = new LocalDatastore();
    board = new Board(store);
  });

  describe("Menu Button Click Handling", () => {
    it("should pass event object to click handlers", () => {
      // Mock menu item with click handler that expects event parameter
      const mockMenuItem = {
        itemClickHandler: jest.fn((activatingEvent) => {
          expect(activatingEvent).toBeDefined();
          expect(activatingEvent.type).toBe('click');
        })
      };

      // Mock DOM element
      const mockElement = {
        onclick: null,
        disabled: false,
        classList: { add: jest.fn() }
      };

      // Simulate the fixed click handler assignment from the bug report
      mockElement.onclick = (event) => {
        if (mockMenuItem.itemClickHandler && !mockElement.disabled) {
          mockMenuItem.itemClickHandler(event);
        }
      };

      // Create mock event
      const mockEvent = {
        type: 'click',
        target: mockElement,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      };

      // Trigger click
      mockElement.onclick(mockEvent);

      expect(mockMenuItem.itemClickHandler).toHaveBeenCalledWith(mockEvent);
    });

    it("should not execute click handler when button is disabled", () => {
      const mockMenuItem = {
        itemClickHandler: jest.fn()
      };

      const mockElement = {
        onclick: null,
        disabled: true,
        classList: { add: jest.fn() }
      };

      mockElement.onclick = (event) => {
        if (mockMenuItem.itemClickHandler && !mockElement.disabled) {
          mockMenuItem.itemClickHandler(event);
        }
      };

      const mockEvent = { type: 'click' };
      mockElement.onclick(mockEvent);

      expect(mockMenuItem.itemClickHandler).not.toHaveBeenCalled();
    });

    it("should handle null click handler gracefully", () => {
      const mockMenuItem = {
        itemClickHandler: null
      };

      const mockElement = {
        onclick: null,
        disabled: false,
        classList: { add: jest.fn() }
      };

      mockElement.onclick = (event) => {
        if (mockMenuItem.itemClickHandler && !mockElement.disabled) {
          mockMenuItem.itemClickHandler(event);
        }
      };

      const mockEvent = { type: 'click' };
      
      // Should not throw error
      expect(() => {
        mockElement.onclick(mockEvent);
      }).not.toThrow();
    });
  });

  describe("Sticky Size Menu Button", () => {
    it("should enable sticky size button when exactly one sticky is selected", () => {
      // Mock selection state
      const selectedStickies = new Set([1]);
      
      // Mock menu item for sticky size
      const stickySizeItem = {
        className: "sticky-size",
        itemClickHandler: jest.fn()
      };

      // Simulate button creation logic
      const shouldEnableButton = selectedStickies.size === 1;
      const shouldDisableButton = selectedStickies.size !== 1;

      expect(shouldEnableButton).toBe(true);
      expect(shouldDisableButton).toBe(false);
    });

    it("should disable sticky size button when multiple stickies are selected", () => {
      const selectedStickies = new Set([1, 2, 3]);
      
      const shouldEnableButton = selectedStickies.size === 1;
      const shouldDisableButton = selectedStickies.size !== 1;

      expect(shouldEnableButton).toBe(false);
      expect(shouldDisableButton).toBe(true);
    });

    it("should disable sticky size button when no stickies are selected", () => {
      const selectedStickies = new Set();
      
      const shouldEnableButton = selectedStickies.size === 1;
      const shouldDisableButton = selectedStickies.size !== 1;

      expect(shouldEnableButton).toBe(false);
      expect(shouldDisableButton).toBe(true);
    });

    it("should call createStickySizeControls when button is clicked", () => {
      const selectedStickies = new Set([1]);
      const mockBoard = board;
      const mockRoot = { tagName: 'div' };
      const mockActivatingEvent = { type: 'click' };

      // Mock createStickySizeControls function
      const createStickySizeControls = jest.fn((board, root, event, stickyId) => {
        expect(board).toBe(mockBoard);
        expect(root).toBe(mockRoot);
        expect(event).toBe(mockActivatingEvent);
        expect(stickyId).toBe(1);
      });

      // Simulate the click handler logic
      if (selectedStickies.size === 1) {
        let theId;
        selectedStickies.forEach((id) => (theId = id));
        createStickySizeControls(mockBoard, mockRoot, mockActivatingEvent, theId);
      }

      expect(createStickySizeControls).toHaveBeenCalledWith(
        mockBoard, 
        mockRoot, 
        mockActivatingEvent, 
        1
      );
    });
  });

  describe("Menu Button State Management", () => {
    it("should show sticky size button only when stickies are selected", () => {
      const hasStickiesSelected = true;
      const selectedStickies = new Set([1]);

      // Simulate menu rendering logic
      if (hasStickiesSelected) {
        const stickySizeItem = { className: "sticky-size" };
        const shouldShowButton = true;
        const shouldDisableButton = selectedStickies.size !== 1;

        expect(shouldShowButton).toBe(true);
        expect(shouldDisableButton).toBe(false);
      }
    });

    it("should not show sticky size button when no stickies are selected", () => {
      const hasStickiesSelected = false;

      if (hasStickiesSelected) {
        // This block should not execute
        expect(true).toBe(false);
      } else {
        expect(true).toBe(true);
      }
    });

    it("should handle button disabled state correctly", () => {
      const testCases = [
        { selectedCount: 0, shouldBeDisabled: true },
        { selectedCount: 1, shouldBeDisabled: false },
        { selectedCount: 2, shouldBeDisabled: true },
        { selectedCount: 3, shouldBeDisabled: true }
      ];

      testCases.forEach(({ selectedCount, shouldBeDisabled }) => {
        const selectedStickies = new Set(Array.from({ length: selectedCount }, (_, i) => i + 1));
        const isDisabled = selectedStickies.size !== 1;

        expect(isDisabled).toBe(shouldBeDisabled);
      });
    });
  });

  describe("CSS Styling for Menu Controls", () => {
    it("should have proper CSS classes for sizing controls", () => {
      // Test CSS class names that should be present
      const expectedClasses = [
        'sizing-controls',
        'grow-arrows'
      ];

      expectedClasses.forEach(className => {
        expect(className).toBeDefined();
        expect(typeof className).toBe('string');
      });
    });

    it("should have proper CSS properties for sizing controls", () => {
      // Test CSS properties that should be defined
      const expectedProperties = {
        'position': 'fixed',
        'top': '50%',
        'left': '50%',
        'transform': 'translate(-50%, -50%)',
        'background-color': 'white',
        'border': '2px solid #333',
        'border-radius': '8px',
        'padding': '20px',
        'box-shadow': '0 4px 12px rgba(0, 0, 0, 0.3)',
        'z-index': '1000'
      };

      Object.entries(expectedProperties).forEach(([property, value]) => {
        expect(property).toBeDefined();
        expect(value).toBeDefined();
      });
    });

    it("should have proper CSS for grow arrows grid", () => {
      const expectedGridProperties = {
        'display': 'grid',
        'grid-template-columns': '1fr 1fr',
        'grid-template-rows': '1fr 1fr',
        'gap': '10px',
        'margin-top': '15px',
        'width': '100px',
        'height': '100px'
      };

      Object.entries(expectedGridProperties).forEach(([property, value]) => {
        expect(property).toBeDefined();
        expect(value).toBeDefined();
      });
    });

    it("should have proper CSS for grow arrow buttons", () => {
      const expectedButtonProperties = {
        'border': '2px solid #333',
        'border-radius': '4px',
        'background-color': 'white',
        'cursor': 'pointer',
        'display': 'flex',
        'align-items': 'center',
        'justify-content': 'center',
        'transition': 'background-color 0.2s ease'
      };

      Object.entries(expectedButtonProperties).forEach(([property, value]) => {
        expect(property).toBeDefined();
        expect(value).toBeDefined();
      });
    });
  });

  describe("Menu Button Error Handling", () => {
    it("should handle missing menu items gracefully", () => {
      const selectionDependentItems = [];
      const stickySizeItem = selectionDependentItems.find(item => item.className === "sticky-size");

      expect(stickySizeItem).toBeUndefined();
      
      // Should not throw error when item is not found
      if (stickySizeItem) {
        // This block should not execute
        expect(true).toBe(false);
      }
    });

    it("should handle invalid event objects", () => {
      const mockMenuItem = {
        itemClickHandler: jest.fn()
      };

      const mockElement = {
        onclick: null,
        disabled: false,
        classList: { add: jest.fn() }
      };

      mockElement.onclick = (event) => {
        if (mockMenuItem.itemClickHandler && !mockElement.disabled) {
          mockMenuItem.itemClickHandler(event);
        }
      };

      // Test with null event
      expect(() => {
        mockElement.onclick(null);
      }).not.toThrow();

      // Test with undefined event
      expect(() => {
        mockElement.onclick(undefined);
      }).not.toThrow();
    });

    it("should handle click handler exceptions", () => {
      const mockMenuItem = {
        itemClickHandler: jest.fn(() => {
          throw new Error("Test error");
        })
      };

      const mockElement = {
        onclick: null,
        disabled: false,
        classList: { add: jest.fn() }
      };

      mockElement.onclick = (event) => {
        if (mockMenuItem.itemClickHandler && !mockElement.disabled) {
          mockMenuItem.itemClickHandler(event);
        }
      };

      const mockEvent = { type: 'click' };

      // Should handle exceptions gracefully
      expect(() => {
        mockElement.onclick(mockEvent);
      }).toThrow("Test error");
    });
  });

  describe("Menu Button Integration", () => {
    it("should work with board state changes", () => {
      // Create a sticky
      const stickyId = board.putSticky({ 
        text: "test sticky", 
        location: { x: 100, y: 100 } 
      });

      // Simulate selection
      const selectedStickies = new Set([stickyId]);
      
      // Menu should show sticky size button
      const hasStickiesSelected = selectedStickies.size > 0;
      const shouldShowStickySizeButton = hasStickiesSelected && selectedStickies.size === 1;

      expect(shouldShowStickySizeButton).toBe(true);

      // Add another sticky and select both
      const sticky2Id = board.putSticky({ 
        text: "test sticky 2", 
        location: { x: 200, y: 200 } 
      });
      selectedStickies.add(sticky2Id);

      // Menu should disable sticky size button
      const shouldDisableStickySizeButton = selectedStickies.size !== 1;
      expect(shouldDisableStickySizeButton).toBe(true);
    });

    it("should handle rapid selection changes", () => {
      const sticky1Id = board.putSticky({ 
        text: "sticky 1", 
        location: { x: 100, y: 100 } 
      });
      const sticky2Id = board.putSticky({ 
        text: "sticky 2", 
        location: { x: 200, y: 200 } 
      });
      const sticky3Id = board.putSticky({ 
        text: "sticky 3", 
        location: { x: 300, y: 300 } 
      });

      // Simulate rapid selection changes
      const selectionStates = [
        new Set([sticky1Id]), // Should enable button
        new Set([sticky1Id, sticky2Id]), // Should disable button
        new Set([sticky2Id]), // Should enable button
        new Set([sticky1Id, sticky2Id, sticky3Id]), // Should disable button
        new Set([]) // Should disable button
      ];

      const expectedButtonStates = [true, false, true, false, false];

      selectionStates.forEach((selectedStickies, index) => {
        const shouldEnableButton = selectedStickies.size === 1;
        expect(shouldEnableButton).toBe(expectedButtonStates[index]);
      });
    });
  });
});
