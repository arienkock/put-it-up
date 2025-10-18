import { getAppState } from "../app-state.js";

export class FirestoreStore {
  connectCalled = false;
  collectionName = "board-events";
  boardName = "my-board2";
  observers = [];
  readyForUse = false;

  connect() {
    if (!this.connectCalled) {
      this.db = firebase.firestore();
      this.connectCalled = true;
    }
    this.docRef = this.db.collection(this.collectionName).doc(this.boardName);
    this.docRef.onSnapshot((documentSnapshot) => {
      this.readyForUse = true;
      const data = documentSnapshot.data();
      const state = getAppState();
      if (data) {
        state.board = data;
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
        this.docRef.set(state.board);
      }
    }
    return clone(state.board);
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
