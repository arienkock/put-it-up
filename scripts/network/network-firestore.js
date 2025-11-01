import { getAppState } from "../app-state.js";
import { firebaseConfig, initializeFirebaseApp } from "../config/firebase-config.js";

// Debug mode - controlled by global window.DEBUG_MODE
// Use a function to check DEBUG_MODE dynamically
const isDebugMode = () => window.DEBUG_MODE || false;

export class FirestoreStore {
  connectCalled = false;
  collectionName = "boards";
  boardName;
  observers = [];
  readyForUse = false;

  constructor(boardName) {
    this.boardName = boardName;
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
        // Check if board exists but lacks security fields (for migration of existing boards)
        // Only migrate if ALL security fields are missing
        if (data.creatorId === undefined && data.editors === undefined && data.viewers === undefined) {
          const auth = firebase.auth();
          const currentUser = auth.currentUser;
          if (currentUser) {
            // Update existing board with security fields
            this.docRef.update({
              creatorId: currentUser.uid,
              editors: [],
              viewers: []
            }).catch((error) => {
              if (isDebugMode()) {
                console.error('[FirestoreStore] Error updating board with security fields:', error);
              }
            });
          }
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
        // initializeBoardIfNeeded will handle the Firestore write to ensure security fields are set
        this.initializeBoardIfNeeded(defaults).catch((error) => {
          if (isDebugMode()) {
            console.error('[FirestoreStore] Error initializing board:', error);
          }
        });
      }
    }
    return clone(state.board);
  };

  initializeBoardIfNeeded = async (defaults) => {
    if (!this.docRef) return;
    
    // Check if document exists
    let docSnapshot;
    try {
      if (isDebugMode()) {
        console.log('[FirestoreStore.initializeBoardIfNeeded] Calling docRef.get() for board:', this.boardName);
        console.trace('[FirestoreStore.initializeBoardIfNeeded] Stack trace before get()');
      }
      docSnapshot = await this.docRef.get();
      if (isDebugMode()) {
        console.log('[FirestoreStore.initializeBoardIfNeeded] docRef.get() completed successfully');
      }
    } catch (error) {
      console.error('[FirestoreStore.initializeBoardIfNeeded] ERROR in docRef.get() for board:', this.boardName);
      console.error('[FirestoreStore.initializeBoardIfNeeded] Error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      console.trace('[FirestoreStore.initializeBoardIfNeeded] Stack trace at error catch');
      throw error; // Re-throw to preserve stack trace
    }
    
    if (!docSnapshot.exists) {
      // Board doesn't exist yet - initialize with security fields and createOn timestamp
      const auth = firebase.auth();
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        const boardData = {
          ...defaults,
          creatorId: currentUser.uid,
          editors: [],
          viewers: [],
          createOn: Date.now()
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
      // Document exists - check if it has security fields, if not, update them
      // (This case is also handled by the onSnapshot listener, but we keep it here for completeness)
      const existingData = docSnapshot.data();
      if (existingData && existingData.creatorId === undefined && existingData.editors === undefined && existingData.viewers === undefined) {
        // Old board without security fields - update it
        const auth = firebase.auth();
        const currentUser = auth.currentUser;
        
        if (currentUser) {
          const updateData = {
            creatorId: currentUser.uid,
            editors: [],
            viewers: []
          };
          
          // Add createOn if it doesn't exist
          if (!existingData.createOn) {
            updateData.createOn = Date.now();
          }
          
          await this.docRef.update(updateData);
        }
      } else if (existingData && !existingData.createOn) {
        // Board exists but lacks createOn timestamp - update it
        await this.docRef.update({
          createOn: Date.now()
        });
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
      this.stickyRef.doc(id).delete();
    }
    // Update local state immediately
    const state = getAppState();
    delete state.stickies[id];
    this.notifyStickyChange(id);
  };

  updateText = (id, text) => {
    if (this.stickyRef) {
      this.stickyRef.doc(id).update({ text });
    }
    // Update local state immediately
    const sticky = this.getSticky(id);
    sticky.text = text;
    this.notifyStickyChange(id);
  };

  updateColor = (id, color) => {
    if (this.stickyRef) {
      this.stickyRef.doc(id).update({ color });
    }
    // Update local state immediately
    const sticky = this.getSticky(id);
    sticky.color = color;
    this.notifyStickyChange(id);
  };

  setLocation = (id, location) => {
    if (this.stickyRef) {
      this.stickyRef.doc(id).update({ location });
    }
    // Update local state immediately
    const sticky = this.getSticky(id);
    sticky.location = location;
    this.notifyStickyChange(id);
  };

  updateSize = (id, size) => {
    if (this.stickyRef) {
      this.stickyRef.doc(id).update({ size });
    }
    // Update local state immediately
    const sticky = this.getSticky(id);
    sticky.size = size;
    this.notifyStickyChange(id);
  };

  updateBoard = (board) => {
    if (this.docRef) {
      this.docRef.update(board);
    }
    // Also update local state for immediate access
    const state = getAppState();
    state.board = state.board || {};
    Object.assign(state.board, board);
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
      this.connectorRef.doc(id).delete();
    }
    // Update local state immediately
    const state = getAppState();
    delete state.connectors[id];
    this.notifyConnectorChange(id);
  };

  deleteImage = (id) => {
    if (this.imageRef) {
      this.imageRef.doc(id).delete();
    }
    // Update local state immediately
    const state = getAppState();
    delete state.images[id];
    this.notifyImageChange(id);
  };

  updateArrowHead = (id, arrowHead) => {
    if (this.connectorRef) {
      this.connectorRef.doc(id).update({ arrowHead });
    }
    // Update local state immediately
    const connector = this.getConnector(id);
    connector.arrowHead = arrowHead;
    this.notifyConnectorChange(id);
  };

  updateConnectorColor = (id, color) => {
    if (this.connectorRef) {
      this.connectorRef.doc(id).update({ color });
    }
    // Update local state immediately
    const connector = this.getConnector(id);
    connector.color = color;
    this.notifyConnectorChange(id);
  };

  // Ensure connector has a default color if none exists
  ensureConnectorHasColor = (id) => {
    const connector = this.getConnector(id);
    if (!connector.color) {
      connector.color = "#000000"; // Default connector color (black)
      this.connectorRef.doc(id).update({ color: "#000000" });
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
      this.connectorRef.doc(id).update(updateData);
    }
    // Update local state immediately
    const connector = this.getConnector(id);
    Object.assign(connector, updateData);
    this.notifyConnectorChange(id);
  };

  updateCurveControlPoint = (id, point) => {
    if (this.connectorRef) {
      this.connectorRef.doc(id).update({ curveControlPoint: point });
    }
    // Update local state immediately
    const connector = this.getConnector(id);
    connector.curveControlPoint = point;
    this.notifyConnectorChange(id);
  };

  setImageLocation = (id, location) => {
    if (this.imageRef) {
      this.imageRef.doc(id).update({ location });
    }
    // Update local state immediately
    const image = this.getImage(id);
    image.location = location;
    this.notifyImageChange(id);
  };

  updateImageSize = (id, width, height) => {
    if (this.imageRef) {
      this.imageRef.doc(id).update({ width, height });
    }
    // Update local state immediately
    const image = this.getImage(id);
    image.width = width;
    image.height = height;
    this.notifyImageChange(id);
  };

  getState = () => {
    const { stickies, connectors, images, idGen, connectorIdGen, imageIdGen } = getAppState();
    return clone({ stickies, connectors, images, idGen, connectorIdGen, imageIdGen });
  };

  setState = (state) => {
    const appState = getAppState();
    appState.stickies = state.stickies || {};
    appState.connectors = state.connectors || {};
    appState.images = state.images || {};
    appState.idGen = state.idGen || 0;
    appState.connectorIdGen = state.connectorIdGen || 0;
    appState.imageIdGen = state.imageIdGen || 0;
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

  // Static method to search boards by name with pagination support
  static async searchBoards(searchTerm = '', userId, options = {}) {
    const { limit = 50, startAfter = null } = options;
    
    // Initialize Firebase if not already
    initializeFirebaseApp();
    const db = firebase.firestore();
    const collectionRef = db.collection('boards');
    
    // Note: Firestore doesn't support efficient queries for:
    // - Case-insensitive text search
    // - Array-contains queries across multiple fields (creatorId, editors, viewers)
    // 
    // So we fetch all boards and filter client-side by:
    // - Search term (name contains searchTerm, case-insensitive)
    // - User permissions (user is creator, in editors array, or in viewers array)
    
    // Apply search filter if searchTerm is provided
    if (searchTerm && searchTerm.trim()) {
      // Firestore doesn't support case-insensitive search directly,
      // so we'll fetch all boards and filter client-side
      // For better performance, you could use a search index or Algolia
      let snapshot;
      try {
        console.log('[FirestoreStore.searchBoards] Calling collectionRef.get() with searchTerm:', searchTerm);
        console.log('[FirestoreStore.searchBoards] userId:', userId);
        console.trace('[FirestoreStore.searchBoards] Stack trace before get() with searchTerm');
        snapshot = await collectionRef.get();
        console.log('[FirestoreStore.searchBoards] collectionRef.get() completed successfully (with searchTerm)');
      } catch (error) {
        console.error('[FirestoreStore.searchBoards] ERROR in collectionRef.get() with searchTerm:', searchTerm);
        console.error('[FirestoreStore.searchBoards] Error details:', {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: error.stack,
          userId: userId,
          searchTerm: searchTerm
        });
        console.trace('[FirestoreStore.searchBoards] Stack trace at error catch (with searchTerm)');
        throw error; // Re-throw to preserve stack trace
      }
      const boards = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const docName = doc.id.toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        
        // Check if user has access (creator, editor, or viewer)
        let hasAccess = false;
        if (!userId) {
          hasAccess = true; // No auth check needed
        } else {
          hasAccess = 
            data.creatorId === userId ||
            (data.editors && data.editors.includes(userId)) ||
            (data.viewers && data.viewers.includes(userId));
        }
        
        // Check if name matches search term and user has access
        if (hasAccess && docName.includes(searchLower)) {
          boards.push({
            name: doc.id,
            createOn: data.createOn || null,
            creatorId: data.creatorId || null,
            ...data
          });
        }
      });
      
      // Sort by createOn descending (newest first)
      boards.sort((a, b) => {
        const aTime = a.createOn || 0;
        const bTime = b.createOn || 0;
        return bTime - aTime;
      });
      
      // Apply pagination
      const startIndex = startAfter ? boards.findIndex(b => b.name === startAfter) + 1 : 0;
      const paginatedBoards = boards.slice(startIndex, startIndex + limit);
      const lastDoc = paginatedBoards.length > 0 ? paginatedBoards[paginatedBoards.length - 1] : null;
      
      return {
        boards: paginatedBoards,
        lastDoc: lastDoc ? lastDoc.name : null
      };
    } else {
      // No search term - return all boards user has access to
      let snapshot;
      try {
        console.log('[FirestoreStore.searchBoards] Calling collectionRef.get() without searchTerm');
        console.log('[FirestoreStore.searchBoards] userId:', userId);
        console.trace('[FirestoreStore.searchBoards] Stack trace before get() without searchTerm');
        snapshot = await collectionRef.get();
        console.log('[FirestoreStore.searchBoards] collectionRef.get() completed successfully (without searchTerm)');
      } catch (error) {
        console.error('[FirestoreStore.searchBoards] ERROR in collectionRef.get() without searchTerm');
        console.error('[FirestoreStore.searchBoards] Error details:', {
          name: error.name,
          message: error.message,
          code: error.code,
          stack: error.stack,
          userId: userId
        });
        console.trace('[FirestoreStore.searchBoards] Stack trace at error catch (without searchTerm)');
        throw error; // Re-throw to preserve stack trace
      }
      const boards = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Check if user has access (creator, editor, or viewer)
        let hasAccess = false;
        if (!userId) {
          hasAccess = true; // No auth check needed
        } else {
          hasAccess = 
            data.creatorId === userId ||
            (data.editors && data.editors.includes(userId)) ||
            (data.viewers && data.viewers.includes(userId));
        }
        
        if (hasAccess) {
          boards.push({
            name: doc.id,
            createOn: data.createOn || null,
            creatorId: data.creatorId || null,
            ...data
          });
        }
      });
      
      // Sort by createOn descending (newest first)
      boards.sort((a, b) => {
        const aTime = a.createOn || 0;
        const bTime = b.createOn || 0;
        return bTime - aTime;
      });
      
      // Apply pagination
      const startIndex = startAfter ? boards.findIndex(b => b.name === startAfter) + 1 : 0;
      const paginatedBoards = boards.slice(startIndex, startIndex + limit);
      const lastDoc = paginatedBoards.length > 0 ? paginatedBoards[paginatedBoards.length - 1] : null;
      
      return {
        boards: paginatedBoards,
        lastDoc: lastDoc ? lastDoc.name : null
      };
    }
  }
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
