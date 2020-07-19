function Board(boardId) {
  let name = "";
  const items = {};
  Object.defineProperty(this, "boardId", {
    value: boardId,
    writable: false,
  });
  const listeners = [];
  this.addListener = (changeListener) => {
    listeners.push(changeListener);
  };
  this.getName = () => name;
  this.setName = (newName) => {
    name = newName;
  };
  this.items = () => {
    return items;
  };
  this.generateId = localIdGen;
  let idGen = 0;
  function localIdGen(_data) {
    return ++idGen;
  }
  this.add = (data) => {
    const id = this.generateId(data);
    items[id] = data;
    listeners.forEach((fn) => fn(data));
    return id;
  };
  this.update = (id, data) => {
    items[id] = data;
    listeners.forEach((fn) => fn());
  };
  this.get = (id) => {
    return items[id];
  };
  this.remove = (id) => {
    delete items[id];
    listeners.forEach((fn) => fn());
  };
  this.move = (id, boundingRectangle) => {
    items[id].boundingRectangle = boundingRectangle;
  };
  this.getSize = () => {
    let maxBottom = 0,
      minTop = 0,
      maxRight = 0,
      minLeft = 0;
    Object.values(items).forEach((item) => {
      maxBottom = Math.max(maxBottom, item.boundingRectangle.bottom);
      maxRight = Math.max(maxRight, item.boundingRectangle.right);
      minTop = Math.min(minTop, item.boundingRectangle.top);
      minLeft = Math.min(minLeft, item.boundingRectangle.left);
    });
    return {
      left: minLeft,
      top: minTop,
      right: maxRight,
      bottom: maxBottom,
    };
  };
}

function connectToFirebase(board, db) {
  board.generateId = generateId;
  // Starts listening for changes to the board and the items sub-collection
  function connect() {
    const boardRef = db.collection("boards").doc(board.boardId);
    boardRef.onSnapshot((snapshot) => handleBoardSnapshot(snapshot));
    const itemsRef = boardRef.collection("items");
    itemsRef.onSnapshot((snapshot) => handleItemsSnapshot(snapshot));
  }
  function generateId(data) {
    const docRef = itemsRef().doc();
    docRef.set(data);
    return docRef.id;
  }
  const itemsRef = () =>
    db.collection("boards").doc(board.boardId).collection("items");
  const delegateSetName = board.setName.bind(board);
  board.setName = (newName) => {
    db.collection("boards").doc(board.boardId).update({ name: newName });
    return delegateSetName(newName);
  };
  const delegateRemove = board.remove.bind(board);
  board.remove = (id) => {
    itemsRef().doc(id).delete();
    return delegateRemove(id);
  };
  const delegateMove = board.move.bind(board);
  board.move = (id, boundingRectangle) => {
    itemsRef().doc(id).update({ boundingRectangle });
    return delegateMove(id, boundingRectangle);
  };
  // Callback passed to doc.onSnapshot() in connect()
  function handleBoardSnapshot(boardSnapshot) {
    const boardData = boardSnapshot.data();
    delegateSetName(boardData.name);
  }
  // Callback passed to the items collection.onSnapshot() in connect()
  function handleItemsSnapshot(itemsSnapshot) {
    itemsSnapshot.docChanges().forEach((change) => {
      if (change.type === "added" || change.type === "modified") {
        const data = change.doc.data();
        board.update(change.doc.id, data);
      } else {
        delegateRemove(change.doc.id);
      }
    });
  }
  connect();
}

module.exports = {
  Board,
  connectToFirebase,
};
