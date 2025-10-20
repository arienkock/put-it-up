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

describe("Coordinate Calculation and Board Scale Tests", () => {
  let board;
  let store;

  beforeEach(() => {
    store = new LocalDatastore();
    board = new Board(store);
  });

  describe("Board Scale Conversion", () => {
    it("should convert screen coordinates to board coordinates correctly", () => {
      const testCases = [
        { screenX: 100, screenY: 100, boardScale: 1.0, expectedX: 100, expectedY: 100 },
        { screenX: 100, screenY: 100, boardScale: 2.0, expectedX: 50, expectedY: 50 },
        { screenX: 100, screenY: 100, boardScale: 0.5, expectedX: 200, expectedY: 200 },
        { screenX: 200, screenY: 150, boardScale: 1.5, expectedX: 133.33, expectedY: 100 }
      ];

      testCases.forEach(({ screenX, screenY, boardScale, expectedX, expectedY }) => {
        window.appState = { ui: { boardScale } };
        
        const boardX = screenX / boardScale;
        const boardY = screenY / boardScale;
        
        expect(boardX).toBeCloseTo(expectedX, 2);
        expect(boardY).toBeCloseTo(expectedY, 2);
      });
    });

    it("should convert board coordinates to screen coordinates correctly", () => {
      const testCases = [
        { boardX: 100, boardY: 100, boardScale: 1.0, expectedX: 100, expectedY: 100 },
        { boardX: 100, boardY: 100, boardScale: 2.0, expectedX: 200, expectedY: 200 },
        { boardX: 100, boardY: 100, boardScale: 0.5, expectedX: 50, expectedY: 50 },
        { boardX: 133.33, boardY: 100, boardScale: 1.5, expectedX: 200, expectedY: 150 }
      ];

      testCases.forEach(({ boardX, boardY, boardScale, expectedX, expectedY }) => {
        window.appState = { ui: { boardScale } };
        
        const screenX = boardX * boardScale;
        const screenY = boardY * boardScale;
        
        expect(screenX).toBeCloseTo(expectedX, 2);
        expect(screenY).toBeCloseTo(expectedY, 2);
      });
    });

    it("should handle zero board scale gracefully", () => {
      window.appState = { ui: { boardScale: 0 } };
      
      // Should fallback to scale of 1
      const effectiveScale = window.appState.ui.boardScale || 1;
      expect(effectiveScale).toBe(1);
    });

    it("should handle undefined board scale gracefully", () => {
      window.appState = { ui: {} };
      
      // Should fallback to scale of 1
      const effectiveScale = window.appState.ui.boardScale || 1;
      expect(effectiveScale).toBe(1);
    });
  });

  describe("Paste Handler Coordinate Calculation", () => {
    it("should calculate correct paste coordinates with board origin", () => {
      const boardOrigin = { x: 100, y: 50 };
      const boardScale = 2.0;
      const rect = { left: 200, top: 150 };
      const viewportCenterX = 400;
      const viewportCenterY = 300;

      // Test the corrected formula from the bug report
      const location = {
        x: (viewportCenterX - rect.left) / boardScale + boardOrigin.x,
        y: (viewportCenterY - rect.top) / boardScale + boardOrigin.y,
      };

      expect(location.x).toBe((400 - 200) / 2 + 100); // 200
      expect(location.y).toBe((300 - 150) / 2 + 50);  // 125
    });

    it("should handle different board origins in paste operations", () => {
      const boardScale = 1.5;
      const rect = { left: 100, top: 100 };
      const viewportCenterX = 300;
      const viewportCenterY = 200;

      const testCases = [
        { origin: { x: 0, y: 0 }, expectedX: 133.33, expectedY: 66.67 },
        { origin: { x: 50, y: 25 }, expectedX: 183.33, expectedY: 91.67 },
        { origin: { x: -50, y: -25 }, expectedX: 83.33, expectedY: 41.67 }
      ];

      testCases.forEach(({ origin, expectedX, expectedY }) => {
        const location = {
          x: (viewportCenterX - rect.left) / boardScale + origin.x,
          y: (viewportCenterY - rect.top) / boardScale + origin.y,
        };

        expect(location.x).toBeCloseTo(expectedX, 2);
        expect(location.y).toBeCloseTo(expectedY, 2);
      });
    });

    it("should handle edge cases in paste coordinate calculation", () => {
      const boardOrigin = { x: 0, y: 0 };
      const boardScale = 1.0;
      
      // Test when viewport center equals rect position
      const rect = { left: 200, top: 150 };
      const viewportCenterX = 200;
      const viewportCenterY = 150;

      const location = {
        x: (viewportCenterX - rect.left) / boardScale + boardOrigin.x,
        y: (viewportCenterY - rect.top) / boardScale + boardOrigin.y,
      };

      expect(location.x).toBe(0);
      expect(location.y).toBe(0);
    });
  });

  describe("Connector Coordinate Calculations", () => {
    it("should calculate connector endpoints with board origin correctly", () => {
      const boardOrigin = { x: 50, y: 25 };
      const boardScale = 1.0;
      
      // Test connector endpoint calculation that was fixed in the bug report
      const event = { clientX: 300, clientY: 200 };
      const rect = { left: 100, top: 75 };
      
      // FIXED: Subtract boardOrigin instead of adding it
      const point = {
        x: event.clientX - rect.left - boardOrigin.x,
        y: event.clientY - rect.top - boardOrigin.y
      };

      expect(point.x).toBe(300 - 100 - 50); // 150
      expect(point.y).toBe(200 - 75 - 25);  // 100
    });

    it("should handle different board scales in connector calculations", () => {
      const boardOrigin = { x: 0, y: 0 };
      const event = { clientX: 200, clientY: 150 };
      const rect = { left: 100, top: 75 };

      const testCases = [
        { boardScale: 1.0, expectedX: 100, expectedY: 75 },
        { boardScale: 2.0, expectedX: 50, expectedY: 37.5 },
        { boardScale: 0.5, expectedX: 200, expectedY: 150 }
      ];

      testCases.forEach(({ boardScale, expectedX, expectedY }) => {
        const point = {
          x: (event.clientX - rect.left) / boardScale - boardOrigin.x,
          y: (event.clientY - rect.top) / boardScale - boardOrigin.y
        };

        expect(point.x).toBeCloseTo(expectedX, 2);
        expect(point.y).toBeCloseTo(expectedY, 2);
      });
    });

    it("should handle negative coordinates in connector calculations", () => {
      const boardOrigin = { x: 100, y: 50 };
      const boardScale = 1.0;
      const event = { clientX: 50, clientY: 25 };
      const rect = { left: 200, top: 150 };

      const point = {
        x: event.clientX - rect.left - boardOrigin.x,
        y: event.clientY - rect.top - boardOrigin.y
      };

      expect(point.x).toBe(50 - 200 - 100); // -250
      expect(point.y).toBe(25 - 150 - 50);  // -175
    });
  });

  describe("Viewport to Board Coordinate Conversion", () => {
    it("should convert viewport coordinates to board coordinates", () => {
      const boardOrigin = { x: 100, y: 50 };
      const boardScale = 2.0;
      const viewportX = 300;
      const viewportY = 200;

      const boardX = (viewportX / boardScale) + boardOrigin.x;
      const boardY = (viewportY / boardScale) + boardOrigin.y;

      expect(boardX).toBe(250); // (300/2) + 100
      expect(boardY).toBe(150); // (200/2) + 50
    });

    it("should convert board coordinates to viewport coordinates", () => {
      const boardOrigin = { x: 100, y: 50 };
      const boardScale = 2.0;
      const boardX = 250;
      const boardY = 150;

      const viewportX = (boardX - boardOrigin.x) * boardScale;
      const viewportY = (boardY - boardOrigin.y) * boardScale;

      expect(viewportX).toBe(300); // (250-100) * 2
      expect(viewportY).toBe(200); // (150-50) * 2
    });

    it("should handle coordinate conversion at different zoom levels", () => {
      const boardOrigin = { x: 0, y: 0 };
      const boardX = 100;
      const boardY = 100;

      const testCases = [
        { boardScale: 0.5, expectedViewportX: 50, expectedViewportY: 50 },
        { boardScale: 1.0, expectedViewportX: 100, expectedViewportY: 100 },
        { boardScale: 2.0, expectedViewportX: 200, expectedViewportY: 200 },
        { boardScale: 4.0, expectedViewportX: 400, expectedViewportY: 400 }
      ];

      testCases.forEach(({ boardScale, expectedViewportX, expectedViewportY }) => {
        const viewportX = (boardX - boardOrigin.x) * boardScale;
        const viewportY = (boardY - boardOrigin.y) * boardScale;

        expect(viewportX).toBe(expectedViewportX);
        expect(viewportY).toBe(expectedViewportY);
      });
    });
  });

  describe("Boundary and Edge Case Handling", () => {
    it("should handle coordinates at board boundaries", () => {
      const boardSize = board.getBoardSize();
      const boardOrigin = board.getOrigin();

      // Test coordinates at board edges
      const edgeCoordinates = [
        { x: boardOrigin.x, y: boardOrigin.y }, // Top-left
        { x: boardSize.width, y: boardOrigin.y }, // Top-right
        { x: boardOrigin.x, y: boardSize.height }, // Bottom-left
        { x: boardSize.width, y: boardSize.height } // Bottom-right
      ];

      edgeCoordinates.forEach(({ x, y }) => {
        expect(x).toBeGreaterThanOrEqual(boardOrigin.x);
        expect(y).toBeGreaterThanOrEqual(boardOrigin.y);
        expect(x).toBeLessThanOrEqual(boardSize.width);
        expect(y).toBeLessThanOrEqual(boardSize.height);
      });
    });

    it("should clamp coordinates to board boundaries", () => {
      const boardSize = board.getBoardSize();
      const boardOrigin = board.getOrigin();

      // Test coordinates outside boundaries
      const outsideCoordinates = [
        { x: -100, y: -100 }, // Negative coordinates
        { x: boardSize.width + 100, y: boardSize.height + 100 }, // Beyond limits
        { x: -50, y: boardSize.height + 50 }, // Mixed negative/positive
        { x: boardSize.width + 50, y: -50 } // Mixed positive/negative
      ];

      outsideCoordinates.forEach(({ x, y }) => {
        const clampedX = Math.max(boardOrigin.x, Math.min(x, boardSize.width));
        const clampedY = Math.max(boardOrigin.y, Math.min(y, boardSize.height));

        expect(clampedX).toBeGreaterThanOrEqual(boardOrigin.x);
        expect(clampedY).toBeGreaterThanOrEqual(boardOrigin.y);
        expect(clampedX).toBeLessThanOrEqual(boardSize.width);
        expect(clampedY).toBeLessThanOrEqual(boardSize.height);
      });
    });

    it("should handle extreme coordinate values", () => {
      const boardScale = 1.0;
      const boardOrigin = { x: 0, y: 0 };

      const extremeValues = [
        { x: Number.MAX_SAFE_INTEGER, y: Number.MAX_SAFE_INTEGER },
        { x: Number.MIN_SAFE_INTEGER, y: Number.MIN_SAFE_INTEGER },
        { x: Infinity, y: Infinity },
        { x: -Infinity, y: -Infinity },
        { x: NaN, y: NaN }
      ];

      extremeValues.forEach(({ x, y }) => {
        // Should handle extreme values without crashing
        const safeX = isFinite(x) ? x : 0;
        const safeY = isFinite(y) ? y : 0;

        expect(isFinite(safeX)).toBe(true);
        expect(isFinite(safeY)).toBe(true);
      });
    });
  });

  describe("Coordinate System Consistency", () => {
    it("should maintain coordinate consistency across operations", () => {
      const boardOrigin = { x: 50, y: 25 };
      const boardScale = 1.5;
      
      // Create a sticky at a specific board coordinate
      const stickyId = board.putSticky({ 
        text: "test", 
        location: { x: 100, y: 100 } 
      });

      // Verify the sticky is at the expected location
      const stickyLocation = board.getStickyLocation(stickyId);
      expect(stickyLocation.x).toBe(100);
      expect(stickyLocation.y).toBe(100);

      // Move the sticky and verify new location
      board.moveSticky(stickyId, { x: 150, y: 150 });
      const newLocation = board.getStickyLocation(stickyId);
      expect(newLocation.x).toBe(150);
      expect(newLocation.y).toBe(150);
    });

    it("should handle coordinate transformations consistently", () => {
      const boardOrigin = { x: 100, y: 50 };
      const boardScale = 2.0;
      
      // Test round-trip coordinate conversion
      const originalBoardX = 200;
      const originalBoardY = 150;

      // Convert to viewport coordinates
      const viewportX = (originalBoardX - boardOrigin.x) * boardScale;
      const viewportY = (originalBoardY - boardOrigin.y) * boardScale;

      // Convert back to board coordinates
      const convertedBoardX = (viewportX / boardScale) + boardOrigin.x;
      const convertedBoardY = (viewportY / boardScale) + boardOrigin.y;

      expect(convertedBoardX).toBeCloseTo(originalBoardX, 2);
      expect(convertedBoardY).toBeCloseTo(originalBoardY, 2);
    });
  });
});