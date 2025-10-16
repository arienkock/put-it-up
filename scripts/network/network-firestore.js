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
  }

  isReadyForUse() {
    return this.readyForUse;
  }

  getBoard = (defaults) => {
    const state = getAppState();
    if (!state.board) {
      state.board = defaults;
      this.docRef.set(state.board);
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
    return docRef.id;
  };

  deleteSticky = (id) => {
    this.stickyRef.doc(id).delete();
  };

  updateText = (id, text) => {
    this.stickyRef.doc(id).update({ text });
  };

  updateColor = (id, color) => {
    this.stickyRef.doc(id).update({ color });
  };

  setLocation = (id, location) => {
    this.stickyRef.doc(id).update({ location });
  };

  updateSize = (id, size) => {
    this.stickyRef.doc(id).update({ size });
  };

  updateBoard = (board) => {
    this.docRef.update(board);
  };

  getConnector = (id) => {
    const connector = getAppState().connectors[id];
    if (!connector) {
      throw new Error("No such connector id=" + id);
    }
    return connector;
  };

  createConnector = (connector) => {
    const docRef = this.connectorRef.doc();
    docRef.set(connector, { merge: true });
    getAppState().connectors[docRef.id] = connector;
    return docRef.id;
  };

  deleteConnector = (id) => {
    this.connectorRef.doc(id).delete();
  };

  updateArrowHead = (id, arrowHead) => {
    this.connectorRef.doc(id).update({ arrowHead });
  };

  updateConnectorEndpoint = (id, endpoint, data) => {
    const updateData = {};
    if (endpoint === 'origin') {
      if (data.stickyId) {
        updateData.originId = data.stickyId;
        updateData.originPoint = null;
      } else if (data.point) {
        updateData.originPoint = data.point;
        updateData.originId = null;
      }
    } else if (endpoint === 'destination') {
      if (data.stickyId) {
        updateData.destinationId = data.stickyId;
        updateData.destinationPoint = null;
      } else if (data.point) {
        updateData.destinationPoint = data.point;
        updateData.destinationId = null;
      }
    }
    this.connectorRef.doc(id).update(updateData);
  };

  getState = () => {
    const { stickies, connectors, idGen, connectorIdGen } = getAppState();
    return clone({ stickies, connectors, idGen, connectorIdGen });
  };

  setState = (state) => {
    const appState = getAppState();
    appState.stickies = state.stickies || {};
    appState.connectors = state.connectors || {};
    appState.idGen = state.idGen || 0;
    appState.connectorIdGen = state.connectorIdGen || 0;
    this.notifyBoardChange();
  };

  notifyStickyChange = (id) => {
    this.observers.forEach((o) => o.onStickyChange(id));
  };
  notifyConnectorChange = (id) => {
    this.observers.forEach((o) => o.onConnectorChange && o.onConnectorChange(id));
  };
  notifyBoardChange = () => {
    this.observers.forEach((o) => o.onBoardChange());
  };
  addObserver = (observer) => {
    this.observers.push(observer);
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
