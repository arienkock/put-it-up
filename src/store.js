export class Store {
  constructor(db) {
    this.db = db;
  }

  subscribe(path, nextCallback, errorCallback) {
    let wrappedNextCallback;
    const [ref, isDocumentRef] = this.resolvePath(path);
    if (isDocumentRef) {
      wrappedNextCallback = wrapDocNext(nextCallback);
    } else {
      wrappedNextCallback = wrapCollectionNext(nextCallback);
    }
    return ref.onSnapshot(wrappedNextCallback, errorCallback);
  }

  resolvePath(path) {
    let collectionRef, documentRef;
    for (let i = 0; i < path.length; i += 2) {
      collectionRef = (documentRef || this.db).collection(path[i]);
      if (i + 1 < path.length) {
        documentRef = collectionRef.doc(path[i + 1]);
      }
    }
    const ref = documentRef || collectionRef;
    return [ref, ref === documentRef];
  }

  create(path, data) {
    const [ref, isDocumentRef] = this.resolvePath(path);
    let idPromise;
    if (isDocumentRef) {
      idPromise = ref.set(data).then(() => ref.id);
    } else {
      idPromise = ref.add(data).then((docRef) => docRef.id);
    }
    return idPromise.then((id) => ({ [id]: data }));
  }
}

function wrapDocNext(nextCallback) {
  return (docSnapshot) =>
    nextCallback({ [docSnapshot.id]: docSnapshot.data() });
}
function wrapCollectionNext(nextCallback) {
  return (...args) => nextCallback(...args);
}
