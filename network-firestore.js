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
            if (change.type === "added" && !change.doc.metadata.hasPendingWrites) {
                const message = change.doc.data()
                node.handleNetworkMessage(message);
            }
        });
      })
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
    let timeElapsed = 0
    while (array.length && timeElapsed < 5) {
      const item = array.shift()
      const start = Date.now()
      task(item)
      timeElapsed += Date.now() - start
    }
    if (array.length) {
      requestAnimationFrame(doRun)
    }
  }
  requestAnimationFrame(doRun)
}