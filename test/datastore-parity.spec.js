import { LocalDatastore } from "../scripts/board/local-datastore.js";
import { FirestoreStore } from "../scripts/network/network-firestore.js";
import fs from 'fs';
import path from 'path';

// Mock Firebase/Firestore for testing
global.firebase = {
  firestore: () => ({
    collection: () => ({
      doc: () => ({
        id: 'mock-doc-id',
        onSnapshot: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        collection: () => ({
          doc: () => ({
            id: 'mock-subdoc-id',
            set: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          }),
          onSnapshot: jest.fn(),
        }),
      }),
    }),
  }),
};

describe("Datastore Parity Tests", () => {
  let localStore, firestoreStore;

  beforeEach(() => {
    // Reset app state for each test
    const { getAppState } = require("../scripts/app-state.js");
    const state = getAppState();
    state.stickies = {};
    state.connectors = {};
    state.images = {};
    state.board = null;
    state.idGen = 0;
    state.connectorIdGen = 0;
    state.imageIdGen = 0;

    localStore = new LocalDatastore();
    firestoreStore = new FirestoreStore();
    
    // Mock the connect method to avoid real Firestore connection
    firestoreStore.connect = jest.fn(() => {
      // Initialize mock references
      firestoreStore.docRef = {
        update: jest.fn(),
        set: jest.fn(),
        onSnapshot: jest.fn()
      };
      firestoreStore.stickyRef = {
        doc: jest.fn(() => ({
          id: 'mock-sticky-id',
          set: jest.fn(),
          update: jest.fn(),
          delete: jest.fn()
        })),
        onSnapshot: jest.fn()
      };
      firestoreStore.connectorRef = {
        doc: jest.fn(() => ({
          id: 'mock-connector-id',
          set: jest.fn(),
          update: jest.fn(),
          delete: jest.fn()
        })),
        onSnapshot: jest.fn()
      };
      firestoreStore.imageRef = {
        doc: jest.fn(() => ({
          id: 'mock-image-id',
          set: jest.fn(),
          update: jest.fn(),
          delete: jest.fn()
        })),
        onSnapshot: jest.fn()
      };
      firestoreStore.readyForUse = true;
    });
    firestoreStore.isReadyForUse = jest.fn(() => true);
  });

  describe("Method Signature Parity", () => {
    it("should have identical public method names", () => {
      const localInstance = new LocalDatastore();
      const firestoreInstance = new FirestoreStore();
      
      const localMethods = getPublicMethodsFromInstance(localInstance);
      const firestoreMethods = getPublicMethodsFromInstance(firestoreInstance);

      // Sort for easier comparison
      localMethods.sort();
      firestoreMethods.sort();

      expect(localMethods).toEqual(firestoreMethods);
    });

    it("should have matching parameter counts for each method", () => {
      const localInstance = new LocalDatastore();
      const firestoreInstance = new FirestoreStore();
      
      const localMethods = getPublicMethodsFromInstance(localInstance);
      
      localMethods.forEach(methodName => {
        const localParamCount = getParameterCount(localInstance[methodName]);
        const firestoreParamCount = getParameterCount(firestoreInstance[methodName]);
        
        expect(localParamCount).toBe(firestoreParamCount);
      });
    });
  });

  describe("Source Code Analysis", () => {
    it("should have consistent error message patterns", () => {
      const localSource = getSourceCode("scripts/board/local-datastore.js");
      const firestoreSource = getSourceCode("scripts/network/network-firestore.js");

      // Check for consistent error message patterns
      const localErrorPattern = /"No such sticky id="/;
      const firestoreErrorPattern = /"No such sticky id="/;

      expect(localSource).toMatch(localErrorPattern);
      expect(firestoreSource).toMatch(firestoreErrorPattern);
    });

    it("should have consistent observer notification methods", () => {
      const localInstance = new LocalDatastore();
      const firestoreInstance = new FirestoreStore();
      
      const localMethods = getPublicMethodsFromInstance(localInstance);
      const firestoreMethods = getPublicMethodsFromInstance(firestoreInstance);

      const observerMethods = [
        'notifyStickyChange',
        'notifyConnectorChange', 
        'notifyImageChange',
        'notifyBoardChange',
        'addObserver'
      ];

      observerMethods.forEach(method => {
        expect(localMethods).toContain(method);
        expect(firestoreMethods).toContain(method);
      });
    });

    it("should handle the same entity types", () => {
      const localInstance = new LocalDatastore();
      const firestoreInstance = new FirestoreStore();
      
      const localMethods = getPublicMethodsFromInstance(localInstance);
      const firestoreMethods = getPublicMethodsFromInstance(firestoreInstance);

      const entityMethods = [
        'createSticky', 'getSticky', 'updateText', 'updateColor', 'setLocation', 'updateSize', 'deleteSticky',
        'createConnector', 'getConnector', 'updateArrowHead', 'updateConnectorEndpoint', 'deleteConnector',
        'createImage', 'getImage', 'setImageLocation', 'updateImageSize', 'deleteImage'
      ];

      entityMethods.forEach(method => {
        expect(localMethods).toContain(method);
        expect(firestoreMethods).toContain(method);
      });
    });
  });

  describe("Runtime Behavioral Testing", () => {
    const testCases = [
      {
        name: "LocalDatastore",
        store: () => new LocalDatastore()
      },
      {
        name: "FirestoreStore", 
        store: () => {
          const store = new FirestoreStore();
          store.connect = jest.fn(() => {
            // Initialize mock references
            store.docRef = {
              update: jest.fn(),
              set: jest.fn(),
              onSnapshot: jest.fn()
            };
            store.stickyRef = {
              doc: jest.fn(() => ({
                id: 'mock-sticky-id',
                set: jest.fn(),
                update: jest.fn(),
                delete: jest.fn()
              })),
              onSnapshot: jest.fn()
            };
            store.connectorRef = {
              doc: jest.fn(() => ({
                id: 'mock-connector-id',
                set: jest.fn(),
                update: jest.fn(),
                delete: jest.fn()
              })),
              onSnapshot: jest.fn()
            };
            store.imageRef = {
              doc: jest.fn(() => ({
                id: 'mock-image-id',
                set: jest.fn(),
                update: jest.fn(),
                delete: jest.fn()
              })),
              onSnapshot: jest.fn()
            };
            store.readyForUse = true;
          });
          store.isReadyForUse = jest.fn(() => true);
          return store;
        }
      }
    ];

    testCases.forEach(({ name, store }) => {
      describe(`${name} Runtime Behavior`, () => {
        let testStore;

        beforeEach(() => {
          testStore = store();
          if (testStore.connect) {
            testStore.connect();
          }
        });

        describe("Sticky Operations", () => {
          it("should create and retrieve stickies", () => {
            const stickyData = { text: "Test sticky", location: { x: 100, y: 200 }, color: "yellow" };
            const id = testStore.createSticky(stickyData);
            
            expect(typeof id).toBe("string");
            const retrieved = testStore.getSticky(id);
            expect(retrieved.text).toBe(stickyData.text);
            expect(retrieved.location).toEqual(stickyData.location);
            expect(retrieved.color).toBe(stickyData.color);
          });

          it("should update sticky text", () => {
            const stickyData = { text: "Original", location: { x: 100, y: 200 } };
            const id = testStore.createSticky(stickyData);
            
            testStore.updateText(id, "Updated text");
            const updated = testStore.getSticky(id);
            expect(updated.text).toBe("Updated text");
          });

          it("should update sticky color", () => {
            const stickyData = { text: "Test", location: { x: 100, y: 200 }, color: "red" };
            const id = testStore.createSticky(stickyData);
            
            testStore.updateColor(id, "blue");
            const updated = testStore.getSticky(id);
            expect(updated.color).toBe("blue");
          });

          it("should update sticky location", () => {
            const stickyData = { text: "Test", location: { x: 100, y: 200 } };
            const id = testStore.createSticky(stickyData);
            
            const newLocation = { x: 300, y: 400 };
            testStore.setLocation(id, newLocation);
            const updated = testStore.getSticky(id);
            expect(updated.location).toEqual(newLocation);
          });

          it("should update sticky size", () => {
            const stickyData = { text: "Test", location: { x: 100, y: 200 }, size: { width: 100, height: 50 } };
            const id = testStore.createSticky(stickyData);
            
            const newSize = { width: 200, height: 100 };
            testStore.updateSize(id, newSize);
            const updated = testStore.getSticky(id);
            expect(updated.size).toEqual(newSize);
          });

          it("should delete stickies", () => {
            const stickyData = { text: "To be deleted", location: { x: 100, y: 200 } };
            const id = testStore.createSticky(stickyData);
            
            testStore.deleteSticky(id);
            expect(() => testStore.getSticky(id)).toThrow("No such sticky id=");
          });

          it("should throw error for non-existent sticky", () => {
            expect(() => testStore.getSticky("non-existent")).toThrow("No such sticky id=");
          });
        });

        describe("Connector Operations", () => {
          it("should create and retrieve connectors", () => {
            const connectorData = { 
              originId: "sticky1", 
              destinationId: "sticky2", 
              color: "#000000",
              arrowHead: "filled"
            };
            const id = testStore.createConnector(connectorData);
            
            expect(typeof id).toBe("string");
            const retrieved = testStore.getConnector(id);
            expect(retrieved.originId).toBe(connectorData.originId);
            expect(retrieved.destinationId).toBe(connectorData.destinationId);
            expect(retrieved.color).toBe(connectorData.color);
            expect(retrieved.arrowHead).toBe(connectorData.arrowHead);
          });

          it("should update connector arrow head", () => {
            const connectorData = { originId: "sticky1", destinationId: "sticky2", arrowHead: "none" };
            const id = testStore.createConnector(connectorData);
            
            testStore.updateArrowHead(id, "filled");
            const updated = testStore.getConnector(id);
            expect(updated.arrowHead).toBe("filled");
          });

          it("should update connector endpoint", () => {
            const connectorData = { originId: "sticky1", destinationId: "sticky2" };
            const id = testStore.createConnector(connectorData);
            
            testStore.updateConnectorEndpoint(id, "origin", { stickyId: "sticky3" });
            const updated = testStore.getConnector(id);
            expect(updated.originId).toBe("sticky3");
          });

          it("should delete connectors", () => {
            const connectorData = { originId: "sticky1", destinationId: "sticky2" };
            const id = testStore.createConnector(connectorData);
            
            testStore.deleteConnector(id);
            expect(() => testStore.getConnector(id)).toThrow("No such connector id=");
          });

          it("should throw error for non-existent connector", () => {
            expect(() => testStore.getConnector("non-existent")).toThrow("No such connector id=");
          });
        });

        describe("Image Operations", () => {
          it("should create and retrieve images", () => {
            const imageData = { 
              src: "test.jpg", 
              location: { x: 100, y: 200 }, 
              width: 200, 
              height: 150 
            };
            const id = testStore.createImage(imageData);
            
            expect(typeof id).toBe("string");
            const retrieved = testStore.getImage(id);
            expect(retrieved.src).toBe(imageData.src);
            expect(retrieved.location).toEqual(imageData.location);
            expect(retrieved.width).toBe(imageData.width);
            expect(retrieved.height).toBe(imageData.height);
          });

          it("should update image location", () => {
            const imageData = { src: "test.jpg", location: { x: 100, y: 200 }, width: 200, height: 150 };
            const id = testStore.createImage(imageData);
            
            const newLocation = { x: 300, y: 400 };
            testStore.setImageLocation(id, newLocation);
            const updated = testStore.getImage(id);
            expect(updated.location).toEqual(newLocation);
          });

          it("should update image size", () => {
            const imageData = { src: "test.jpg", location: { x: 100, y: 200 }, width: 200, height: 150 };
            const id = testStore.createImage(imageData);
            
            testStore.updateImageSize(id, 300, 200);
            const updated = testStore.getImage(id);
            expect(updated.width).toBe(300);
            expect(updated.height).toBe(200);
          });

          it("should delete images", () => {
            const imageData = { src: "test.jpg", location: { x: 100, y: 200 }, width: 200, height: 150 };
            const id = testStore.createImage(imageData);
            
            testStore.deleteImage(id);
            expect(() => testStore.getImage(id)).toThrow("No such image id=");
          });

          it("should throw error for non-existent image", () => {
            expect(() => testStore.getImage("non-existent")).toThrow("No such image id=");
          });
        });

        describe("Board Operations", () => {
          it("should get and update board", () => {
            const defaults = { title: "Test Board", zoom: 1.0 };
            const board = testStore.getBoard(defaults);
            
            expect(board).toEqual(defaults);
            
            const updates = { title: "Updated Board", zoom: 1.5 };
            testStore.updateBoard(updates);
            
            const updatedBoard = testStore.getBoard({});
            expect(updatedBoard.title).toBe("Updated Board");
            expect(updatedBoard.zoom).toBe(1.5);
          });
        });

        describe("State Operations", () => {
          it("should get and set state", () => {
            // Create some test data
            const stickyId = testStore.createSticky({ text: "Test", location: { x: 100, y: 200 } });
            const connectorId = testStore.createConnector({ originId: stickyId, destinationId: "other" });
            const imageId = testStore.createImage({ src: "test.jpg", location: { x: 100, y: 200 }, width: 200, height: 150 });
            
            const state = testStore.getState();
            expect(state.stickies).toBeDefined();
            expect(state.connectors).toBeDefined();
            expect(state.images).toBeDefined();
            expect(state.idGen).toBeDefined();
            expect(state.connectorIdGen).toBeDefined();
            expect(state.imageIdGen).toBeDefined();
            
            // Test setting state
            const newState = {
              stickies: { "1": { text: "New sticky", location: { x: 0, y: 0 } } },
              connectors: {},
              images: {},
              idGen: 1,
              connectorIdGen: 0,
              imageIdGen: 0
            };
            
            testStore.setState(newState);
            const retrievedState = testStore.getState();
            expect(retrievedState.stickies).toEqual(newState.stickies);
            expect(retrievedState.idGen).toBe(1);
          });
        });

        describe("Observer Notifications", () => {
          it("should notify observers on sticky changes", () => {
            const observer = {
              onStickyChange: jest.fn(),
              onConnectorChange: jest.fn(),
              onImageChange: jest.fn(),
              onBoardChange: jest.fn()
            };
            
            testStore.addObserver(observer);
            
            const id = testStore.createSticky({ text: "Test", location: { x: 100, y: 200 } });
            expect(observer.onStickyChange).toHaveBeenCalledWith(id);
            
            testStore.updateText(id, "Updated");
            expect(observer.onStickyChange).toHaveBeenCalledTimes(2);
          });

          it("should notify observers on connector changes", () => {
            const observer = {
              onStickyChange: jest.fn(),
              onConnectorChange: jest.fn(),
              onImageChange: jest.fn(),
              onBoardChange: jest.fn()
            };
            
            testStore.addObserver(observer);
            
            const id = testStore.createConnector({ originId: "sticky1", destinationId: "sticky2" });
            expect(observer.onConnectorChange).toHaveBeenCalledWith(id);
            
            testStore.updateArrowHead(id, "filled");
            expect(observer.onConnectorChange).toHaveBeenCalledTimes(2);
          });

          it("should notify observers on image changes", () => {
            const observer = {
              onStickyChange: jest.fn(),
              onConnectorChange: jest.fn(),
              onImageChange: jest.fn(),
              onBoardChange: jest.fn()
            };
            
            testStore.addObserver(observer);
            
            const id = testStore.createImage({ src: "test.jpg", location: { x: 100, y: 200 }, width: 200, height: 150 });
            expect(observer.onImageChange).toHaveBeenCalledWith(id);
            
            testStore.setImageLocation(id, { x: 300, y: 400 });
            expect(observer.onImageChange).toHaveBeenCalledTimes(2);
          });

          it("should notify observers on board changes", () => {
            const observer = {
              onStickyChange: jest.fn(),
              onConnectorChange: jest.fn(),
              onImageChange: jest.fn(),
              onBoardChange: jest.fn()
            };
            
            testStore.addObserver(observer);
            
            testStore.updateBoard({ title: "New Title" });
            expect(observer.onBoardChange).toHaveBeenCalled();
          });
        });

        describe("Ready State", () => {
          it("should report ready state", () => {
            expect(testStore.isReadyForUse()).toBe(true);
          });
        });
      });
    });
  });

  describe("Cross-Implementation Consistency", () => {
    it("should produce equivalent results for identical operations", () => {
      const localStore = new LocalDatastore();
      const firestoreStore = new FirestoreStore();
      firestoreStore.connect = jest.fn(() => {
        // Initialize mock references
        firestoreStore.docRef = {
          update: jest.fn(),
          set: jest.fn(),
          onSnapshot: jest.fn()
        };
        firestoreStore.stickyRef = {
          doc: jest.fn(() => ({
            id: 'mock-sticky-id',
            set: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
          })),
          onSnapshot: jest.fn()
        };
        firestoreStore.connectorRef = {
          doc: jest.fn(() => ({
            id: 'mock-connector-id',
            set: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
          })),
          onSnapshot: jest.fn()
        };
        firestoreStore.imageRef = {
          doc: jest.fn(() => ({
            id: 'mock-image-id',
            set: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
          })),
          onSnapshot: jest.fn()
        };
        firestoreStore.readyForUse = true;
      });
      firestoreStore.isReadyForUse = jest.fn(() => true);
      
      // Connect the firestore store
      firestoreStore.connect();

      // Test sticky creation
      const stickyData = { text: "Consistency test", location: { x: 100, y: 200 }, color: "green" };
      
      const localId = localStore.createSticky(stickyData);
      const firestoreId = firestoreStore.createSticky(stickyData);
      
      // Both should return string IDs
      expect(typeof localId).toBe("string");
      expect(typeof firestoreId).toBe("string");
      
      // Both should be able to retrieve the sticky
      const localSticky = localStore.getSticky(localId);
      const firestoreSticky = firestoreStore.getSticky(firestoreId);
      
      expect(localSticky.text).toBe(firestoreSticky.text);
      expect(localSticky.location).toEqual(firestoreSticky.location);
      expect(localSticky.color).toBe(firestoreSticky.color);
    });
  });
});

// Helper functions
function getPublicMethodsFromInstance(instance) {
  // Get all properties from the instance and its prototype chain
  const allProps = [];
  let obj = instance;
  
  while (obj && obj !== Object.prototype) {
    allProps.push(...Object.getOwnPropertyNames(obj));
    obj = Object.getPrototypeOf(obj);
  }
  
  // Filter to only include functions that are public methods
  return [...new Set(allProps)]
    .filter(name => typeof instance[name] === 'function' && name !== 'constructor')
    .filter(name => !name.startsWith('_')) // Exclude private methods
    .filter(name => name !== 'getAppState'); // Exclude internal helper
}

function getPublicMethods(prototype) {
  return Object.getOwnPropertyNames(prototype)
    .filter(name => typeof prototype[name] === 'function' && name !== 'constructor')
    .filter(name => !name.startsWith('_')) // Exclude private methods
    .filter(name => name !== 'getAppState'); // Exclude internal helper
}

function getParameterCount(func) {
  if (typeof func !== 'function') return 0;
  const funcStr = func.toString();
  
  // Handle arrow functions with parentheses: (param) => { ... }
  const arrowWithParens = funcStr.match(/\(([^)]*)\)\s*=>/);
  if (arrowWithParens) {
    const params = arrowWithParens[1].trim();
    if (!params) return 0;
    return params.split(',').length;
  }
  
  // Handle arrow functions without parentheses: param => { ... }
  const arrowWithoutParens = funcStr.match(/^([^=]+)\s*=>/);
  if (arrowWithoutParens) {
    const param = arrowWithoutParens[1].trim();
    if (!param) return 0;
    return 1;
  }
  
  // Handle regular functions: function(param) { ... }
  const regularMatch = funcStr.match(/function[^(]*\(([^)]*)\)/);
  if (regularMatch) {
    const params = regularMatch[1].trim();
    if (!params) return 0;
    return params.split(',').length;
  }
  
  return 0;
}

function getSourceCode(filePath) {
  const fullPath = path.resolve(__dirname, '..', filePath);
  return fs.readFileSync(fullPath, 'utf8');
}
