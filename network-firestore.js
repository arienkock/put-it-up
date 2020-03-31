export class FirestoreNetwork {
  db = null;
  connectCalled = false;
  collectionName = "board-events";

  connect(node) {
    if (!this.connectCalled) {
      this.db = firebase.firestore();
      this.connectCalled = true;
    }
    this.db
      .collection(this.collectionName)
      .orderBy("sequence", "asc")
      .onSnapshot(querySnapshot => {
        doBatched(querySnapshot.docChanges(), change => {
          if (
            change.type === "added" &&
            !change.doc.metadata.hasPendingWrites
          ) {
            const message = change.doc.data();
            node.handleNetworkMessage(message);
          }
        });
      });
  }

  broadcast(sender, message) {
    this.db
      .collection(this.collectionName)
      .add(message)
      .then(function(docRef) {
        console.log("Document written with ID: ", docRef.id);
      })
      .catch(function(error) {
        console.error("Error adding document: ", error);
      });
  }

  wait() {}
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

export class FirestoreStore {
  stickies = {};
  connectCalled = false;
  collectionName = "board-events";
  boardName = "my-board";
  observers = [];

  connect() {
    if (!this.connectCalled) {
      this.db = firebase.firestore();
      this.connectCalled = true;
    }
    this.stickyRef = this.db
      .collection(this.collectionName)
      .doc(this.boardName)
      .collection("stickies");

    this.stickyRef.onSnapshot(querySnapshot => {
      doBatched(querySnapshot.docChanges(), change => {
        if (change.type === "added" || change.type === "modified") {
          this.stickies[change.doc.id] = change.doc.data();
        } else if (change.type === "removed") {
          delete this.stickies[change.doc.id];
        }
        this.notifyStickyChange(change.doc.id)
      });
    });
  }

  getSticky = id => {
    const sticky = this.stickies[id];
    if (!sticky) {
      throw new Error("No such sticky id=" + id);
    }
    return sticky;
  };

  createSticky = sticky => {
    console.log(sticky)
    const docRef = this.stickyRef.doc()
    docRef.set(sticky, { merge: true });
    this.stickies[docRef.id] = sticky
    return docRef.id
  };

  updateText = (id, text) => {
    this.stickyRef.doc(id).update({ text });
  };

  setLocation = (id, location) => {
    this.stickyRef.doc(id).update({ location });
  };

  getState = () => clone({ stickies: this.stickies });

  setState = state => {
    this.stickies = state.stickies;
    this.idGen = state.idGen;
    this.notifyBoardChange()
  };

  notifyStickyChange = id => {
    this.observers.forEach(o => o.onStickyChange(id));
  };
  notifyBoardChange = () => {
    this.observers.forEach(o => o.onBoardChange());
  };
  addObserver = observer => {
    this.observers.push(observer);
  };
}


function clone(data) {
  return JSON.parse(JSON.stringify(data));
}
