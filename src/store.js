export class Store {
  constructor(db) {
    this.db = db;
  }

  subscribe(path, nextCallback, errorCallback) {
    let collectionRef, documentRef;
    for (let i = 0; i < path.length; i += 2) {
      collectionRef = (documentRef || this.db).collection(path[i]);
      if (i < path.length) {
        documentRef = collectionRef.doc(path[i + 1]);
      }
    }
    const ref = documentRef || collectionRef;
    let wrappedNextCallback;
    if (documentRef) {
      wrappedNextCallback = wrapDocNext(nextCallback);
    } else {
      wrappedNextCallback = wrapCollectionNext(nextCallback);
    }
    return ref.onSnapshot(wrappedNextCallback, errorCallback);
  }

  create(path, data) {}
}

function wrapDocNext(nextCallback) {
  return nextCallback;
}
function wrapCollectionNext(nextCallback) {
  return nextCallback;
}
