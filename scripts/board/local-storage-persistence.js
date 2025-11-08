import { getAppState } from "../app-state.js";
import { getAllPlugins } from "../board-items/plugin-registry.js";
import { convertOldFormatToNewFormat } from "./data-format-converter.js";

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
      const plugins = getAllPlugins();
      const persistableState = {
        board: state.board,
        connectors: state.connectors || {},
        connectorIdGen: state.connectorIdGen || 0
      };
      
      // Add plugin-specific state dynamically
      plugins.forEach(plugin => {
        const type = plugin.getType();
        const storageKey = plugin.getSelectionType();
        const idGenKey = type === 'sticky' ? 'idGen' : `${type}IdGen`;
        persistableState[storageKey] = state[storageKey] || {};
        persistableState[idGenKey] = state[idGenKey] || 0;
      });
      
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
        title: this.boardName, // Default title to board name
        createOn: Date.now()
      };
      
      // If board doesn't have createOn, set it now (for existing boards)
      if (!metadata.createOn) {
        metadata.createOn = Date.now();
      }
      
      // Sync title from state.board.title if it exists and is non-empty
      const boardTitle = persistableState.board?.title;
      if (boardTitle && typeof boardTitle === 'string' && boardTitle.trim().length > 0) {
        metadata.title = boardTitle.trim();
      } else if (!metadata.title) {
        // If board doesn't have title, set default (for existing boards)
        metadata.title = this.boardName;
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
              // Convert old format to new format if needed
              const convertedData = convertOldFormatToNewFormat(boardData);
              const appState = getAppState();
              
              // Restore the persistable parts of the state
              if (convertedData.board !== undefined) {
                appState.board = convertedData.board;
              }
              
              // Restore connector state (not a plugin)
              if (convertedData.connectors) {
                appState.connectors = convertedData.connectors;
              }
              if (convertedData.connectorIdGen !== undefined) {
                appState.connectorIdGen = convertedData.connectorIdGen;
              }
              
              // Restore plugin-specific state dynamically
              const plugins = getAllPlugins();
              plugins.forEach(plugin => {
                const type = plugin.getType();
                const storageKey = plugin.getSelectionType();
                const idGenKey = type === 'sticky' ? 'idGen' : `${type}IdGen`;
                
                if (convertedData[storageKey]) {
                  appState[storageKey] = convertedData[storageKey];
                }
                if (convertedData[idGenKey] !== undefined) {
                  appState[idGenKey] = convertedData[idGenKey];
                }
              });
              
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
          
          // Convert old format to new format
          const convertedState = convertOldFormatToNewFormat(parsedState);
          const appState = getAppState();
          
          // Restore board
          if (convertedState.board !== undefined) {
            appState.board = convertedState.board;
          }
          
          // Restore connector state (not a plugin)
          if (convertedState.connectors) {
            appState.connectors = convertedState.connectors;
          }
          if (convertedState.connectorIdGen !== undefined) {
            appState.connectorIdGen = convertedState.connectorIdGen;
          }
          
          // Restore plugin-specific state dynamically
          const plugins = getAllPlugins();
          plugins.forEach(plugin => {
            const type = plugin.getType();
            const storageKey = plugin.getSelectionType();
            const idGenKey = type === 'sticky' ? 'idGen' : `${type}IdGen`;
            
            if (convertedState[storageKey]) {
              appState[storageKey] = convertedState[storageKey];
            }
            if (convertedState[idGenKey] !== undefined) {
              appState[idGenKey] = convertedState[idGenKey];
            }
          });
          
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

