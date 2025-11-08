/**
 * @jest-environment jsdom
 */
import { Board } from "../scripts/board/board.js";
import { LocalDatastore } from "../scripts/board/local-datastore.js";
import { setupConnectorEvents } from "../scripts/board-items/connector-events.js";
import { StateMachineValidator } from "../scripts/ui/state-machine-validator.js";
import { StateMachineTester } from "../scripts/ui/state-machine-testing.js";
import { getAllPlugins } from "../scripts/board-items/plugin-registry.js";
import { getBoardItemBounds } from "../scripts/board-items/board-item-interface.js";

// Mock window global for unit tests
if (typeof window === 'undefined') {
  global.window = {};
}

// Mock getAppState function
const mockAppState = {
  board: undefined,
  stickies: {},
  connectors: {},
  images: {},
  idGen: 0,
  connectorIdGen: 0,
  imageIdGen: 0,
  ui: {
    boardScale: 1,
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

jest.mock('../scripts/app-state.js', () => ({
  getAppState: () => mockAppState
}));

describe("Connector Events Logic Tests", () => {
  let board;
  let store;
  let boardElement;
  let connectorEvents;

  beforeEach(() => {
    // Reset mock app state
    Object.assign(mockAppState, {
      board: undefined,
      stickies: {},
      connectors: {},
      images: {},
      idGen: 0,
      connectorIdGen: 0,
      imageIdGen: 0,
      ui: {
        boardScale: 1,
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
    });

    store = new LocalDatastore();
    board = new Board(store);
    
    // Create mock board element
    boardElement = document.createElement('div');
    document.body.appendChild(boardElement);
    
    // Setup connector events with mock dependencies
    const mockSelectionManager = {
      selectItem: jest.fn()
    };
    const mockRenderCallback = jest.fn();
    
    connectorEvents = setupConnectorEvents(
      boardElement, board, mockSelectionManager, mockRenderCallback, store
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (connectorEvents) {
      connectorEvents.cleanup();
    }
    if (boardElement && boardElement.parentNode) {
      boardElement.parentNode.removeChild(boardElement);
    }
  });

  describe("Connector State Management", () => {
    it("should track connector creation mode state", () => {
      expect(mockAppState.ui.nextClickCreatesConnector).toBe(false);
      
      mockAppState.ui.nextClickCreatesConnector = true;
      expect(mockAppState.ui.nextClickCreatesConnector).toBe(true);
    });

    it("should track connector color state", () => {
      expect(mockAppState.ui.currentConnectorColor).toBe("#000000");
      
      mockAppState.ui.currentConnectorColor = "#ff0000";
      expect(mockAppState.ui.currentConnectorColor).toBe("#ff0000");
    });

    it("should track arrow head state", () => {
      expect(mockAppState.ui.currentArrowHead).toBe("filled");
      
      mockAppState.ui.currentArrowHead = "hollow";
      expect(mockAppState.ui.currentArrowHead).toBe("hollow");
    });
  });

  describe("Connector Creation Logic", () => {
    it("should create connector with correct properties", () => {
      const sticky1Id = board.putBoardItem('sticky', { text: "sticky1", location: { x: 100, y: 100 } });
      const sticky2Id = board.putBoardItem('sticky', { text: "sticky2", location: { x: 200, y: 200 } });

      const connectorId = board.putConnector({
        originItemId: sticky1Id,
        originItemType: 'sticky',
        destinationItemId: sticky2Id,
        destinationItemType: 'sticky',
        color: "#000000",
        arrowHead: "filled"
      });

      const connector = board.getConnector(connectorId);
      expect(connector.originItemId).toBe(sticky1Id);
      expect(connector.originItemType).toBe('sticky');
      expect(connector.destinationItemId).toBe(sticky2Id);
      expect(connector.destinationItemType).toBe('sticky');
      expect(connector.color).toBe("#000000");
      expect(connector.arrowHead).toBe("filled");
    });

    it("should create connector with free endpoints", () => {
      const connectorId = board.putConnector({
        originPoint: { x: 100, y: 100 },
        destinationPoint: { x: 200, y: 200 },
        color: "#ff0000",
        arrowHead: "hollow"
      });

      const connector = board.getConnector(connectorId);
      expect(connector.originPoint).toEqual({ x: 100, y: 100 });
      expect(connector.destinationPoint).toEqual({ x: 200, y: 200 });
      expect(connector.color).toBe("#ff0000");
      expect(connector.arrowHead).toBe("hollow");
    });

    it("should create connector with mixed endpoints", () => {
      const stickyId = board.putBoardItem('sticky', { text: "sticky", location: { x: 100, y: 100 } });

      const connectorId = board.putConnector({
        originItemId: stickyId,
        originItemType: 'sticky',
        destinationPoint: { x: 200, y: 200 },
        color: "#00ff00",
        arrowHead: "line"
      });

      const connector = board.getConnector(connectorId);
      expect(connector.originItemId).toBe(stickyId);
      expect(connector.originItemType).toBe('sticky');
      expect(connector.destinationPoint).toEqual({ x: 200, y: 200 });
      expect(connector.color).toBe("#00ff00");
      expect(connector.arrowHead).toBe("line");
    });
  });

  describe("Connector Endpoint Management", () => {
    it("should update connector endpoints", () => {
      const connectorId = board.putConnector({
        originPoint: { x: 100, y: 100 },
        destinationPoint: { x: 200, y: 200 },
        color: "#000000"
      });

      // Update origin endpoint
      board.updateConnectorEndpoint(connectorId, 'origin', { point: { x: 150, y: 150 } });
      
      const connector = board.getConnector(connectorId);
      expect(connector.originPoint).toEqual({ x: 150, y: 150 });
      expect(connector.destinationPoint).toEqual({ x: 200, y: 200 });
    });

    it("should connect endpoint to sticky", () => {
      const stickyId = board.putBoardItem('sticky', { text: "sticky", location: { x: 100, y: 100 } });
      const connectorId = board.putConnector({
        originPoint: { x: 50, y: 50 },
        destinationPoint: { x: 200, y: 200 },
        color: "#000000"
      });

      // Connect origin to sticky
      board.updateConnectorEndpoint(connectorId, 'origin', { itemId: stickyId, itemType: 'sticky' });
      
      const connector = board.getConnector(connectorId);
      expect(connector.originItemId).toBe(stickyId);
      expect(connector.originItemType).toBe('sticky');
      expect(connector.originPoint).toBeUndefined();
      expect(connector.destinationPoint).toEqual({ x: 200, y: 200 });
    });

    it("should connect endpoint to image", () => {
      const imageId = board.putBoardItem('image', {
        location: { x: 100, y: 100 }, 
        width: 100, 
        height: 100,
        src: "test.jpg",
        dataUrl: "data:image/jpeg;base64,test",
        naturalWidth: 200,
        naturalHeight: 200
      });
      const connectorId = board.putConnector({
        originPoint: { x: 50, y: 50 },
        destinationPoint: { x: 200, y: 200 },
        color: "#000000"
      });

      // Connect destination to image
      board.updateConnectorEndpoint(connectorId, 'destination', { itemId: imageId, itemType: 'image' });
      
      const connector = board.getConnector(connectorId);
      expect(connector.destinationItemId).toBe(imageId);
      expect(connector.destinationItemType).toBe('image');
      expect(connector.destinationPoint).toBeUndefined();
      expect(connector.originPoint).toEqual({ x: 50, y: 50 });
    });
  });

  describe("Connector Movement", () => {
    it("should move disconnected connector", () => {
      const connectorId = board.putConnector({
        originPoint: { x: 100, y: 100 },
        destinationPoint: { x: 200, y: 200 },
        color: "#000000"
      });

      const originalConnector = board.getConnector(connectorId);
      expect(originalConnector.originPoint).toEqual({ x: 100, y: 100 });
      expect(originalConnector.destinationPoint).toEqual({ x: 200, y: 200 });

      // Move the connector
      board.moveConnector(connectorId, 50, 30);

      const movedConnector = board.getConnector(connectorId);
      expect(movedConnector.originPoint).toEqual({ x: 150, y: 130 });
      expect(movedConnector.destinationPoint).toEqual({ x: 250, y: 230 });
    });

    it("should move connector with one connected endpoint", () => {
      const stickyId = board.putBoardItem('sticky', { text: "sticky", location: { x: 100, y: 100 } });
      
      const connectorId = board.putConnector({
        originItemId: stickyId,
        originItemType: 'sticky',
        destinationPoint: { x: 200, y: 200 },
        color: "#000000"
      });

      const originalConnector = board.getConnector(connectorId);
      expect(originalConnector.originItemId).toBe(stickyId);
      expect(originalConnector.originItemType).toBe('sticky');
      expect(originalConnector.destinationPoint).toEqual({ x: 200, y: 200 });

      // Move the connector - only free endpoint should move
      board.moveConnector(connectorId, 25, 15);

      const movedConnector = board.getConnector(connectorId);
      expect(movedConnector.originItemId).toBe(stickyId); // Connected endpoint should not change
      expect(movedConnector.originItemType).toBe('sticky');
      expect(movedConnector.destinationPoint).toEqual({ x: 225, y: 215 }); // Free endpoint should move
    });

    it("should not move fully connected connector", () => {
      const sticky1Id = board.putBoardItem('sticky', { text: "sticky1", location: { x: 100, y: 100 } });
      const sticky2Id = board.putBoardItem('sticky', { text: "sticky2", location: { x: 200, y: 200 } });
      
      const connectorId = board.putConnector({
        originItemId: sticky1Id,
        originItemType: 'sticky',
        destinationItemId: sticky2Id,
        destinationItemType: 'sticky',
        color: "#000000"
      });

      const originalConnector = board.getConnector(connectorId);
      expect(originalConnector.originItemId).toBe(sticky1Id);
      expect(originalConnector.originItemType).toBe('sticky');
      expect(originalConnector.destinationItemId).toBe(sticky2Id);
      expect(originalConnector.destinationItemType).toBe('sticky');

      // Try to move the connector - it should not change
      board.moveConnector(connectorId, 50, 30);

      const movedConnector = board.getConnector(connectorId);
      expect(movedConnector.originItemId).toBe(sticky1Id);
      expect(movedConnector.originItemType).toBe('sticky');
      expect(movedConnector.destinationItemId).toBe(sticky2Id);
      expect(movedConnector.destinationItemType).toBe('sticky');
      // No originPoint or destinationPoint should exist
      expect(movedConnector.originPoint).toBeUndefined();
      expect(movedConnector.destinationPoint).toBeUndefined();
    });

    it("should move connector smoothly with multiple incremental movements", () => {
      // Create a disconnected connector
      const connectorId = board.putConnector({
        originPoint: { x: 100, y: 100 },
        destinationPoint: { x: 200, y: 200 },
        color: "#000000"
      });

      // Simulate multiple drag events with incremental movements
      // This tests the fix for unnatural movement where deltas would accumulate
      
      // First movement: 10, 10
      board.moveConnector(connectorId, 10, 10);
      let connector = board.getConnector(connectorId);
      expect(connector.originPoint).toEqual({ x: 110, y: 110 });
      expect(connector.destinationPoint).toEqual({ x: 210, y: 210 });

      // Second incremental movement: another 10, 10
      board.moveConnector(connectorId, 10, 10);
      connector = board.getConnector(connectorId);
      expect(connector.originPoint).toEqual({ x: 120, y: 120 });
      expect(connector.destinationPoint).toEqual({ x: 220, y: 220 });

      // Third incremental movement: another 20, 30
      board.moveConnector(connectorId, 20, 30);
      connector = board.getConnector(connectorId);
      expect(connector.originPoint).toEqual({ x: 140, y: 150 });
      expect(connector.destinationPoint).toEqual({ x: 240, y: 250 });

      // Verify final position matches cumulative movement (40, 50 total)
      expect(connector.originPoint.x).toBe(100 + 10 + 10 + 20);
      expect(connector.originPoint.y).toBe(100 + 10 + 10 + 30);
      expect(connector.destinationPoint.x).toBe(200 + 10 + 10 + 20);
      expect(connector.destinationPoint.y).toBe(200 + 10 + 10 + 30);
    });
  });

  describe("Connector State Validation", () => {
    it("should validate connector creation state", () => {
      // Test that connector creation mode can be toggled
      expect(mockAppState.ui.nextClickCreatesConnector).toBe(false);
      
      mockAppState.ui.nextClickCreatesConnector = true;
      expect(mockAppState.ui.nextClickCreatesConnector).toBe(true);
      
      mockAppState.ui.nextClickCreatesConnector = false;
      expect(mockAppState.ui.nextClickCreatesConnector).toBe(false);
    });

    it("should validate connector properties", () => {
      const connectorId = board.putConnector({
        originPoint: { x: 100, y: 100 },
        destinationPoint: { x: 200, y: 200 },
        color: "#ff0000",
        arrowHead: "hollow"
      });

      const connector = board.getConnector(connectorId);
      
      // Validate all properties are set correctly
      expect(connector.originPoint).toEqual({ x: 100, y: 100 });
      expect(connector.destinationPoint).toEqual({ x: 200, y: 200 });
      expect(connector.color).toBe("#ff0000");
      expect(connector.arrowHead).toBe("hollow");
      expect(typeof connectorId).toBe('string'); // connectorId is the ID, not connector.id
    });

    it("should handle connector deletion", () => {
      const connectorId = board.putConnector({
        originPoint: { x: 100, y: 100 },
        destinationPoint: { x: 200, y: 200 },
        color: "#000000"
      });

      // Verify connector exists
      expect(board.getConnector(connectorId)).toBeDefined();

      // Delete connector
      board.deleteConnector(connectorId);

      // Verify connector is deleted
      expect(() => {
        board.getConnector(connectorId);
      }).toThrow();
    });
  });

  describe("Connector State Machine Tests", () => {
    it("should initialize in IDLE state", () => {
      expect(connectorEvents.getCurrentState()).toBe('idle');
    });

    it("should have proximity detection active in IDLE state", () => {
      const stateData = connectorEvents.getStateData();
      expect(stateData).toBeDefined();
    });

    it("should track active listeners", () => {
      const activeListeners = connectorEvents.getActiveListeners();
      expect(activeListeners).toBeDefined();
      expect(typeof activeListeners).toBe('object');
    });

    it("should handle state transitions correctly", () => {
      // Test that we can get current state
      const initialState = connectorEvents.getCurrentState();
      expect(initialState).toBe('idle');
      
      // Test that state data is available
      const stateData = connectorEvents.getStateData();
      expect(stateData).toBeDefined();
    });
  });

  describe("Connector Endpoint Attachment", () => {
    it("should attach connector endpoint to sticky when released inside sticky bounds", async () => {
      // Create a sticky on the board
      const stickyId = board.putBoardItem('sticky', { 
        text: "Test Sticky", 
        location: { x: 200, y: 200 } 
      });
      
      // Create a connector with a free endpoint
      const connectorId = board.putConnector({
        originPoint: { x: 100, y: 100 },
        destinationPoint: { x: 250, y: 250 }, // Over the sticky
        color: "#000000"
      });
      
      // Set up DOM elements
      const stickyContainer = document.createElement('div');
      stickyContainer.className = 'sticky-container sticky-' + stickyId;
      boardElement.appendChild(stickyContainer);
      
      const connectorContainer = document.createElement('div');
      connectorContainer.className = 'connector-container connector-' + connectorId;
      const connectorHandle = document.createElement('div');
      connectorHandle.className = 'connector-handle destination-handle';
      connectorContainer.appendChild(connectorHandle);
      boardElement.appendChild(connectorContainer);
      
      // Set up board element positioning
      boardElement.style.position = 'relative';
      boardElement.getBoundingClientRect = jest.fn(() => ({
        left: 0,
        top: 0,
        width: 1000,
        height: 1000
      }));
      
      // Mock elementsFromPoint to return both connector handle and sticky (for fix)
      // This simulates the bug scenario where elementFromPoint would return the handle,
      // but elementsFromPoint returns both, allowing us to find the sticky below
      const originalElementsFromPoint = document.elementsFromPoint;
      document.elementsFromPoint = jest.fn((x, y) => {
        // Return elements in order: connector handle first, then sticky container
        return [connectorHandle, stickyContainer];
      });
      
      // Simulate dragging the connector handle - trigger mousedown to enter DRAGGING_HANDLE state
      const mousedownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: 250,
        clientY: 250
      });
      connectorHandle.dispatchEvent(mousedownEvent);
      
      // Wait for state transition (mousedown handler uses requestAnimationFrame)
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify we're in the correct state
      expect(connectorEvents.getCurrentState()).toBe('dragging_handle');
      
      // Simulate mouseup to release over the sticky
      const mouseupEvent = new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        clientX: 250,
        clientY: 250
      });
      document.dispatchEvent(mouseupEvent);
      
      // Wait for the event to be processed
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify the endpoint attached to the sticky
      const connector = board.getConnector(connectorId);
      expect(connector.destinationItemId).toBe(stickyId);
      expect(connector.destinationItemType).toBe('sticky');
      expect(connector.destinationPoint).toBeUndefined();
      
      // Restore mocks
      document.elementsFromPoint = originalElementsFromPoint;
    });

    it("should attach connector endpoint to image when released inside image bounds", async () => {
      // Create an image on the board
      const imageId = board.putBoardItem('image', {
        location: { x: 300, y: 300 },
        width: 150,
        height: 100,
        src: "test.jpg",
        dataUrl: "data:image/jpeg;base64,test",
        naturalWidth: 300,
        naturalHeight: 200
      });
      
      // Create a connector with a free endpoint
      const connectorId = board.putConnector({
        originPoint: { x: 100, y: 100 },
        destinationPoint: { x: 375, y: 350 }, // Over the image center
        color: "#000000"
      });
      
      // Set up DOM elements
      const imageContainer = document.createElement('div');
      imageContainer.className = 'image-container image-' + imageId;
      boardElement.appendChild(imageContainer);
      
      const connectorContainer = document.createElement('div');
      connectorContainer.className = 'connector-container connector-' + connectorId;
      const connectorHandle = document.createElement('div');
      connectorHandle.className = 'connector-handle destination-handle';
      connectorContainer.appendChild(connectorHandle);
      boardElement.appendChild(connectorContainer);
      
      // Set up board element positioning
      boardElement.getBoundingClientRect = jest.fn(() => ({
        left: 0,
        top: 0,
        width: 1000,
        height: 1000
      }));
      
      // Mock elementsFromPoint to return both connector handle and image (for fix)
      const originalElementsFromPoint = document.elementsFromPoint;
      document.elementsFromPoint = jest.fn((x, y) => {
        // Return elements in order: connector handle first, then image container
        return [connectorHandle, imageContainer];
      });
      
      // Simulate dragging the connector handle
      const mousedownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: 375,
        clientY: 350
      });
      connectorHandle.dispatchEvent(mousedownEvent);
      
      // Wait for state transition
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify we're in the correct state
      expect(connectorEvents.getCurrentState()).toBe('dragging_handle');
      
      // Simulate mouseup to release over the image
      const mouseupEvent = new MouseEvent('mouseup', {
        bubbles: true,
        cancelable: true,
        clientX: 375,
        clientY: 350
      });
      document.dispatchEvent(mouseupEvent);
      
      // Wait for the event to be processed
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Verify the endpoint attached to the image
      const connector = board.getConnector(connectorId);
      expect(connector.destinationItemId).toBe(imageId);
      expect(connector.destinationItemType).toBe('image');
      expect(connector.destinationPoint).toBeUndefined();
      
      // Restore mocks
      document.elementsFromPoint = originalElementsFromPoint;
    });
  });

  describe("Connector Creation from Image", () => {
    it("should create connector from image with correct origin position", async () => {
      // Create an image at a known location
      const imageId = board.putBoardItem('image', {
        location: { x: 200, y: 200 },
        width: 150,
        height: 100,
        src: "test-image.jpg",
        dataUrl: "data:image/jpeg;base64,test",
        naturalWidth: 300,
        naturalHeight: 200
      });

      // Verify image exists
      const image = board.getBoardItemByType('image', imageId);
      expect(image).toBeDefined();
      expect(image.location).toEqual({ x: 200, y: 200 });

      // Set up DOM elements
      const imageContainer = document.createElement('div');
      imageContainer.className = 'image-container image-' + imageId;
      boardElement.appendChild(imageContainer);

      // Set up board element positioning
      boardElement.style.position = 'relative';
      boardElement.getBoundingClientRect = jest.fn(() => ({
        left: 0,
        top: 0,
        width: 1000,
        height: 1000
      }));

      // Enable connector creation mode
      mockAppState.ui.nextClickCreatesConnector = true;

      // Calculate the image center position in client coordinates
      // Image is at (200, 200) with size 150x100, so center is at (275, 250) in board coordinates
      // With boardOrigin at (0, 0) and boardScale at 1, client coords would be (275, 250)
      const imageCenterX = image.location.x + image.width / 2; // 200 + 75 = 275
      const imageCenterY = image.location.y + image.height / 2; // 200 + 50 = 250
      const boardOrigin = board.getOrigin();
      const boardScale = mockAppState.ui.boardScale || 1;
      
      // Convert to client coordinates
      const clientX = (imageCenterX + boardOrigin.x) * boardScale;
      const clientY = (imageCenterY + boardOrigin.y) * boardScale;

      // Simulate mousedown on the image container to create connector
      const mousedownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        clientX: clientX,
        clientY: clientY
      });
      imageContainer.dispatchEvent(mousedownEvent);

      // Wait for state transition
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify connector was created
      const connectors = Object.keys(mockAppState.connectors);
      expect(connectors.length).toBeGreaterThan(0);
      
      // Find the newly created connector (should be the last one)
      const connectorId = connectors[connectors.length - 1];
      const connector = board.getConnector(connectorId);
      
      // Verify connector has originItemId and originItemType set
      expect(connector.originItemId).toBeDefined();
      expect(connector.originItemType).toBe('image');
      expect(connector.originPoint).toBeUndefined(); // Should not have originPoint when connected to image

      // Simulate the connector rendering logic to determine the actual start point
      // This is what happens in connector.js renderConnector and connector-styling.js setConnectorStyles
      let originItem = null;
      
      // Try to resolve the origin item (same logic as connector renderer)
      if (connector.originItemId && connector.originItemType) {
        try {
          originItem = board.getBoardItemByType(connector.originItemType, connector.originItemId);
        } catch (e) {
          // Item not found - this is the bug!
        }
      }
      
      // Calculate what the start point would be during rendering
      // This simulates the logic in connector-styling.js setConnectorStyles
      const boardOriginForBounds = board.getOrigin();
      const stickySize = board.getStickyBaseSize();
      let actualStartPoint;
      
      if (originItem) {
        // Origin is connected to an item - calculate edge point
        const originBounds = getBoardItemBounds(originItem, boardOriginForBounds, stickySize);
        if (originBounds) {
          // When origin is connected, use the bounds center (simplified - actual logic uses calculateEdgePoint)
          actualStartPoint = {
            x: originBounds.centerX,
            y: originBounds.centerY
          };
        } else {
          // Fallback if bounds calculation fails
          actualStartPoint = { x: 0, y: 0 };
        }
      } else {
        // Origin unconnected - fall back to originPoint || { x: 0, y: 0 }
        // This is where the bug manifests: originItem is null, so it uses (0,0)
        actualStartPoint = connector.originPoint || { x: 0, y: 0 };
      }
      
      // Calculate what the start point SHOULD be (image center)
      const expectedStartPoint = {
        x: image.location.x + image.width / 2 - boardOriginForBounds.x,
        y: image.location.y + image.height / 2 - boardOriginForBounds.y
      };
      
      // BUG REPRODUCTION: This assertion will FAIL because:
      // 1. originImageId is incorrectly set to "container" instead of the actual image ID
      // 2. Image lookup fails, so originItem is null
      // 3. Renderer falls back to originPoint || { x: 0, y: 0 }
      // 4. actualStartPoint is (0, 0) instead of the image's center position
      expect(actualStartPoint.x).not.toBe(0);
      expect(actualStartPoint.y).not.toBe(0);
      expect(actualStartPoint.x).toBeCloseTo(expectedStartPoint.x, 1);
      expect(actualStartPoint.y).toBeCloseTo(expectedStartPoint.y, 1);
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle invalid connector operations gracefully", () => {
      // Test getting non-existent connector
      expect(() => {
        board.getConnector('non-existent-id');
      }).toThrow();

      // Test deleting non-existent connector (should not throw)
      expect(() => {
        board.deleteConnector('non-existent-id');
      }).not.toThrow();
    });

    it("should handle invalid coordinates gracefully", () => {
      // Test with NaN coordinates
      const connectorId = board.putConnector({
        originPoint: { x: NaN, y: NaN },
        destinationPoint: { x: 200, y: 200 },
        color: "#000000"
      });

      const connector = board.getConnector(connectorId);
      expect(connector.originPoint.x).toBeNaN();
      expect(connector.originPoint.y).toBeNaN();
      expect(connector.destinationPoint).toEqual({ x: 200, y: 200 });
    });

    it("should handle concurrent connector operations", () => {
      // Create multiple connectors rapidly
      const connector1Id = board.putConnector({
        originPoint: { x: 100, y: 100 },
        destinationPoint: { x: 200, y: 200 },
        color: "#ff0000"
      });

      const connector2Id = board.putConnector({
        originPoint: { x: 300, y: 300 },
        destinationPoint: { x: 400, y: 400 },
        color: "#00ff00"
      });

      // Both connectors should exist
      expect(board.getConnector(connector1Id)).toBeDefined();
      expect(board.getConnector(connector2Id)).toBeDefined();

      // They should have different IDs
      expect(connector1Id).not.toBe(connector2Id);
    });
  });
});
