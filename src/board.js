export class Board {
  constructor(boardId, db) {
    this.name = "";
    this.items = {};
    this.boardId = boardId;
    this.boardListeners = [];
    this.itemListeners = [];
    this.idGen = 0;
    this.db = db;
    this.connect();
  }
  connect() {
    if (this.db) {
      const boardRef = this.db.collection("boards").doc(this.boardId);
      boardRef.onSnapshot((doc) => this.handleBoardSnapshot(doc));
      const itemsRef = boardRef.collection("items");
      itemsRef.onSnapshot((items) => this.handleItemsSnapshot(items));
    }
  }
  getBoardId() {
    return this.boardId;
  }
  getItems() {
    return this.items;
  }
  hold(item, boundingRectangle) {
    const data = { item, boundingRectangle };
    let id;
    if (this.db) {
      const docRef = this.db
        .collection("boards")
        .doc(this.boardId)
        .collection("items")
        .doc();
      docRef.set(data);
      id = docRef.id;
    } else {
      id = ++this.idGen;
    }
    this.items[id] = data;
    this.itemListeners.forEach((fn) => fn(data));
    return id;
  }
  getItem(id) {
    return this.items[id];
  }
  removeItem(id) {
    if (this.db) {
      this.db
        .collection("boards")
        .doc(this.boardId)
        .collection("items")
        .doc(id)
        .delete();
    }
    delete this.items[id];
    this.itemListeners.forEach((fn) => fn(undefined));
  }
  moveItem(id, boundingRectangle) {
    this.items[id].boundingRectangle = boundingRectangle;
  }
  getSize() {
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
      bottom: maxBottom
    };
  }
  addListener(boardListener, itemListener) {
    this.boardListeners.push(boardListener);
    this.itemListeners.push(itemListener);
  }
  handleBoardSnapshot(boardSnapshot) {
    const boardData = boardSnapshot.data();
    this.name = boardData.name;
  }
  handleItemsSnapshot(itemsSnapshot) {
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
  }
}
