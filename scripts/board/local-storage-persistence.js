import { getAppState } from "../app-state.js";

export class LocalStoragePersistence {
  constructor(localStorageKey = 'put-it-up-app-state') {
    this.localStorageKey = localStorageKey;
  }

  // Observer pattern methods
  onStickyChange = (id) => {
    this.saveToLocalStorage();
  };

  onConnectorChange = (id) => {
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
        idGen: state.idGen,
        connectorIdGen: state.connectorIdGen
      };
      localStorage.setItem(this.localStorageKey, JSON.stringify(persistableState));
    } catch (error) {
      console.warn('Failed to save to LocalStorage:', error);
    }
  };

  loadFromLocalStorage = () => {
    try {
      const savedState = localStorage.getItem(this.localStorageKey);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        const appState = getAppState();
        
        // Only restore the persistable parts of the state
        if (parsedState.board !== undefined) {
          appState.board = parsedState.board;
        }
        if (parsedState.stickies) {
          appState.stickies = parsedState.stickies;
        }
        if (parsedState.connectors) {
          appState.connectors = parsedState.connectors;
        }
        if (parsedState.idGen !== undefined) {
          appState.idGen = parsedState.idGen;
        }
        if (parsedState.connectorIdGen !== undefined) {
          appState.connectorIdGen = parsedState.connectorIdGen;
        }
        
        return true;
      }
    } catch (error) {
      console.warn('Failed to load from LocalStorage:', error);
    }
    return false;
  };

  // Initialize app state from LocalStorage on page load
  initializeAppState = () => {
    this.loadFromLocalStorage();
  };
}
