import { Board } from "../scripts/board/board.js";
import { LocalDatastore } from "../scripts/board/local-datastore.js";
import { SelectionManager } from "../scripts/ui/selection-manager.js";
import { Selection } from "../scripts/ui/selection.js";

// Mock window global for unit tests
if (typeof window === 'undefined') {
  global.window = {};
}

// Mock app state
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

beforeEach(() => {
  // Reset appState before each test
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
});

describe("SelectionManager", () => {
  let board;
  let store;
  let selectionManager;
  let stickySelection;
  let imageSelection;
  let connectorSelection;

  beforeEach(() => {
    store = new LocalDatastore();
    board = new Board(store);
    selectionManager = new SelectionManager();
    
    // Create mock observers
    const mockObserver = {
      onStickyChange: jest.fn(),
      onImageChange: jest.fn(),
      onConnectorChange: jest.fn()
    };
    
    // Create selection instances
    stickySelection = new Selection(mockObserver, 'selection', 'onStickyChange', store);
    imageSelection = new Selection(mockObserver, 'imageSelection', 'onImageChange', store);
    connectorSelection = new Selection(mockObserver, 'connectorSelection', 'onConnectorChange', store);
    
    // Register selections
    selectionManager.registerSelection('stickies', stickySelection);
    selectionManager.registerSelection('images', imageSelection);
    selectionManager.registerSelection('connectors', connectorSelection);
  });

  describe("Single-Type Selection", () => {
    it("should select a single sticky without shift", () => {
      selectionManager.selectItem('stickies', '1', { addToSelection: false });
      
      expect(stickySelection.isSelected('1')).toBe(true);
      expect(stickySelection.size()).toBe(1);
    });

    it("should select a single image without shift", () => {
      selectionManager.selectItem('images', '1', { addToSelection: false });
      
      expect(imageSelection.isSelected('1')).toBe(true);
      expect(imageSelection.size()).toBe(1);
    });

    it("should select a single connector without shift", () => {
      selectionManager.selectItem('connectors', '1', { addToSelection: false });
      
      expect(connectorSelection.isSelected('1')).toBe(true);
      expect(connectorSelection.size()).toBe(1);
    });
  });

  describe("Multi-Item Selection Within Same Type", () => {
    it("should select multiple stickies with shift-click", () => {
      selectionManager.selectItem('stickies', '1', { addToSelection: false });
      selectionManager.selectItem('stickies', '2', { addToSelection: true });
      selectionManager.selectItem('stickies', '3', { addToSelection: true });
      
      expect(stickySelection.isSelected('1')).toBe(true);
      expect(stickySelection.isSelected('2')).toBe(true);
      expect(stickySelection.isSelected('3')).toBe(true);
      expect(stickySelection.size()).toBe(3);
    });

    it("should select multiple images with shift-click", () => {
      selectionManager.selectItem('images', '1', { addToSelection: false });
      selectionManager.selectItem('images', '2', { addToSelection: true });
      
      expect(imageSelection.isSelected('1')).toBe(true);
      expect(imageSelection.isSelected('2')).toBe(true);
      expect(imageSelection.size()).toBe(2);
    });
  });

  describe("Cross-Type Selection Clearing", () => {
    it("should clear sticky selection when selecting image without shift", () => {
      // Select stickies first
      selectionManager.selectItem('stickies', '1', { addToSelection: false });
      selectionManager.selectItem('stickies', '2', { addToSelection: true });
      
      expect(stickySelection.size()).toBe(2);
      
      // Select image without shift - should clear sticky selection
      selectionManager.selectItem('images', '1', { addToSelection: false });
      
      expect(imageSelection.isSelected('1')).toBe(true);
      expect(imageSelection.size()).toBe(1);
      
      // Sticky selection should be cleared
      expect(stickySelection.hasItems()).toBe(false);
    });

    it("should clear image selection when selecting sticky without shift", () => {
      // Select images first
      selectionManager.selectItem('images', '1', { addToSelection: false });
      
      expect(imageSelection.size()).toBe(1);
      
      // Select sticky without shift - should clear image selection
      selectionManager.selectItem('stickies', '1', { addToSelection: false });
      
      expect(stickySelection.isSelected('1')).toBe(true);
      expect(stickySelection.size()).toBe(1);
      
      // Image selection should be cleared
      expect(imageSelection.hasItems()).toBe(false);
    });

    it("should not clear other types when using shift-click", () => {
      // Select stickies
      selectionManager.selectItem('stickies', '1', { addToSelection: false });
      selectionManager.selectItem('stickies', '2', { addToSelection: true });
      
      // Select images with shift - should not clear stickies
      selectionManager.selectItem('images', '1', { addToSelection: true });
      
      expect(stickySelection.size()).toBe(2);
      expect(imageSelection.size()).toBe(1);
    });
  });

  describe("addToSelection Method", () => {
    it("should add item to selection without clearing others", () => {
      // Select sticky
      selectionManager.selectItem('stickies', '1', { addToSelection: false });
      
      // Add another item using addToSelection
      selectionManager.addToSelection('stickies', '2');
      
      expect(stickySelection.isSelected('1')).toBe(true);
      expect(stickySelection.isSelected('2')).toBe(true);
      expect(stickySelection.size()).toBe(2);
    });

    it("should not duplicate items when adding already selected item", () => {
      selectionManager.selectItem('stickies', '1', { addToSelection: false });
      selectionManager.addToSelection('stickies', '2');
      selectionManager.addToSelection('stickies', '2'); // Add same item again
      
      expect(stickySelection.isSelected('1')).toBe(true);
      expect(stickySelection.isSelected('2')).toBe(true);
      expect(stickySelection.size()).toBe(2);
    });

    it("should add to selection without affecting other types", () => {
      // Select image
      selectionManager.selectItem('images', '1', { addToSelection: false });
      
      // Add sticky to selection
      selectionManager.addToSelection('stickies', '1');
      
      expect(imageSelection.size()).toBe(1);
      expect(stickySelection.size()).toBe(1);
    });
  });

  describe("clearAllSelections Method", () => {
    it("should clear all selections across all types", () => {
      // Select items of all types
      selectionManager.selectItem('stickies', '1', { addToSelection: false });
      selectionManager.selectItem('images', '1', { addToSelection: true });
      selectionManager.selectItem('connectors', '1', { addToSelection: true });
      
      expect(selectionManager.hasAnySelection()).toBe(true);
      
      // Clear all selections
      selectionManager.clearAllSelections();
      
      expect(stickySelection.hasItems()).toBe(false);
      expect(imageSelection.hasItems()).toBe(false);
      expect(connectorSelection.hasItems()).toBe(false);
      expect(selectionManager.hasAnySelection()).toBe(false);
    });
  });

  describe("clearAllSelectionsExcept Method", () => {
    it("should clear all selections except specified type", () => {
      // Select items of all types
      selectionManager.selectItem('stickies', '1', { addToSelection: false });
      selectionManager.selectItem('images', '1', { addToSelection: true });
      selectionManager.selectItem('connectors', '1', { addToSelection: true });
      
      // Clear all except stickies
      selectionManager.clearAllSelectionsExcept('stickies');
      
      expect(stickySelection.hasItems()).toBe(true);
      expect(imageSelection.hasItems()).toBe(false);
      expect(connectorSelection.hasItems()).toBe(false);
    });

    it("should preserve selection of specified type when clearing others", () => {
      selectionManager.selectItem('stickies', '1', { addToSelection: false });
      selectionManager.selectItem('stickies', '2', { addToSelection: true });
      selectionManager.selectItem('images', '1', { addToSelection: true });
      
      // Clear all except stickies
      selectionManager.clearAllSelectionsExcept('stickies');
      
      expect(stickySelection.size()).toBe(2);
      expect(imageSelection.hasItems()).toBe(false);
    });
  });

  describe("hasAnySelection Method", () => {
    it("should return false when no items are selected", () => {
      // Clear any existing selections
      selectionManager.clearAllSelections();
      expect(selectionManager.hasAnySelection()).toBe(false);
    });

    it("should return true when any item is selected", () => {
      selectionManager.selectItem('stickies', '1', { addToSelection: false });
      
      expect(selectionManager.hasAnySelection()).toBe(true);
    });

    it("should return true when multiple types are selected", () => {
      selectionManager.selectItem('stickies', '1', { addToSelection: false });
      selectionManager.selectItem('images', '1', { addToSelection: true });
      
      expect(selectionManager.hasAnySelection()).toBe(true);
    });
  });

  describe("getSelection Method", () => {
    it("should return the correct selection instance", () => {
      const selection = selectionManager.getSelection('stickies');
      
      expect(selection).toBe(stickySelection);
    });

    it("should return null for unregistered type", () => {
      const selection = selectionManager.getSelection('nonexistent');
      
      expect(selection).toBeNull();
    });
  });

  describe("Drag Start Selection Behavior", () => {
    it("should add unselected item to selection when dragging", () => {
      // Select one sticky
      selectionManager.selectItem('stickies', '1', { addToSelection: false });
      
      // Drag unselected sticky - should be added to selection
      selectionManager.addToSelection('stickies', '2');
      
      expect(stickySelection.size()).toBe(2);
      expect(stickySelection.isSelected('1')).toBe(true);
      expect(stickySelection.isSelected('2')).toBe(true);
    });

    it("should preserve existing selection when adding to it", () => {
      // Select multiple items
      selectionManager.selectItem('stickies', '1', { addToSelection: false });
      selectionManager.selectItem('stickies', '2', { addToSelection: true });
      
      // Drag another unselected item
      selectionManager.addToSelection('stickies', '3');
      
      expect(stickySelection.size()).toBe(3);
    });
  });

  describe("Selection State Tracking", () => {
    it("should track independent selections for each content type", () => {
      // Select one item of each type
      selectionManager.selectItem('stickies', '1', { addToSelection: false });
      
      expect(stickySelection.size()).toBe(1);
      expect(imageSelection.size()).toBe(0);
      expect(connectorSelection.size()).toBe(0);
    });

    it("should allow multiple selections of same type with shift", () => {
      selectionManager.selectItem('stickies', '1', { addToSelection: false });
      selectionManager.selectItem('stickies', '2', { addToSelection: true });
      selectionManager.selectItem('stickies', '3', { addToSelection: true });
      selectionManager.selectItem('images', '1', { addToSelection: true }); // Different type
      
      expect(stickySelection.size()).toBe(3);
      expect(imageSelection.size()).toBe(1);
    });
  });
});

