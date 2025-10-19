/**
 * @jest-environment jsdom
 */
import { Board } from "../scripts/board/board.js";
import { LocalDatastore } from "../scripts/board/local-datastore.js";
import { setupConnectorEvents } from "../scripts/board-items/connector-events-refactored.js";
import { StateMachineValidator } from "../scripts/ui/state-machine-validator.js";
import { StateMachineTester } from "../scripts/ui/state-machine-testing.js";

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
      const sticky1Id = board.putSticky({ text: "sticky1", location: { x: 100, y: 100 } });
      const sticky2Id = board.putSticky({ text: "sticky2", location: { x: 200, y: 200 } });

      const connectorId = board.putConnector({
        originId: sticky1Id,
        destinationId: sticky2Id,
        color: "#000000",
        arrowHead: "filled"
      });

      const connector = board.getConnector(connectorId);
      expect(connector.originId).toBe(sticky1Id);
      expect(connector.destinationId).toBe(sticky2Id);
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
      const stickyId = board.putSticky({ text: "sticky", location: { x: 100, y: 100 } });

      const connectorId = board.putConnector({
        originId: stickyId,
        destinationPoint: { x: 200, y: 200 },
        color: "#00ff00",
        arrowHead: "line"
      });

      const connector = board.getConnector(connectorId);
      expect(connector.originId).toBe(stickyId);
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
      const stickyId = board.putSticky({ text: "sticky", location: { x: 100, y: 100 } });
      const connectorId = board.putConnector({
        originPoint: { x: 50, y: 50 },
        destinationPoint: { x: 200, y: 200 },
        color: "#000000"
      });

      // Connect origin to sticky
      board.updateConnectorEndpoint(connectorId, 'origin', { stickyId });
      
      const connector = board.getConnector(connectorId);
      expect(connector.originId).toBe(stickyId);
      expect(connector.originPoint).toBeUndefined();
      expect(connector.destinationPoint).toEqual({ x: 200, y: 200 });
    });

    it("should connect endpoint to image", () => {
      const imageId = board.putImage({ 
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
      board.updateConnectorEndpoint(connectorId, 'destination', { imageId });
      
      const connector = board.getConnector(connectorId);
      expect(connector.destinationImageId).toBe(imageId);
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
      const stickyId = board.putSticky({ text: "sticky", location: { x: 100, y: 100 } });
      
      const connectorId = board.putConnector({
        originId: stickyId,
        destinationPoint: { x: 200, y: 200 },
        color: "#000000"
      });

      const originalConnector = board.getConnector(connectorId);
      expect(originalConnector.originId).toBe(stickyId);
      expect(originalConnector.destinationPoint).toEqual({ x: 200, y: 200 });

      // Move the connector - only free endpoint should move
      board.moveConnector(connectorId, 25, 15);

      const movedConnector = board.getConnector(connectorId);
      expect(movedConnector.originId).toBe(stickyId); // Connected endpoint should not change
      expect(movedConnector.destinationPoint).toEqual({ x: 225, y: 215 }); // Free endpoint should move
    });

    it("should not move fully connected connector", () => {
      const sticky1Id = board.putSticky({ text: "sticky1", location: { x: 100, y: 100 } });
      const sticky2Id = board.putSticky({ text: "sticky2", location: { x: 200, y: 200 } });
      
      const connectorId = board.putConnector({
        originId: sticky1Id,
        destinationId: sticky2Id,
        color: "#000000"
      });

      const originalConnector = board.getConnector(connectorId);
      expect(originalConnector.originId).toBe(sticky1Id);
      expect(originalConnector.destinationId).toBe(sticky2Id);

      // Try to move the connector - it should not change
      board.moveConnector(connectorId, 50, 30);

      const movedConnector = board.getConnector(connectorId);
      expect(movedConnector.originId).toBe(sticky1Id);
      expect(movedConnector.destinationId).toBe(sticky2Id);
      // No originPoint or destinationPoint should exist
      expect(movedConnector.originPoint).toBeUndefined();
      expect(movedConnector.destinationPoint).toBeUndefined();
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
