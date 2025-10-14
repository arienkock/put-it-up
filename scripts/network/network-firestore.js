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
  getState = () => {
    const { stickies } = getAppState();
    return clone({ stickies });
  };

  setState = (state) => {
    const appState = getAppState();
    appState.stickies = state.stickies || {};
    appState.idGen = state.idGen;
    this.notifyBoardChange();
  };

  notifyStickyChange = (id) => {
    this.observers.forEach((o) => o.onStickyChange(id));
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
