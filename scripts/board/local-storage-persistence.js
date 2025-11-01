import { getAppState } from "../app-state.js";

export class LocalStoragePersistence {
  constructor(boardName = 'default-board', localStorageKey = 'put-it-up-boards') {
    this.boardName = boardName;
    this.localStorageKey = localStorageKey;
  }

  // Observer pattern methods
  onStickyChange = (id) => {
    this.saveToLocalStorage();
  };

  onConnectorChange = (id) => {
    this.saveToLocalStorage();
  };

  onImageChange = (id) => {
    this.saveToLocalStorage();
  };

  onBoardChange = () => {
    this.saveToLocalStorage();
  };

  // Persistence methods
  saveToLocalStorage = () => {
    try {
      const state = getAppState();
      const persistableState = {
        board: state.board,
        stickies: state.stickies,
        connectors: state.connectors,
        images: state.images,
        idGen: state.idGen,
        connectorIdGen: state.connectorIdGen,
        imageIdGen: state.imageIdGen
      };
      
      // Load existing boards structure or create new one
      let allBoards = {};
      const existingData = localStorage.getItem(this.localStorageKey);
      if (existingData) {
        try {
          allBoards = JSON.parse(existingData);
        } catch (e) {
          // If parsing fails, start fresh
          allBoards = {};
        }
      }
      
      // Get or create metadata for this board
      const metadata = allBoards[this.boardName]?.metadata || {
        name: this.boardName,
        createOn: Date.now()
      };
      
      // If board doesn't have createOn, set it now (for existing boards)
      if (!metadata.createOn) {
        metadata.createOn = Date.now();
      }
      
      // Save board data and metadata
      allBoards[this.boardName] = {
        metadata,
        data: persistableState
      };
      
      localStorage.setItem(this.localStorageKey, JSON.stringify(allBoards));
    } catch (error) {
      console.warn('Failed to save to LocalStorage:', error);
    }
  };

  loadFromLocalStorage = () => {
    try {
      // First, check for new multi-board structure
      const boardsData = localStorage.getItem(this.localStorageKey);
      if (boardsData) {
        try {
          const allBoards = JSON.parse(boardsData);
          
          // Check if this is the new multi-board structure
          if (typeof allBoards === 'object' && !Array.isArray(allBoards) && allBoards[this.boardName]) {
            const boardData = allBoards[this.boardName].data;
            if (boardData) {
              const appState = getAppState();
              
              // Restore the persistable parts of the state
              if (boardData.board !== undefined) {
                appState.board = boardData.board;
              }
              if (boardData.stickies) {
                appState.stickies = boardData.stickies;
              }
              if (boardData.connectors) {
                appState.connectors = boardData.connectors;
              }
              if (boardData.images) {
                appState.images = boardData.images;
              }
              if (boardData.idGen !== undefined) {
                appState.idGen = boardData.idGen;
              }
              if (boardData.connectorIdGen !== undefined) {
                appState.connectorIdGen = boardData.connectorIdGen;
              }
              if (boardData.imageIdGen !== undefined) {
                appState.imageIdGen = boardData.imageIdGen;
              }
              
              return true;
            }
          }
        } catch (e) {
          // Fall through to check for old structure
        }
      }
      
      // Fallback: check for old single-board structure and migrate it
      const oldKey = 'put-it-up-app-state';
      const oldState = localStorage.getItem(oldKey);
      if (oldState) {
        try {
          const parsedState = JSON.parse(oldState);
          const appState = getAppState();
          
          // Restore from old structure
          if (parsedState.board !== undefined) {
            appState.board = parsedState.board;
          }
          if (parsedState.stickies) {
            appState.stickies = parsedState.stickies;
          }
          if (parsedState.connectors) {
            appState.connectors = parsedState.connectors;
          }
          if (parsedState.images) {
            appState.images = parsedState.images;
          }
          if (parsedState.idGen !== undefined) {
            appState.idGen = parsedState.idGen;
          }
          if (parsedState.connectorIdGen !== undefined) {
            appState.connectorIdGen = parsedState.connectorIdGen;
          }
          if (parsedState.imageIdGen !== undefined) {
            appState.imageIdGen = parsedState.imageIdGen;
          }
          
          // Migrate to new structure
          this.saveToLocalStorage();
          
          // Optionally remove old structure (or keep for backward compatibility)
          // localStorage.removeItem(oldKey);
          
          return true;
        } catch (error) {
          console.warn('Failed to migrate old LocalStorage structure:', error);
        }
      }
    } catch (error) {
      console.warn('Failed to load from LocalStorage:', error);
    }
    return false;
  };

  // Initialize app state from LocalStorage on page load
  initializeAppState = (boardName = null) => {
    // If boardName is provided, update the stored boardName
    if (boardName) {
      this.boardName = boardName;
    }
    return this.loadFromLocalStorage();
  };
}

