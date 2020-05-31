export class Board {
  constructor() {
    this.items = {};
    this.idGen = 0;
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
}
