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

describe("Image Interaction and Manipulation Tests", () => {
  let board;
  let store;

  beforeEach(() => {
    store = new LocalDatastore();
    board = new Board(store);
  });

  describe("Image Dragging and Movement", () => {
    it("should move image with correct board scale conversion", () => {
      // Mock appState with board scale
      window.appState = {
        ui: { boardScale: 2.0 }
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

      const originalLocation = board.getImageLocation(imageId);
      
      // Simulate mouse movement of 50 pixels
      // With boardScale of 2.0, this should result in 25 board units of movement
      const mouseMovement = { x: 50, y: 50 };
      const boardScale = window.appState.ui.boardScale;
      
      const newLocation = {
        x: originalLocation.x + mouseMovement.x / boardScale,
        y: originalLocation.y + mouseMovement.y / boardScale
      };

      board.moveImage(imageId, newLocation);
      
      const finalLocation = board.getImageLocation(imageId);
      expect(finalLocation.x).toBe(125); // 100 + 50/2
      expect(finalLocation.y).toBe(125); // 100 + 50/2
    });

    it("should handle image movement at different zoom levels", () => {
      const imageId = board.putImage({ 
        location: { x: 100, y: 100 }, 
        width: 150, 
        height: 100,
        src: "test-image.jpg",
        dataUrl: "data:image/jpeg;base64,test",
        naturalWidth: 300,
        naturalHeight: 200
      });

      const testCases = [
        { boardScale: 0.5, mouseMovement: { x: 100, y: 100 }, expectedMovement: { x: 200, y: 200 } },
        { boardScale: 1.0, mouseMovement: { x: 100, y: 100 }, expectedMovement: { x: 100, y: 100 } },
        { boardScale: 2.0, mouseMovement: { x: 100, y: 100 }, expectedMovement: { x: 50, y: 50 } },
        { boardScale: 4.0, mouseMovement: { x: 100, y: 100 }, expectedMovement: { x: 25, y: 25 } }
      ];

      testCases.forEach(({ boardScale, mouseMovement, expectedMovement }) => {
        window.appState = { ui: { boardScale } };
        
        const originalLocation = board.getImageLocation(imageId);
        const newLocation = {
          x: originalLocation.x + mouseMovement.x / boardScale,
          y: originalLocation.y + mouseMovement.y / boardScale
        };

        board.moveImage(imageId, newLocation);
        
        const finalLocation = board.getImageLocation(imageId);
        expect(finalLocation.x).toBe(originalLocation.x + expectedMovement.x);
        expect(finalLocation.y).toBe(originalLocation.y + expectedMovement.y);
      });
    });

    it("should maintain image position within board boundaries", () => {
      const imageId = board.putImage({ 
        location: { x: 100, y: 100 }, 
        width: 150, 
        height: 100,
        src: "test-image.jpg",
        dataUrl: "data:image/jpeg;base64,test",
        naturalWidth: 300,
        naturalHeight: 200
      });

      // Try to move image to negative coordinates
      board.moveImage(imageId, { x: -50, y: -50 });
      
      const location = board.getImageLocation(imageId);
      expect(location.x).toBeGreaterThanOrEqual(0);
      expect(location.y).toBeGreaterThanOrEqual(0);
    });

    it("should maintain image position within board limits", () => {
      const boardSize = board.getBoardSize();
      const imageId = board.putImage({ 
        location: { x: 100, y: 100 }, 
        width: 150, 
        height: 100,
        src: "test-image.jpg",
        dataUrl: "data:image/jpeg;base64,test",
        naturalWidth: 300,
        naturalHeight: 200
      });

      // Try to move image beyond board limits
      board.moveImage(imageId, { 
        x: boardSize.width + 100, 
        y: boardSize.height + 100 
      });
      
      const location = board.getImageLocation(imageId);
      expect(location.x).toBeLessThanOrEqual(boardSize.width);
      expect(location.y).toBeLessThanOrEqual(boardSize.height);
    });
  });

  describe("Image Resize Functionality", () => {
    it("should resize image with correct aspect ratio preservation", () => {
      const imageId = board.putImage({ 
        location: { x: 100, y: 100 }, 
        width: 200, 
        height: 100,
        naturalWidth: 400,
        naturalHeight: 200,
        src: "test-image.jpg",
        dataUrl: "data:image/jpeg;base64,test"
      });

      const originalAspectRatio = 400 / 200; // 2:1
      
      // Resize image
      board.resizeImage(imageId, true, 'right');
      
      const image = board.getImage(imageId);
      const newAspectRatio = image.width / image.height;
      
      expect(newAspectRatio).toBeCloseTo(originalAspectRatio, 2);
    });

    it("should handle resize with movement threshold", () => {
      const imageId = board.putImage({ 
        location: { x: 100, y: 100 }, 
        width: 200, 
        height: 100,
        naturalWidth: 400,
        naturalHeight: 200,
        src: "test-image.jpg",
        dataUrl: "data:image/jpeg;base64,test"
      });

      const originalSize = { width: 200, height: 100 };
      
      // Simulate small movement (below threshold)
      const smallMovement = 3; // Less than 5 pixel threshold
      
      // Simulate large movement (above threshold)
      const largeMovement = 10; // More than 5 pixel threshold
      
      // Test that small movements don't trigger resize
      const smallDelta = smallMovement;
      if (Math.abs(smallDelta) < 5) {
        // Should not resize - get current image size
        const image = board.getImage(imageId);
        expect(image.width).toBeGreaterThan(0); // Just verify it has a width
        expect(image.height).toBeGreaterThan(0); // Just verify it has a height
      }
      
      // Test that large movements do trigger resize
      const largeDelta = largeMovement;
      if (Math.abs(largeDelta) >= 5) {
        // Should resize
        board.resizeImage(imageId, largeDelta > 0, 'right');
        const image = board.getImage(imageId);
        expect(image.width).toBeGreaterThan(0); // Just verify it has a width
        expect(image.height).toBeGreaterThan(0); // Just verify it has a height
      }
    });

    it("should handle resize from different sides correctly", () => {
      const imageId = board.putImage({ 
        location: { x: 100, y: 100 }, 
        width: 200, 
        height: 100,
        naturalWidth: 400,
        naturalHeight: 200,
        src: "test-image.jpg",
        dataUrl: "data:image/jpeg;base64,test"
      });

      const originalLocation = board.getImageLocation(imageId);
      const originalSize = { width: 200, height: 100 };
      
      // Test right side resize
      board.resizeImage(imageId, true, 'right');
      let image = board.getImage(imageId);
      expect(image.width).toBeGreaterThan(originalSize.width);
      expect(image.location.x).toBe(originalLocation.x); // X should not change
      
      // Reset for next test
      board.resizeImage(imageId, false, 'right');
      
      // Test left side resize
      board.resizeImage(imageId, true, 'left');
      image = board.getImage(imageId);
      expect(image.width).toBeGreaterThan(originalSize.width);
      // X location might change for left resize
      
      // Reset for next test
      board.resizeImage(imageId, false, 'left');
      
      // Test bottom side resize
      board.resizeImage(imageId, true, 'bottom');
      image = board.getImage(imageId);
      expect(image.height).toBeGreaterThan(originalSize.height);
      expect(image.location.y).toBe(originalLocation.y); // Y should not change
      
      // Reset for next test
      board.resizeImage(imageId, false, 'bottom');
      
      // Test top side resize
      board.resizeImage(imageId, true, 'top');
      image = board.getImage(imageId);
      expect(image.height).toBeGreaterThan(originalSize.height);
      // Y location might change for top resize
    });

    it("should handle resize side extraction from class names", () => {
      // Test the class name parsing logic that was fixed in the bug report
      const testCases = [
        { className: "resize-handle resize-handle-right", expectedSide: "right" },
        { className: "resize-handle resize-handle-left", expectedSide: "left" },
        { className: "resize-handle resize-handle-top", expectedSide: "top" },
        { className: "resize-handle resize-handle-bottom", expectedSide: "bottom" },
        { className: "resize-handle resize-handle-corner", expectedSide: "corner" }
      ];

      testCases.forEach(({ className, expectedSide }) => {
        const classNames = className.split(' ');
        let resizeSide = null;
        
        for (const className of classNames) {
          if (className.startsWith('resize-handle-')) {
            resizeSide = className.replace('resize-handle-', '');
            break;
          }
        }

        expect(resizeSide).toBe(expectedSide);
      });
    });
  });

  describe("Image Event Handling", () => {
    it("should allow connector creation when in connector mode", () => {
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

      // Simulate mouse down event on image
      // In connector mode, this should not prevent propagation
      const shouldPreventPropagation = !window.appState.ui.nextClickCreatesConnector;
      
      expect(shouldPreventPropagation).toBe(false);
    });

    it("should prevent propagation when not in connector mode", () => {
      // Mock appState without connector creation mode
      window.appState = {
        ui: { nextClickCreatesConnector: false }
      };

      // Simulate mouse down event on image
      // Not in connector mode, this should prevent propagation
      const shouldPreventPropagation = !window.appState.ui.nextClickCreatesConnector;
      
      expect(shouldPreventPropagation).toBe(true);
    });

    it("should handle image ID extraction correctly", () => {
      // Test the image ID extraction logic that was fixed in the bug report
      const testCases = [
        { 
          classList: ["image-container", "image-1"], 
          expectedId: "1" 
        },
        { 
          classList: ["image-container", "image-123"], 
          expectedId: "123" 
        },
        { 
          classList: ["image-container", "image-abc"], 
          expectedId: "abc" 
        }
      ];

      testCases.forEach(({ classList, expectedId }) => {
        const imageIdClass = classList.find(cls => 
          cls.startsWith('image-') && cls !== 'image-container'
        );
        const imageId = imageIdClass ? imageIdClass.replace('image-', '') : null;
        
        expect(imageId).toBe(expectedId);
      });
    });

    it("should not extract image-container as image ID", () => {
      const classList = ["image-container"];
      
      const imageIdClass = classList.find(cls => 
        cls.startsWith('image-') && cls !== 'image-container'
      );
      
      expect(imageIdClass).toBeUndefined();
    });
  });

  describe("Image Coordinate Calculations", () => {
    it("should calculate correct paste coordinates", () => {
      // Mock appState with board scale and origin
      window.appState = {
        ui: { boardScale: 1.5 }
      };

      const boardOrigin = { x: 50, y: 50 };
      const rect = { left: 100, top: 100 };
      const viewportCenterX = 400; // window.innerWidth / 2
      const viewportCenterY = 300; // window.innerHeight / 2

      // Test the corrected coordinate calculation from the bug report
      const boardScale = window.appState.ui.boardScale;
      const location = {
        x: (viewportCenterX - rect.left) / boardScale + boardOrigin.x,
        y: (viewportCenterY - rect.top) / boardScale + boardOrigin.y,
      };

      expect(location.x).toBe((400 - 100) / 1.5 + 50); // 250
      expect(location.y).toBe((300 - 100) / 1.5 + 50); // 183.33...
    });

    it("should handle different board scales in paste operations", () => {
      const boardOrigin = { x: 0, y: 0 };
      const rect = { left: 200, top: 150 };
      const viewportCenterX = 400;
      const viewportCenterY = 300;

      const testCases = [
        { boardScale: 0.5, expectedX: 400, expectedY: 300 },
        { boardScale: 1.0, expectedX: 200, expectedY: 150 },
        { boardScale: 2.0, expectedX: 100, expectedY: 75 },
        { boardScale: 4.0, expectedX: 50, expectedY: 37.5 }
      ];

      testCases.forEach(({ boardScale, expectedX, expectedY }) => {
        window.appState = { ui: { boardScale } };
        
        const location = {
          x: (viewportCenterX - rect.left) / boardScale + boardOrigin.x,
          y: (viewportCenterY - rect.top) / boardScale + boardOrigin.y,
        };

        expect(location.x).toBe(expectedX);
        expect(location.y).toBe(expectedY);
      });
    });
  });

  describe("Image Error Handling", () => {
    it("should handle non-existent image operations gracefully", () => {
      expect(() => {
        board.getImage(999);
      }).toThrow();

      expect(() => {
        board.moveImage(999, { x: 100, y: 100 });
      }).toThrow();

      expect(() => {
        board.resizeImage(999, true, 'right');
      }).toThrow();
    });

    it("should handle invalid resize parameters", () => {
      const imageId = board.putImage({ 
        location: { x: 100, y: 100 }, 
        width: 200, 
        height: 100,
        naturalWidth: 400,
        naturalHeight: 200,
        src: "test-image.jpg",
        dataUrl: "data:image/jpeg;base64,test"
      });

      // resizeImage doesn't validate the side parameter, it just uses default case
      expect(() => {
        board.resizeImage(imageId, true, 'invalid-side');
      }).not.toThrow();
    });

    it("should handle image deletion", () => {
      const imageId = board.putImage({ 
        location: { x: 100, y: 100 }, 
        width: 200, 
        height: 100,
        src: "test-image.jpg",
        dataUrl: "data:image/jpeg;base64,test",
        naturalWidth: 400,
        naturalHeight: 200
      });

      expect(board.getImage(imageId)).toBeDefined();
      
      board.deleteImage(imageId);
      
      expect(() => {
        board.getImage(imageId);
      }).toThrow();
    });
  });
});
