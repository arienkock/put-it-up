function Board(boardId, dbArg) {
  let name = "";
  const items = {};
  Object.defineProperty(this, "boardId", {
    value: boardId,
    writable: false,
  });
  const boardListeners = [];
  const itemListeners = [];
  let idGen = 0;
  const db = dbArg;
  this.connect = () => {
    if (db) {
      const boardRef = db.collection("boards").doc(this.boardId);
      boardRef.onSnapshot((snapshot) => handleBoardSnapshot(snapshot));
      const itemsRef = boardRef.collection("items");
      itemsRef.onSnapshot((snapshot) => handleItemsSnapshot(snapshot));
    }
  };
  itemsRef = () =>
    db.collection("boards").doc(this.boardId).collection("items");
  this.getName = () => name;
  this.setName = (newName) => {
    if (db) {
      db.collection("boards").doc(this.boardId).update({ name: newName });
    }
    name = newName;
  };
  this.getItems = () => {
    return items;
  };
  this.hold = (item, boundingRectangle) => {
    const data = { item, boundingRectangle };
    let id;
    if (db) {
      const docRef = itemsRef().doc();
      docRef.set(data);
      id = docRef.id;
    } else {
      id = ++idGen;
    }
    items[id] = data;
    itemListeners.forEach((fn) => fn(data));
    return id;
  };
  this.getItem = (id) => {
    return items[id];
  };
  this.removeItem = (id) => {
    if (db) {
      itemsRef().doc(id).delete();
    }
    delete items[id];
    itemListeners.forEach((fn) => fn(undefined));
  };
  this.moveItem = (id, boundingRectangle) => {
    if (db) {
      itemsRef().doc(id).update({ boundingRectangle });
    }
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
  this.addListener = (boardListener, itemListener) => {
    boardListeners.push(boardListener);
    itemListeners.push(itemListener);
  };
  function handleBoardSnapshot(boardSnapshot) {
    const boardData = boardSnapshot.data();
    name = boardData.name;
  }
  function handleItemsSnapshot(itemsSnapshot) {
    itemsSnapshot.docChanges().forEach((change) => {
      if (change.type === "added" || change.type === "modified") {
        const data = change.doc.data();
        items[change.doc.id] = data;
        itemListeners.forEach((fn) => fn(data));
      } else {
        delete items[change.doc.id];
        itemListeners.forEach((fn) => fn(undefined));
      }
    });
  }
  this.connect();
}

module.exports = {
  Board,
};
