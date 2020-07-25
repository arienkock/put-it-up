function Board(boardId) {
  const listeners = [];
  this.addListener = (changeListener) => {
    listeners.push(changeListener);
  };
  addBoardProperties.bind(this)(boardId);
  addContentProperties.bind(this)(listeners);
}

function addContentProperties(listeners) {
  const items = {};
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
  this.getContentBounds = () => {
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

function addBoardProperties(boardId) {
  Object.defineProperty(this, "boardId", {
    value: boardId,
    writable: false,
  });
  let name = "";
  this.getName = () => name;
  this.setName = (newName) => {
    name = newName;
  };
}

module.exports = {
  Board,
};
