import { LocalStoragePersistence } from "../scripts/board/local-storage-persistence.js";
import { getAppState } from "../scripts/app-state.js";
import { LocalDatastore } from "../scripts/board/local-datastore.js";
import { Board } from "../scripts/board/board.js";
import { getPlugin } from "../scripts/board-items/plugin-registry.js";

// Mock window global for unit tests
if (typeof window === 'undefined') {
  global.window = {};
}

// Helper to clear localStorage before each test
function clearLocalStorage() {
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  } else {
    // Mock localStorage for tests
    global.localStorage = {
      data: {},
      getItem: function(key) {
        return this.data[key] || null;
      },
      setItem: function(key, value) {
        this.data[key] = value;
      },
      removeItem: function(key) {
        delete this.data[key];
      },
      clear: function() {
        this.data = {};
      }
    };
  }
}

beforeEach(() => {
  clearLocalStorage();
  // Reset window.appState before each test
  window.appState = undefined;
});

describe("LocalStorage Persistence - BDD Scenarios", () => {
  
  describe("Feature: Save Board State to LocalStorage", () => {
    describe("Scenario: Save sticky changes to LocalStorage", () => {
      it("Given a board with a sticky, When the sticky is created, Then it should be saved to LocalStorage", () => {
        // Given
        const persistence = new LocalStoragePersistence('test-board');
        const store = new LocalDatastore();
        store.addObserver(persistence);
        
        // When
        const id = store.createBoardItem('sticky', { 
          text: "Test sticky", 
          location: { x: 50, y: 50 } 
        });
        
        // Then
        const savedData = JSON.parse(localStorage.getItem('put-it-up-boards'));
        expect(savedData).toBeDefined();
        expect(savedData['test-board']).toBeDefined();
        expect(savedData['test-board'].data.stickies).toBeDefined();
        expect(savedData['test-board'].data.stickies[id]).toBeDefined();
        expect(savedData['test-board'].data.stickies[id].text).toBe("Test sticky");
      });

      it("Given a board with a sticky, When the sticky text is updated, Then the change should be saved to LocalStorage", () => {
        // Given
        const persistence = new LocalStoragePersistence('test-board');
        const store = new LocalDatastore();
        store.addObserver(persistence);
        const id = store.createBoardItem('sticky', { 
          text: "Original", 
          location: { x: 50, y: 50 } 
        });
        clearLocalStorage(); // Clear initial save
        
        // When
        store.updateBoardItem('sticky', id, { text: "Updated text" });
        
        // Then
        const savedData = JSON.parse(localStorage.getItem('put-it-up-boards'));
        expect(savedData['test-board'].data.stickies[id].text).toBe("Updated text");
      });

      it("Given a board with a sticky, When the sticky color is changed, Then the change should be saved to LocalStorage", () => {
        // Given
        const persistence = new LocalStoragePersistence('test-board');
        const store = new LocalDatastore();
        store.addObserver(persistence);
        const id = store.createBoardItem('sticky', { 
          text: "Colorful", 
          location: { x: 50, y: 50 } 
        });
        
        // When
        store.updateBoardItem('sticky', id, { color: "red" });
        
        // Then
        const savedData = JSON.parse(localStorage.getItem('put-it-up-boards'));
        expect(savedData['test-board'].data.stickies[id].color).toBe("red");
      });
    });

    describe("Scenario: Save connector changes to LocalStorage", () => {
      it("Given a board with connectors, When a connector is created, Then it should be saved to LocalStorage", () => {
        // Given
        const persistence = new LocalStoragePersistence('test-board');
        const store = new LocalDatastore();
        store.addObserver(persistence);
        
        // Create two stickies to connect
        const sticky1 = store.createBoardItem('sticky', { 
          text: "Sticky 1", 
          location: { x: 50, y: 50 } 
        });
        const sticky2 = store.createBoardItem('sticky', { 
          text: "Sticky 2", 
          location: { x: 200, y: 200 } 
        });
        
        // When
        const connectorId = store.createConnector({
          originItemId: sticky1,
          originItemType: 'sticky',
          destinationItemId: sticky2,
          destinationItemType: 'sticky',
          color: "#000000",
          arrowHead: "filled"
        });
        
        // Then
        const savedData = JSON.parse(localStorage.getItem('put-it-up-boards'));
        expect(savedData['test-board'].data.connectors).toBeDefined();
        expect(savedData['test-board'].data.connectors[connectorId]).toBeDefined();
        expect(savedData['test-board'].data.connectors[connectorId].originItemId).toBe(sticky1);
        expect(savedData['test-board'].data.connectors[connectorId].destinationItemId).toBe(sticky2);
      });
    });

    describe("Scenario: Save board metadata to LocalStorage", () => {
      it("Given a new board, When state is saved, Then metadata should include name, title, and createOn timestamp", () => {
        // Given
        const persistence = new LocalStoragePersistence('my-board');
        const store = new LocalDatastore();
        store.addObserver(persistence);
        
        // When
        store.createBoardItem('sticky', { 
          text: "Test", 
          location: { x: 50, y: 50 } 
        });
        
        // Then
        const savedData = JSON.parse(localStorage.getItem('put-it-up-boards'));
        expect(savedData['my-board'].metadata).toBeDefined();
        expect(savedData['my-board'].metadata.name).toBe('my-board');
        expect(savedData['my-board'].metadata.title).toBe('my-board');
        expect(savedData['my-board'].metadata.createOn).toBeDefined();
        expect(typeof savedData['my-board'].metadata.createOn).toBe('number');
      });

      it("Given a board with a title, When state is saved, Then metadata should preserve the board title", () => {
        // Given
        const persistence = new LocalStoragePersistence('titled-board');
        const store = new LocalDatastore();
        const appState = getAppState();
        appState.board = { title: "My Custom Title" };
        store.addObserver(persistence);
        
        // When
        store.createBoardItem('sticky', { 
          text: "Test", 
          location: { x: 50, y: 50 } 
        });
        
        // Then
        const savedData = JSON.parse(localStorage.getItem('put-it-up-boards'));
        expect(savedData['titled-board'].metadata.title).toBe("My Custom Title");
      });
    });
  });

  describe("Feature: Load Board State from LocalStorage", () => {
    describe("Scenario: Load existing board state", () => {
      it("Given a board state saved in LocalStorage, When loading the board, Then all items should be restored", () => {
        // Given
        const persistence = new LocalStoragePersistence('restore-board');
        const store1 = new LocalDatastore();
        store1.addObserver(persistence);
        
        const sticky1 = store1.createBoardItem('sticky', { 
          text: "First sticky", 
          location: { x: 50, y: 50 },
          color: "red"
        });
        const sticky2 = store1.createBoardItem('sticky', { 
          text: "Second sticky", 
          location: { x: 150, y: 150 },
          color: "blue"
        });
        
        // When
        const store2 = new LocalDatastore();
        const loaded = persistence.loadFromLocalStorage();
        
        // Then
        expect(loaded).toBe(true);
        expect(store2.getBoardItem('sticky', sticky1)).toBeDefined();
        expect(store2.getBoardItem('sticky', sticky1).text).toBe("First sticky");
        expect(store2.getBoardItem('sticky', sticky1).color).toBe("red");
        expect(store2.getBoardItem('sticky', sticky2)).toBeDefined();
        expect(store2.getBoardItem('sticky', sticky2).text).toBe("Second sticky");
        expect(store2.getBoardItem('sticky', sticky2).color).toBe("blue");
      });

      it("Given a board with connectors saved in LocalStorage, When loading the board, Then connectors should be restored", () => {
        // Given
        const persistence = new LocalStoragePersistence('connector-board');
        const store1 = new LocalDatastore();
        store1.addObserver(persistence);
        
        const sticky1 = store1.createBoardItem('sticky', { 
          text: "Sticky 1", 
          location: { x: 50, y: 50 } 
        });
        const sticky2 = store1.createBoardItem('sticky', { 
          text: "Sticky 2", 
          location: { x: 200, y: 200 } 
        });
        const connectorId = store1.createConnector({
          originItemId: sticky1,
          originItemType: 'sticky',
          destinationItemId: sticky2,
          destinationItemType: 'sticky',
          color: "#000000",
          arrowHead: "filled"
        });
        
        // When
        const store2 = new LocalDatastore();
        persistence.loadFromLocalStorage();
        
        // Then
        const appState = getAppState();
        expect(appState.connectors).toBeDefined();
        expect(appState.connectors[connectorId]).toBeDefined();
        expect(appState.connectors[connectorId].originItemId).toBe(sticky1);
        expect(appState.connectors[connectorId].destinationItemId).toBe(sticky2);
      });
    });

    describe("Scenario: Handle missing LocalStorage data", () => {
      it("Given no data in LocalStorage, When loading the board, Then it should return false and not crash", () => {
        // Given
        clearLocalStorage();
        const persistence = new LocalStoragePersistence('non-existent-board');
        
        // When
        const loaded = persistence.loadFromLocalStorage();
        
        // Then
        expect(loaded).toBe(false);
      });
    });
  });

  describe("Feature: Multi-Board Support", () => {
    describe("Scenario: Save and load multiple boards", () => {
      it("Given multiple boards with different names, When saving and loading, Then each board should maintain its own state", () => {
        // Given
        const persistence1 = new LocalStoragePersistence('board-1');
        const store1 = new LocalDatastore();
        store1.addObserver(persistence1);
        
        const persistence2 = new LocalStoragePersistence('board-2');
        const store2 = new LocalDatastore();
        store2.addObserver(persistence2);
        
        // When - Create items in both boards
        const sticky1 = store1.createBoardItem('sticky', { 
          text: "Board 1 sticky", 
          location: { x: 50, y: 50 } 
        });
        const sticky2 = store2.createBoardItem('sticky', { 
          text: "Board 2 sticky", 
          location: { x: 100, y: 100 } 
        });
        
        // Then - Both boards should be saved separately
        const savedData = JSON.parse(localStorage.getItem('put-it-up-boards'));
        expect(savedData['board-1']).toBeDefined();
        expect(savedData['board-2']).toBeDefined();
        expect(savedData['board-1'].data.stickies[sticky1].text).toBe("Board 1 sticky");
        expect(savedData['board-2'].data.stickies[sticky2].text).toBe("Board 2 sticky");
        
        // When - Load board-1
        const store3 = new LocalDatastore();
        persistence1.loadFromLocalStorage();
        
        // Then - Only board-1 data should be loaded
        expect(store3.getBoardItem('sticky', sticky1)).toBeDefined();
        expect(store3.getBoardItem('sticky', sticky1).text).toBe("Board 1 sticky");
      });
    });

    describe("Scenario: Switch between boards", () => {
      it("Given two boards saved in LocalStorage, When switching board names, Then the correct board should be loaded", () => {
        // Given
        const persistence1 = new LocalStoragePersistence('first-board');
        const store1 = new LocalDatastore();
        store1.addObserver(persistence1);
        const sticky1 = store1.createBoardItem('sticky', { 
          text: "First board", 
          location: { x: 50, y: 50 } 
        });
        
        const persistence2 = new LocalStoragePersistence('second-board');
        const store2 = new LocalDatastore();
        store2.addObserver(persistence2);
        const sticky2 = store2.createBoardItem('sticky', { 
          text: "Second board", 
          location: { x: 100, y: 100 } 
        });
        
        // When - Switch to first board
        const persistence3 = new LocalStoragePersistence('first-board');
        const store3 = new LocalDatastore();
        persistence3.initializeAppState('first-board');
        
        // Then
        const appState = getAppState();
        expect(appState.stickies[sticky1]).toBeDefined();
        expect(appState.stickies[sticky1].text).toBe("First board");
        
        // When - Switch to second board
        persistence3.initializeAppState('second-board');
        
        // Then
        expect(appState.stickies[sticky2]).toBeDefined();
        expect(appState.stickies[sticky2].text).toBe("Second board");
      });
    });
  });

  describe("Feature: Data Format Migration", () => {
    describe("Scenario: Migrate from old single-board format", () => {
      it("Given old format data in LocalStorage, When loading, Then it should be migrated to new multi-board format", () => {
        // Given - Old format with direct stickies property
        const oldFormatData = {
          stickies: {
            '1': { text: "Old sticky", location: { x: 50, y: 50 } }
          },
          idGen: 1
        };
        localStorage.setItem('put-it-up-app-state', JSON.stringify(oldFormatData));
        
        // When
        const persistence = new LocalStoragePersistence('migrated-board');
        const loaded = persistence.loadFromLocalStorage();
        
        // Then
        expect(loaded).toBe(true);
        const appState = getAppState();
        expect(appState.stickies['1']).toBeDefined();
        expect(appState.stickies['1'].text).toBe("Old sticky");
        
        // And - New format should be saved
        const newFormatData = JSON.parse(localStorage.getItem('put-it-up-boards'));
        expect(newFormatData['migrated-board']).toBeDefined();
        expect(newFormatData['migrated-board'].data.stickies['1']).toBeDefined();
      });
    });

    describe("Scenario: Handle corrupted LocalStorage data gracefully", () => {
      it("Given corrupted JSON in LocalStorage, When saving, Then it should start fresh without crashing", () => {
        // Given
        localStorage.setItem('put-it-up-boards', 'invalid json{');
        const persistence = new LocalStoragePersistence('recovery-board');
        const store = new LocalDatastore();
        store.addObserver(persistence);
        
        // When
        const id = store.createBoardItem('sticky', { 
          text: "Recovery", 
          location: { x: 50, y: 50 } 
        });
        
        // Then - Should not crash and should save successfully
        const savedData = JSON.parse(localStorage.getItem('put-it-up-boards'));
        expect(savedData['recovery-board']).toBeDefined();
        expect(savedData['recovery-board'].data.stickies[id]).toBeDefined();
      });
    });
  });

  describe("Feature: Observer Pattern Integration", () => {
    describe("Scenario: Persistence responds to datastore changes", () => {
      it("Given a persistence observer, When a sticky is created, Then it should automatically save", () => {
        // Given
        const persistence = new LocalStoragePersistence('observer-board');
        const store = new LocalDatastore();
        store.addObserver(persistence);
        clearLocalStorage(); // Clear any initial state
        
        // When
        const id = store.createBoardItem('sticky', { 
          text: "Observer test", 
          location: { x: 50, y: 50 } 
        });
        
        // Then
        const savedData = JSON.parse(localStorage.getItem('put-it-up-boards'));
        expect(savedData['observer-board'].data.stickies[id]).toBeDefined();
      });

      it("Given a persistence observer, When a sticky is updated, Then it should automatically save", () => {
        // Given
        const persistence = new LocalStoragePersistence('observer-board');
        const store = new LocalDatastore();
        store.addObserver(persistence);
        const id = store.createBoardItem('sticky', { 
          text: "Original", 
          location: { x: 50, y: 50 } 
        });
        clearLocalStorage(); // Clear initial save
        
        // When
        store.updateBoardItem('sticky', id, { text: "Updated via observer" });
        
        // Then
        const savedData = JSON.parse(localStorage.getItem('put-it-up-boards'));
        expect(savedData['observer-board'].data.stickies[id].text).toBe("Updated via observer");
      });

      it("Given a persistence observer, When a sticky is deleted, Then it should automatically save", () => {
        // Given
        const persistence = new LocalStoragePersistence('observer-board');
        const store = new LocalDatastore();
        store.addObserver(persistence);
        const id = store.createBoardItem('sticky', { 
          text: "To be deleted", 
          location: { x: 50, y: 50 } 
        });
        clearLocalStorage(); // Clear initial save
        
        // When
        store.deleteBoardItem('sticky', id);
        
        // Then
        const savedData = JSON.parse(localStorage.getItem('put-it-up-boards'));
        // The sticky should no longer be in the saved data
        expect(savedData['observer-board'].data.stickies[id]).toBeUndefined();
      });

      it("Given a persistence observer, When the board is updated, Then it should automatically save", () => {
        // Given
        const persistence = new LocalStoragePersistence('observer-board');
        const store = new LocalDatastore();
        store.getBoard({ origin: { x: 0, y: 0 }, limit: { x: 2400, y: 1350 } });
        store.addObserver(persistence);
        clearLocalStorage(); // Clear any initial state
        
        // When
        store.updateBoard({ origin: { x: 100, y: 100 }, limit: { x: 2500, y: 1450 } });
        
        // Then
        const savedData = JSON.parse(localStorage.getItem('put-it-up-boards'));
        expect(savedData['observer-board'].data.board).toBeDefined();
        expect(savedData['observer-board'].data.board.origin.x).toBe(100);
        expect(savedData['observer-board'].data.board.origin.y).toBe(100);
      });
    });
  });

  describe("Feature: ID Generator Persistence", () => {
    describe("Scenario: Preserve ID generator state", () => {
      it("Given a board with items, When saved and loaded, Then ID generator should continue from where it left off", () => {
        // Given
        const persistence = new LocalStoragePersistence('idgen-board');
        const store1 = new LocalDatastore();
        store1.addObserver(persistence);
        
        const id1 = store1.createBoardItem('sticky', { 
          text: "First", 
          location: { x: 50, y: 50 } 
        });
        const id2 = store1.createBoardItem('sticky', { 
          text: "Second", 
          location: { x: 100, y: 100 } 
        });
        
        // When - Load the saved state
        const store2 = new LocalDatastore();
        persistence.loadFromLocalStorage();
        
        // Then - ID generator should be restored
        const appState = getAppState();
        expect(appState.idGen).toBeGreaterThanOrEqual(parseInt(id2));
        
        // When - Create a new item after loading
        store2.addObserver(persistence);
        const id3 = store2.createBoardItem('sticky', { 
          text: "Third", 
          location: { x: 150, y: 150 } 
        });
        
        // Then - ID should continue from previous IDs
        expect(parseInt(id3)).toBeGreaterThan(parseInt(id2));
        
        // And - Saved state should reflect new ID generator value
        const savedData = JSON.parse(localStorage.getItem('put-it-up-boards'));
        expect(savedData['idgen-board'].data.idGen).toBeGreaterThanOrEqual(parseInt(id3));
      });
    });
  });
});

