export class Board {
  constructor(boardId, db) {
    this.name = "";
    this.items = {};
    this.boardId = boardId;
    this.idGen = 0;
    this.db = db;
    this.connect();
  }
  connect() {
    if (this.db) {
      const boardRef = this.db.collection(this.boardId).doc(this.boardId);
      boardRef.onSnapshot((doc) => this.handleBoardSnapshot(doc));
      boardRef
        .collection("items")
        .onSnapshot((items) => this.handleItemsSnapshot(items));
    }
  }
  getBoardId() {
    return this.boardId;
  }
  getItems() {
    return this.items;
  }
  hold(item, boundingRectangle) {
    const id = ++this.idGen;
    this.items[id] = { item, boundingRectangle };
    return id;
  }
  getItem(id) {
    return this.items[id];
  }
  moveItem(id, boundingRectangle) {
    this.items[id].boundingRectangle = boundingRectangle;
  }
  addListeners(boardListener, itemListener) {}
  handleBoardSnapshot(boardSnapshot) {
    const boardData = boardSnapshot.data();
    this.name = boardData.name;
  }
  handleItemsSnapshot(itemsSnapshot) {
    itemsSnapshot.docChanges().forEach((change) => {
      if (change.type === "added" || change.type === "modified") {
        this.items[change.doc.id] = change.doc.data();
      } else if (change.type === "removed") {
        delete this.items[change.doc.id];
      }
    });
  }
}
