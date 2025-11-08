import { getAppState } from "../app-state.js";
import { firebaseConfig, initializeFirebaseApp } from "../config/firebase-config.js";
import { getStorageKeyForType, getAllPlugins } from "../board-items/plugin-registry.js";

// Debug mode - controlled by global window.DEBUG_MODE
// Use a function to check DEBUG_MODE dynamically
const isDebugMode = () => window.DEBUG_MODE || false;

/**
 * Manages debounced Firestore search queries to reduce the number of read calls.
 * Cancels previous searches for the same query and executes only the latest one.
 */
class FirestoreSearchDebouncer {
  constructor(debounceMs = 400) {
    this.debounceMs = debounceMs;
    this.pendingSearches = new Map(); // searchKey -> { timer, resolve, reject, searchFn, params }
  }

  /**
   * Schedule a debounced search query.
   * @param {string} searchKey - Unique key for this search (e.g., searchTerm + userId)
   * @param {Function} searchFn - The async function to execute for the search
   * @param {Array} params - Parameters to pass to searchFn
   * @returns {Promise} Promise that resolves with the search result
   */
  debounceSearch(searchKey, searchFn, params) {
    // Cancel any existing timer for this search
    if (this.pendingSearches.has(searchKey)) {
      const pending = this.pendingSearches.get(searchKey);
      clearTimeout(pending.timer);
      // Reject the previous promise since it's being superseded
      if (pending.reject) {
        pending.reject(new Error('Search superseded by newer query'));
      }
    }

    // Create a new promise for this search
    return new Promise((resolve, reject) => {
      const pending = {
        searchFn,
        params,
        resolve,
        reject,
        timer: setTimeout(() => {
          this.executeSearch(searchKey);
        }, this.debounceMs)
      };

      this.pendingSearches.set(searchKey, pending);
    });
  }

  /**
   * Execute a pending search and remove it from the queue.
   * @param {string} searchKey - The search key
   */
  async executeSearch(searchKey) {
    const pending = this.pendingSearches.get(searchKey);
    if (!pending) return;

    // Remove from pending searches before executing
    this.pendingSearches.delete(searchKey);

    // Execute the search
    if (isDebugMode()) {
      console.log(`[FirestoreSearchDebouncer] Executing debounced search for key: ${searchKey}`);
    }

    try {
      const result = await pending.searchFn(...pending.params);
      if (pending.resolve) {
        pending.resolve(result);
      }
    } catch (error) {
      if (isDebugMode()) {
        console.error(`[FirestoreSearchDebouncer] Error executing debounced search for key ${searchKey}:`, error);
      }
      if (pending.reject) {
        pending.reject(error);
      }
    }
  }

  /**
   * Cancel any pending search (e.g., when component unmounts).
   * @param {string} searchKey - The search key
   */
  cancelSearch(searchKey) {
    const pending = this.pendingSearches.get(searchKey);
    if (pending) {
      clearTimeout(pending.timer);
      if (pending.reject) {
        pending.reject(new Error('Search cancelled'));
      }
      this.pendingSearches.delete(searchKey);
    }
  }

  /**
   * Cancel all pending searches (useful for cleanup).
   */
  cancelAll() {
    const searchKeys = Array.from(this.pendingSearches.keys());
    searchKeys.forEach(searchKey => {
      this.cancelSearch(searchKey);
    });
  }

  /**
   * Flush all pending searches immediately (useful for testing).
   */
  async flushAll() {
    const searchKeys = Array.from(this.pendingSearches.keys());
    const promises = searchKeys.map(searchKey => {
      const pending = this.pendingSearches.get(searchKey);
      if (pending) {
        clearTimeout(pending.timer);
        return this.executeSearch(searchKey);
      }
    });
    await Promise.all(promises);
  }
}

/**
 * Manages debounced Firestore writes to reduce the number of write calls.
 * Batches updates to the same document within the debounce window.
 */
class FirestoreWriteDebouncer {
  constructor(debounceMs = 400) {
    this.debounceMs = debounceMs;
    this.pendingWrites = new Map(); // documentPath -> { timer, mergedData, docRef }
  }

  /**
   * Schedule a debounced update to a Firestore document.
   * @param {firebase.firestore.DocumentReference} docRef - The Firestore document reference
   * @param {Object} updateData - The data to update
   */
  debounceUpdate(docRef, updateData) {
    const docPath = docRef.path;
    
    // Cancel any existing timer for this document
    if (this.pendingWrites.has(docPath)) {
      const pending = this.pendingWrites.get(docPath);
      clearTimeout(pending.timer);
      // Merge with existing pending data (last write wins)
      pending.mergedData = { ...pending.mergedData, ...updateData };
    } else {
      // Create new pending write
      this.pendingWrites.set(docPath, {
        docRef,
        mergedData: { ...updateData }
      });
    }

    // Schedule the write
    const pending = this.pendingWrites.get(docPath);
    pending.timer = setTimeout(() => {
      this.executeWrite(docPath);
    }, this.debounceMs);
  }

  /**
   * Execute a pending write and remove it from the queue.
   * @param {string} docPath - The document path
   */
  executeWrite(docPath) {
    const pending = this.pendingWrites.get(docPath);
    if (!pending) return;

    // Remove from pending writes before executing
    this.pendingWrites.delete(docPath);

    // Execute the write
    if (isDebugMode()) {
      console.log(`[FirestoreWriteDebouncer] Executing debounced write to ${docPath}`, pending.mergedData);
    }

    // Safety check: ensure docRef exists before updating
    if (!pending.docRef) {
      if (isDebugMode()) {
        console.error(`[FirestoreWriteDebouncer] Cannot execute write to ${docPath}: docRef is undefined`);
      }
      return;
    }

    // Execute update and handle errors safely
    try {
      const updatePromise = pending.docRef.update(pending.mergedData);
      if (updatePromise && typeof updatePromise.catch === 'function') {
        updatePromise.catch((error) => {
          if (isDebugMode()) {
            console.error(`[FirestoreWriteDebouncer] Error executing debounced write to ${docPath}:`, error);
          }
        });
      }
    } catch (error) {
      if (isDebugMode()) {
        console.error(`[FirestoreWriteDebouncer] Error calling update on ${docPath}:`, error);
      }
    }
  }

  /**
   * Cancel any pending write for a document (e.g., when document is deleted).
   * @param {string} docPath - The document path
   */
  cancelWrite(docPath) {
    const pending = this.pendingWrites.get(docPath);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingWrites.delete(docPath);
    }
  }

  /**
   * Flush all pending writes immediately (useful for cleanup or testing).
   */
  flushAll() {
    const docPaths = Array.from(this.pendingWrites.keys());
    docPaths.forEach(docPath => {
      const pending = this.pendingWrites.get(docPath);
      if (pending) {
        clearTimeout(pending.timer);
        this.executeWrite(docPath);
      }
    });
  }
}

// Global search debouncer instance for static search methods
const globalSearchDebouncer = new FirestoreSearchDebouncer(400);

export class FirestoreStore {
  connectCalled = false;
  collectionName = "boards";
  boardName;
  observers = [];
  readyForUse = false;

  constructor(boardName, debounceMs = 400) {
    this.boardName = boardName;
    this.debouncer = new FirestoreWriteDebouncer(debounceMs);
    // Instance-level search debouncer (can be configured per instance)
    this.searchDebouncer = new FirestoreSearchDebouncer(debounceMs);
  }

  connect() {
    if (!this.connectCalled) {
      // Initialize Firebase
      initializeFirebaseApp();
      this.db = firebase.firestore();
      this.connectCalled = true;
    }
    if (isDebugMode()) {
      console.log("db", this.db);
    }
    this.docRef = this.db.collection(this.collectionName).doc(this.boardName);
      this.docRef.onSnapshot(async (documentSnapshot) => {
      this.readyForUse = true;
      const data = documentSnapshot.data();
      const state = getAppState();
      if (data) {
        state.board = data;
        // Check if board exists but lacks required fields (for migration of existing boards)
        const updateData = {};
        let needsUpdate = false;
        
        // Migrate security fields
        if (data.creatorId === undefined && data.editors === undefined && data.viewers === undefined) {
          const auth = firebase.auth();
          const currentUser = auth.currentUser;
          if (currentUser) {
            updateData.creatorId = currentUser.uid;
            updateData.editors = [];
            updateData.viewers = [];
            needsUpdate = true;
          }
        }
        
        // Add createOn if missing
        if (!data.createOn) {
          updateData.createOn = Date.now();
          needsUpdate = true;
        }
        
        // Add title if missing (use board name/ID as default)
        if (!data.title) {
          updateData.title = this.boardName;
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          this.docRef.update(updateData).catch((error) => {
            if (isDebugMode()) {
              console.error('[FirestoreStore] Error updating board with required fields:', error);
            }
          });
        }
      }
      this.notifyBoardChange();
    });

    this.stickyRef = this.docRef.collection("stickies");
    this.stickyRef.onSnapshot((querySnapshot) => {
      doBatched(querySnapshot.docChanges(), (change) => {
        const state = getAppState();
        if (change.type === "added" || change.type === "modified") {
          state.stickies[change.doc.id] = change.doc.data();
        } else if (change.type === "removed") {
          delete state.stickies[change.doc.id];
        }
        this.notifyStickyChange(change.doc.id);
      });
    });

    this.connectorRef = this.docRef.collection("connectors");
    this.connectorRef.onSnapshot((querySnapshot) => {
      doBatched(querySnapshot.docChanges(), (change) => {
        const state = getAppState();
        if (change.type === "added" || change.type === "modified") {
          state.connectors[change.doc.id] = change.doc.data();
        } else if (change.type === "removed") {
          delete state.connectors[change.doc.id];
        }
        this.notifyConnectorChange(change.doc.id);
      });
    });

    this.imageRef = this.docRef.collection("images");
    this.imageRef.onSnapshot((querySnapshot) => {
      doBatched(querySnapshot.docChanges(), (change) => {
        const state = getAppState();
        if (change.type === "added" || change.type === "modified") {
          state.images[change.doc.id] = change.doc.data();
        } else if (change.type === "removed") {
          delete state.images[change.doc.id];
        }
        this.notifyImageChange(change.doc.id);
      });
    });
  }

  isReadyForUse() {
    return this.readyForUse;
  }

  getBoard = (defaults) => {
    const state = getAppState();
    if (!state.board) {
      state.board = defaults;
      if (this.docRef) {
        // Asynchronously check if document exists and initialize security fields if needed
        // This is non-blocking so getBoard can return immediately
        // _initializeBoardIfNeeded will handle the Firestore write to ensure security fields are set
        this._initializeBoardIfNeeded(defaults).catch((error) => {
          if (isDebugMode()) {
            console.error('[FirestoreStore] Error initializing board:', error);
          }
        });
      }
    }
    return clone(state.board);
  };

  _initializeBoardIfNeeded = async (defaults) => {
    if (!this.docRef) return;
    
    // Check if document exists
    let docSnapshot;
    try {
      if (isDebugMode()) {
        console.log('[FirestoreStore._initializeBoardIfNeeded] Calling docRef.get() for board:', this.boardName);
        console.trace('[FirestoreStore._initializeBoardIfNeeded] Stack trace before get()');
      }
      docSnapshot = await this.docRef.get();
      if (isDebugMode()) {
        console.log('[FirestoreStore._initializeBoardIfNeeded] docRef.get() completed successfully');
      }
    } catch (error) {
      console.error('[FirestoreStore._initializeBoardIfNeeded] ERROR in docRef.get() for board:', this.boardName);
      console.error('[FirestoreStore._initializeBoardIfNeeded] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      console.trace('[FirestoreStore._initializeBoardIfNeeded] Stack trace at error catch');
      throw error; // Re-throw to preserve stack trace
    }
    
    if (!docSnapshot.exists) {
      // Board doesn't exist yet - initialize with security fields, createOn timestamp, and title
      const auth = firebase.auth();
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        const boardData = {
          ...defaults,
          creatorId: currentUser.uid,
          editors: [],
          viewers: [],
          createOn: Date.now(),
          // Set default title to board name (ID) if not provided in defaults
          title: defaults?.title || this.boardName
        };
        
        // Use set() to create the document with security fields
        // This will overwrite any partial data that might have been set by getBoard
        await this.docRef.set(boardData);
        
        // Update local state
        const state = getAppState();
        state.board = boardData;
        this.notifyBoardChange();
      } else {
        // If no user is authenticated, log warning
        // (this shouldn't happen in normal flow, but handle gracefully)
        if (isDebugMode()) {
          console.warn('[FirestoreStore] No authenticated user when creating board');
        }
      }
    } else {
      // Document exists - check if it needs migration for security fields, createOn, or title
      // (This case is also handled by the onSnapshot listener, but we keep it here for completeness)
      const existingData = docSnapshot.data();
      const updateData = {};
      let needsUpdate = false;
      
      // Migrate security fields
      if (existingData && existingData.creatorId === undefined && existingData.editors === undefined && existingData.viewers === undefined) {
        const auth = firebase.auth();
        const currentUser = auth.currentUser;
        
        if (currentUser) {
          updateData.creatorId = currentUser.uid;
          updateData.editors = [];
          updateData.viewers = [];
          needsUpdate = true;
        }
      }
      
      // Add createOn if missing
      if (!existingData.createOn) {
        updateData.createOn = Date.now();
        needsUpdate = true;
      }
      
      // Add title if missing (use board name/ID as default)
      if (!existingData.title) {
        updateData.title = this.boardName;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await this.docRef.update(updateData);
      }
    }
  };

  getSticky = (id) => {
    const sticky = getAppState().stickies[id];
    if (!sticky) {
      throw new Error("No such sticky id=" + id);
    }
    return sticky;
  };

  createSticky = (sticky) => {
    const docRef = this.stickyRef.doc();
    docRef.set(sticky, { merge: true });
    getAppState().stickies[docRef.id] = sticky;
    this.notifyStickyChange(docRef.id);
    return docRef.id;
  };

  deleteSticky = (id) => {
    if (this.stickyRef) {
      const docRef = this.stickyRef.doc(id);
      // Cancel any pending writes for this document
      this.debouncer.cancelWrite(docRef.path);
      docRef.delete();
    }
    // Update local state immediately
    const state = getAppState();
    delete state.stickies[id];
    this.notifyStickyChange(id);
  };

  updateText = (id, text) => {
    if (this.stickyRef) {
      const docRef = this.stickyRef.doc(id);
      this.debouncer.debounceUpdate(docRef, { text });
    }
    // Update local state immediately
    const sticky = this.getSticky(id);
    sticky.text = text;
    this.notifyStickyChange(id);
  };

  updateColor = (id, color) => {
    if (this.stickyRef) {
      const docRef = this.stickyRef.doc(id);
      this.debouncer.debounceUpdate(docRef, { color });
    }
    // Update local state immediately
    const sticky = this.getSticky(id);
    sticky.color = color;
    this.notifyStickyChange(id);
  };

  setLocation = (id, location) => {
    if (this.stickyRef) {
      const docRef = this.stickyRef.doc(id);
      this.debouncer.debounceUpdate(docRef, { location });
    }
    // Update local state immediately
    const sticky = this.getSticky(id);
    sticky.location = location;
    this.notifyStickyChange(id);
  };

  updateSize = (id, size) => {
    if (this.stickyRef) {
      const docRef = this.stickyRef.doc(id);
      this.debouncer.debounceUpdate(docRef, { size });
    }
    // Update local state immediately
    const sticky = this.getSticky(id);
    sticky.size = size;
    this.notifyStickyChange(id);
  };

  updateBoard = (board) => {
    if (this.docRef) {
      this.debouncer.debounceUpdate(this.docRef, board);
    }
    // Also update local state for immediate access
    const state = getAppState();
    state.board = state.board || {};
    Object.assign(state.board, board);
    this.notifyBoardChange();
  };

  updateBoardTitle = (title) => {
    const trimmedTitle = title?.trim();
    if (!trimmedTitle || trimmedTitle.length === 0) {
      if (isDebugMode()) {
        console.warn('[FirestoreStore] updateBoardTitle called with empty title, ignoring');
      }
      return;
    }
    
    if (this.docRef) {
      this.debouncer.debounceUpdate(this.docRef, { title: trimmedTitle });
    }
    // Update local state immediately
    const state = getAppState();
    state.board = state.board || {};
    state.board.title = trimmedTitle;
    this.notifyBoardChange();
  };

  getConnector = (id) => {
    const connector = getAppState().connectors[id];
    if (!connector) {
      throw new Error("No such connector id=" + id);
    }
    return connector;
  };

  getImage = (id) => {
    const image = getAppState().images[id];
    if (!image) {
      throw new Error("No such image id=" + id);
    }
    return image;
  };

  createConnector = (connector) => {
    const docRef = this.connectorRef.doc();
    docRef.set(connector, { merge: true });
    getAppState().connectors[docRef.id] = connector;
    this.notifyConnectorChange(docRef.id);
    return docRef.id;
  };

  createImage = (image) => {
    const docRef = this.imageRef.doc();
    docRef.set(image, { merge: true });
    getAppState().images[docRef.id] = image;
    this.notifyImageChange(docRef.id);
    return docRef.id;
  };

  deleteConnector = (id) => {
    if (this.connectorRef) {
      const docRef = this.connectorRef.doc(id);
      // Cancel any pending writes for this document
      this.debouncer.cancelWrite(docRef.path);
      docRef.delete();
    }
    // Update local state immediately
    const state = getAppState();
    delete state.connectors[id];
    this.notifyConnectorChange(id);
  };

  deleteImage = (id) => {
    if (this.imageRef) {
      const docRef = this.imageRef.doc(id);
      // Cancel any pending writes for this document
      this.debouncer.cancelWrite(docRef.path);
      docRef.delete();
    }
    // Update local state immediately
    const state = getAppState();
    delete state.images[id];
    this.notifyImageChange(id);
  };

  updateArrowHead = (id, arrowHead) => {
    if (this.connectorRef) {
      const docRef = this.connectorRef.doc(id);
      this.debouncer.debounceUpdate(docRef, { arrowHead });
    }
    // Update local state immediately
    const connector = this.getConnector(id);
    connector.arrowHead = arrowHead;
    this.notifyConnectorChange(id);
  };

  updateConnectorColor = (id, color) => {
    if (this.connectorRef) {
      const docRef = this.connectorRef.doc(id);
      this.debouncer.debounceUpdate(docRef, { color });
    }
    // Update local state immediately
    const connector = this.getConnector(id);
    connector.color = color;
    this.notifyConnectorChange(id);
  };

  updateConnectorZIndex = (id, zIndex) => {
    if (this.connectorRef) {
      const docRef = this.connectorRef.doc(id);
      this.debouncer.debounceUpdate(docRef, { zIndex });
    }
    // Update local state immediately
    const connector = this.getConnector(id);
    connector.zIndex = zIndex;
    this.notifyConnectorChange(id);
  };

  // Ensure connector has a default color if none exists
  ensureConnectorHasColor = (id) => {
    const connector = this.getConnector(id);
    if (!connector.color) {
      connector.color = "#000000"; // Default connector color (black)
      if (this.connectorRef) {
        const docRef = this.connectorRef.doc(id);
        this.debouncer.debounceUpdate(docRef, { color: "#000000" });
      }
    }
  };

  updateConnectorEndpoint = (id, endpoint, data) => {
    const updateData = {};
    if (endpoint === 'origin') {
      if (data.stickyId) {
        updateData.originId = data.stickyId;
        updateData.originPoint = null;
        updateData.originImageId = null;
      } else if (data.imageId) {
        updateData.originImageId = data.imageId;
        updateData.originPoint = null;
        updateData.originId = null;
      } else if (data.point) {
        updateData.originPoint = data.point;
        updateData.originId = null;
        updateData.originImageId = null;
      }
    } else if (endpoint === 'destination') {
      if (data.stickyId) {
        updateData.destinationId = data.stickyId;
        updateData.destinationPoint = null;
        updateData.destinationImageId = null;
      } else if (data.imageId) {
        updateData.destinationImageId = data.imageId;
        updateData.destinationPoint = null;
        updateData.destinationId = null;
      } else if (data.point) {
        updateData.destinationPoint = data.point;
        updateData.destinationId = null;
        updateData.destinationImageId = null;
      }
    }
    if (this.connectorRef) {
      const docRef = this.connectorRef.doc(id);
      this.debouncer.debounceUpdate(docRef, updateData);
    }
    // Update local state immediately
    const connector = this.getConnector(id);
    Object.assign(connector, updateData);
    this.notifyConnectorChange(id);
  };

  updateCurveControlPoint = (id, point) => {
    if (this.connectorRef) {
      const docRef = this.connectorRef.doc(id);
      this.debouncer.debounceUpdate(docRef, { curveControlPoint: point });
    }
    // Update local state immediately
    const connector = this.getConnector(id);
    connector.curveControlPoint = point;
    this.notifyConnectorChange(id);
  };

  setImageLocation = (id, location) => {
    if (this.imageRef) {
      const docRef = this.imageRef.doc(id);
      this.debouncer.debounceUpdate(docRef, { location });
    }
    // Update local state immediately
    const image = this.getImage(id);
    image.location = location;
    this.notifyImageChange(id);
  };

  updateImageSize = (id, width, height) => {
    if (this.imageRef) {
      const docRef = this.imageRef.doc(id);
      this.debouncer.debounceUpdate(docRef, { width, height });
    }
    // Update local state immediately
    const image = this.getImage(id);
    image.width = width;
    image.height = height;
    this.notifyImageChange(id);
  };

  getState = () => {
    const appState = getAppState();
    const plugins = getAllPlugins();
    const state = { connectors: appState.connectors || {}, connectorIdGen: appState.connectorIdGen || 0 };
    
    // Add plugin-specific state dynamically
    plugins.forEach(plugin => {
      const type = plugin.getType();
      const storageKey = plugin.getSelectionType();
      // Generate idGen key (sticky uses 'idGen', others use 'typeIdGen')
      const idGenKey = type === 'sticky' ? 'idGen' : `${type}IdGen`;
      state[storageKey] = appState[storageKey] || {};
      state[idGenKey] = appState[idGenKey] || 0;
    });
    
    // Backward compatibility: ensure 'idGen' is included (for sticky)
    if (!state.idGen && appState.idGen !== undefined) {
      state.idGen = appState.idGen;
    }
    
    return clone(state);
  };

  setState = (state) => {
    const appState = getAppState();
    const plugins = getAllPlugins();
    
    // Set connector state (not a plugin)
    appState.connectors = state.connectors || {};
    appState.connectorIdGen = state.connectorIdGen || 0;
    
    // Set plugin-specific state dynamically
    plugins.forEach(plugin => {
      const type = plugin.getType();
      const storageKey = plugin.getSelectionType();
      // Generate idGen key (sticky uses 'idGen', others use 'typeIdGen')
      const idGenKey = type === 'sticky' ? 'idGen' : `${type}IdGen`;
      appState[storageKey] = state[storageKey] || {};
      appState[idGenKey] = state[idGenKey] || 0;
    });
    
    // Backward compatibility: handle 'idGen' for sticky
    if (state.idGen !== undefined) {
      appState.idGen = state.idGen;
    }
    
    this.notifyBoardChange();
  };

  notifyStickyChange = (id) => {
    this.observers.forEach((o) => o.onStickyChange(id));
  };
  notifyConnectorChange = (id) => {
    this.observers.forEach((o) => o.onConnectorChange && o.onConnectorChange(id));
  };
  notifyImageChange = (id) => {
    this.observers.forEach((o) => o.onImageChange && o.onImageChange(id));
  };
  notifyBoardChange = () => {
    this.observers.forEach((o) => o.onBoardChange());
  };
  addObserver = (observer) => {
    this.observers.push(observer);
  };

  getAppState = () => {
    return getAppState();
  };

  // Get metadata for a specific board (instance method for parity with LocalDatastore)
  getBoardMetadata = async (boardName) => {
    if (!boardName) {
      return null;
    }
    
    try {
      // Initialize Firebase if not already
      initializeFirebaseApp();
      const db = firebase.firestore();
      const docRef = db.collection('boards').doc(boardName);
      const docSnapshot = await docRef.get();
      
      if (docSnapshot.exists) {
        const data = docSnapshot.data();
        return {
          name: boardName,
          title: data.title || boardName,
          createOn: data.createOn || null,
          creatorId: data.creatorId || null,
          ...data
        };
      }
      return null;
    } catch (error) {
      console.warn('[FirestoreStore.getBoardMetadata] Failed to get board metadata:', error);
      return null;
    }
  };

  // Instance method to search boards (for parity with LocalDatastore)
  // This is a simplified version that matches LocalDatastore signature
  searchBoards = async (query = '') => {
    try {
      // Get current user if available
      const auth = firebase.auth();
      const currentUser = auth.currentUser;
      const userId = currentUser ? currentUser.uid : null;
      
      // Create a unique key for this search
      const searchKey = `instance-${this.boardName}-${query}-${userId || 'anonymous'}`;
      
      // Debounce the search query
      const result = await this.searchDebouncer.debounceSearch(
        searchKey,
        async (searchTerm, userIdParam, options) => {
          // Skip debounce in static method since we're already debouncing here
          return await FirestoreStore.searchBoards(searchTerm, userIdParam, { ...options, skipDebounce: true });
        },
        [query, userId, { limit: 50 }]
      );
      
      // Return just the boards array to match LocalDatastore interface
      return result.boards || [];
    } catch (error) {
      // Ignore "superseded" or "cancelled" errors as they're expected during debouncing
      if (error.message !== 'Search superseded by newer query' && error.message !== 'Search cancelled') {
        console.warn('[FirestoreStore.searchBoards] Failed to search boards:', error);
      }
      return [];
    }
  };

  // Static method to search boards by name with pagination support
  static async searchBoards(searchTerm = '', userId, options = {}) {
    const { limit = 50, startAfter = null, skipDebounce = false } = options;
    
    // Create a unique key for this search based on search term and user
    // Note: We exclude pagination options (startAfter) from the key because:
    // - Initial searches always have startAfter: null, so they'll be debounced together
    // - Pagination (load more) is a separate user action and should not be debounced with initial searches
    const searchKey = `static-${searchTerm}-${userId || 'anonymous'}-${limit}`;
    
    // If debouncing is enabled and we're not skipping it, use the global debouncer
    // Only debounce initial searches (when startAfter is null), not pagination requests
    if (!skipDebounce && startAfter === null) {
      return await globalSearchDebouncer.debounceSearch(
        searchKey,
        async (term, uid, opts) => {
          return await FirestoreStore._executeSearchBoardsQuery(term, uid, opts);
        },
        [searchTerm, userId, options]
      );
    }
    
    // Skip debouncing - execute directly (for pagination or when explicitly skipped)
    return await FirestoreStore._executeSearchBoardsQuery(searchTerm, userId, options);
  }

  // Internal method that performs the actual Firestore query
  static async _executeSearchBoardsQuery(searchTerm = '', userId, options = {}) {
    const { limit = 50, startAfter = null } = options;
    
    // Initialize Firebase if not already
    initializeFirebaseApp();
    const db = firebase.firestore();
    
    // Note: Firestore limitations:
    // - Case-insensitive text search: Firestore doesn't support this natively
    //   We use range queries for prefix matching, then filter client-side for contains matching
    // - User permissions: Firestore doesn't support OR queries across creatorId, editors, viewers
    //   We use multiple queries and merge results, or filter client-side
    
    let query = db.collection('boards');
    
    // Apply where clause for search term on title field (prefix matching)
    // Note: This requires a Firestore composite index on (title, createOn)
    // Firestore will provide a link to create the index if it doesn't exist
    // The where() query does prefix matching (case-sensitive), so we also do
    // client-side filtering for contains matching (case-insensitive)
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.trim();
      const searchUpper = searchTerm.trim() + '\uf8ff';
      // Note: For this to work optimally, titles should be stored in lowercase
      // or we need to normalize them. For now, client-side filtering handles
      // case-insensitive contains matching.
      query = query.where('title', '>=', searchLower)
                   .where('title', '<=', searchUpper);
    }
    
    // Apply orderBy - sort by createOn descending (newest first)
    query = query.orderBy('createOn', 'desc');
    
    // Apply limit
    query = query.limit(limit);
    
    // Apply startAfter for pagination
    // startAfter can be:
    // - A cursor object with { snapshot, name, createOn } (from previous query result)
    // - A document snapshot directly
    // - An object with { name, createOn } for backward compatibility
    if (startAfter) {
      if (startAfter.snapshot) {
        // It's a cursor object from previous query
        query = query.startAfter(startAfter.snapshot);
      } else if (startAfter.id) {
        // It's a document snapshot directly
        query = query.startAfter(startAfter);
      } else if (startAfter.name && startAfter.createOn !== undefined) {
        // It's cursor data - get the document snapshot
        try {
          const lastDocRef = db.collection('boards').doc(startAfter.name);
          const lastDoc = await lastDocRef.get();
          if (lastDoc.exists) {
            query = query.startAfter(lastDoc);
          }
        } catch (error) {
          console.warn('[FirestoreStore.searchBoards] Error getting lastDoc for startAfter:', error);
        }
      }
    }
    
    let snapshot;
    try {
      if (isDebugMode()) {
        console.log('[FirestoreStore.searchBoards] Executing query with:', {
          searchTerm,
          userId,
          limit,
          startAfter: startAfter || 'none'
        });
      }
      snapshot = await query.get();
      if (isDebugMode()) {
        console.log('[FirestoreStore.searchBoards] Query completed, got', snapshot.size, 'documents');
      }
    } catch (error) {
      console.error('[FirestoreStore.searchBoards] ERROR in query:', error);
      console.error('[FirestoreStore.searchBoards] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack,
        userId,
        searchTerm
      });
      throw error;
    }
    
    const boards = [];
    const searchLower = searchTerm ? searchTerm.trim().toLowerCase() : '';
    const lastDocSnapshots = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const title = (data.title || doc.id).toLowerCase(); // Fallback to doc ID if no title
      
      // Check if title matches search term (client-side contains matching)
      // This is needed because Firestore range query only does prefix matching
      let matchesSearch = true;
      if (searchLower) {
        matchesSearch = title.includes(searchLower);
      }
      
      if (!matchesSearch) {
        return;
      }
      
      // Check if user has access (creator, editor, or viewer)
      let hasAccess = false;
      if (!userId) {
        hasAccess = true; // No auth check needed
      } else {
        hasAccess = 
          data.creatorId === userId ||
          (data.editors && Array.isArray(data.editors) && data.editors.includes(userId)) ||
          (data.viewers && Array.isArray(data.viewers) && data.viewers.includes(userId));
      }
      
      if (hasAccess) {
        boards.push({
          name: doc.id,
          title: data.title || doc.id, // Use title field or fallback to doc ID
          createOn: data.createOn || null,
          creatorId: data.creatorId || null,
          ...data
        });
        lastDocSnapshots.push(doc);
      }
    });
    
    // Get the last document snapshot for startAfter in next page
    const lastDocSnapshot = lastDocSnapshots.length > 0 
      ? lastDocSnapshots[lastDocSnapshots.length - 1] 
      : null;
    
    // Return cursor info for next page
    // Return the document snapshot itself, which can be passed directly to startAfter
    const cursor = lastDocSnapshot ? {
      snapshot: lastDocSnapshot,
      name: lastDocSnapshot.id,
      createOn: lastDocSnapshot.data().createOn || null
    } : null;
    
    // Check if there might be more results
    // If we got the full limit, there might be more (unless filtering removed everything)
    const hasMore = snapshot.size === limit && lastDocSnapshot !== null;
    
    return {
      boards,
      cursor, // Pass this cursor object to next query's startAfter option
      hasMore
    };
  }

  // Static method to delete a board and all its subcollections
  static async deleteBoard(boardName, userId) {
    if (!boardName) {
      throw new Error('Board name is required');
    }
    
    try {
      // Initialize Firebase if not already
      initializeFirebaseApp();
      const db = firebase.firestore();
      const boardRef = db.collection('boards').doc(boardName);
      
      // Verify the board exists and check permissions
      const boardSnapshot = await boardRef.get();
      if (!boardSnapshot.exists) {
        return false; // Board doesn't exist
      }
      
      const boardData = boardSnapshot.data();
      
      // Check permissions: only creator or editors can delete
      if (userId && boardData.creatorId && boardData.creatorId !== userId) {
        const editors = boardData.editors || [];
        if (!editors.includes(userId)) {
          throw new Error('You do not have permission to delete this board');
        }
      }
      
      // Delete all subcollections
      const subcollections = ['stickies', 'connectors', 'images'];
      const deletePromises = subcollections.map(async (subcollectionName) => {
        const subcollectionRef = boardRef.collection(subcollectionName);
        const snapshot = await subcollectionRef.get();
        
        // Delete all documents in the subcollection
        const batch = db.batch();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        
        if (snapshot.docs.length > 0) {
          await batch.commit();
        }
      });
      
      await Promise.all(deletePromises);
      
      // Delete the board document itself
      await boardRef.delete();
      
      return true;
    } catch (error) {
      console.error('[FirestoreStore.deleteBoard] Error deleting board:', error);
      throw error;
    }
  }

  // Generic board item methods
  _getStorageKeyForType(type) {
    // Use plugin registry to get storage key
    return getStorageKeyForType(type);
  }

  _getCollectionRefForType(type) {
    // Map plugin types to Firestore collection references
    // This is Firestore-specific, so we maintain a mapping here
    // TODO: This is a leak - Firestore collection refs are hardcoded
    // In the future, plugins could provide their own collection references
    const refMap = {
      'sticky': this.stickyRef,
      'image': this.imageRef
    };
    return refMap[type] || null;
  }

  createBoardItem = (type, data) => {
    const collectionRef = this._getCollectionRefForType(type);
    if (!collectionRef) {
      throw new Error(`Unknown board item type: ${type}`);
    }
    const docRef = collectionRef.doc();
    docRef.set(data, { merge: true });
    const storageKey = this._getStorageKeyForType(type);
    getAppState()[storageKey][docRef.id] = data;
    this.notifyBoardItemChange(type, docRef.id);
    return docRef.id;
  };

  getBoardItem = (type, id) => {
    const storageKey = this._getStorageKeyForType(type);
    if (!storageKey) {
      throw new Error(`Unknown board item type: ${type}`);
    }
    const item = getAppState()[storageKey][id];
    if (!item) {
      throw new Error(`No such ${type} id=${id}`);
    }
    return item;
  };

  deleteBoardItem = (type, id) => {
    const collectionRef = this._getCollectionRefForType(type);
    const storageKey = this._getStorageKeyForType(type);
    if (!collectionRef || !storageKey) {
      throw new Error(`Unknown board item type: ${type}`);
    }
    if (collectionRef) {
      const docRef = collectionRef.doc(id);
      // Cancel any pending writes for this document
      this.debouncer.cancelWrite(docRef.path);
      docRef.delete();
    }
    // Update local state immediately
    const state = getAppState();
    delete state[storageKey][id];
    this.notifyBoardItemChange(type, id);
  };

  updateBoardItem = (type, id, updates) => {
    const collectionRef = this._getCollectionRefForType(type);
    const storageKey = this._getStorageKeyForType(type);
    if (!collectionRef || !storageKey) {
      throw new Error(`Unknown board item type: ${type}`);
    }
    if (collectionRef) {
      const docRef = collectionRef.doc(id);
      this.debouncer.debounceUpdate(docRef, updates);
    }
    // Update local state immediately
    const item = this.getBoardItem(type, id);
    Object.assign(item, updates);
    this.notifyBoardItemChange(type, id);
  };

  updateBoardItemZIndex = (type, id, zIndex) => {
    this.updateBoardItem(type, id, { zIndex });
  };

  notifyBoardItemChange = (type, id) => {
    // Maintain backward compatibility with old observer methods
    this.observers.forEach((o) => {
      if (o.onBoardItemChange) {
        o.onBoardItemChange(type, id);
      }
      // Also call type-specific methods for backward compatibility
      // Generate method name dynamically (e.g., 'sticky' -> 'onStickyChange')
      const methodName = `on${type.charAt(0).toUpperCase() + type.slice(1)}Change`;
      if (o[methodName]) {
        o[methodName](id);
      }
    });
  };
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function doBatched(array, task) {
  function doRun() {
    let timeElapsed = 0;
    while (array.length && timeElapsed < 5) {
      const item = array.shift();
      const start = Date.now();
      task(item);
      timeElapsed += Date.now() - start;
    }
    if (array.length) {
      requestAnimationFrame(doRun);
    }
  }
  requestAnimationFrame(doRun);
}
