function Board(boardId, db) {
  let name = "";
  this.items = {};
  Object.defineProperty(this, "boardId", {
    value: boardId,
    writable: false,
  });
  this.boardListeners = [];
  this.itemListeners = [];
  this.idGen = 0;
  this.db = db;
  this.connect = () => {
    if (this.db) {
      const boardRef = this.db.collection("boards").doc(this.boardId);
      boardRef.onSnapshot((doc) => this.handleBoardSnapshot(doc));
      const itemsRef = boardRef.collection("items");
      itemsRef.onSnapshot((items) => this.handleItemsSnapshot(items));
    }
  };
  itemsRef = () =>
    this.db.collection("boards").doc(this.boardId).collection("items");
  this.getName = () => name;
  this.setName = (newName) => {
    if (this.db) {
      this.db.collection("boards").doc(this.boardId).update({ name: newName });
    }
    name = newName;
  };
  this.getItems = () => {
    return this.items;
  };
  this.hold = (item, boundingRectangle) => {
    const data = { item, boundingRectangle };
    let id;
    if (this.db) {
      const docRef = itemsRef().doc();
      docRef.set(data);
      id = docRef.id;
    } else {
      id = ++this.idGen;
    }
    this.items[id] = data;
    this.itemListeners.forEach((fn) => fn(data));
    return id;
  };
  this.getItem = (id) => {
    return this.items[id];
  };
  this.removeItem = (id) => {
    if (this.db) {
      itemsRef().doc(id).delete();
    }
    delete this.items[id];
    this.itemListeners.forEach((fn) => fn(undefined));
  };
  this.moveItem = (id, boundingRectangle) => {
    if (this.db) {
      itemsRef().doc(id).update({ boundingRectangle });
    }
    this.items[id].boundingRectangle = boundingRectangle;
  };
  this.getSize = () => {
    let maxBottom = 0,
      minTop = 0,
      maxRight = 0,
      minLeft = 0;
    Object.values(this.items).forEach((item) => {
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
    this.boardListeners.push(boardListener);
    this.itemListeners.push(itemListener);
  };
  this.handleBoardSnapshot = (boardSnapshot) => {
    const boardData = boardSnapshot.data();
    name = boardData.name;
  };
  this.handleItemsSnapshot = (itemsSnapshot) => {
    itemsSnapshot.docChanges().forEach((change) => {
      if (change.type === "added" || change.type === "modified") {
        const data = change.doc.data();
        this.items[change.doc.id] = data;
        this.itemListeners.forEach((fn) => fn(data));
      } else {
        delete this.items[change.doc.id];
        this.itemListeners.forEach((fn) => fn(undefined));
      }
    });
  };
  this.connect();
}

module.exports = {
  Board,
};
