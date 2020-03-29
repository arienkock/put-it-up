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
        querySnapshot.docChanges().forEach(change => {
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
