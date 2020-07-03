function Board(boardId, idGenerator) {
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
  const generateId = idGenerator || localIdGen;
  let idGen = 0;
  function localIdGen(_data) {
    return ++idGen;
  }
  this.add = (data) => {
    const id = generateId(data);
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

function wrapWithDB(Board) {
  return function (boardId, dbArg) {
    const board = new Board(boardId, generateId);
    const db = dbArg;
    this.connect = () => {
      const boardRef = db.collection("boards").doc(this.boardId);
      boardRef.onSnapshot((snapshot) => handleBoardSnapshot(snapshot));
      const itemsRef = boardRef.collection("items");
      itemsRef.onSnapshot((snapshot) => handleItemsSnapshot(snapshot));
    };
    itemsRef = () =>
      db.collection("boards").doc(this.boardId).collection("items");
    this.setName = (newName) => {
      db.collection("boards").doc(this.boardId).update({ name: newName });
      return board.setName(newName);
    };
    function generateId(data) {
      const docRef = itemsRef().doc();
      docRef.set(data);
      return docRef.id;
    }
    this.add = (data) => {
      const id = board.add(data);
      return id;
    };
    this.remove = (id) => {
      itemsRef().doc(id).delete();
      board.remove(id);
    };
    this.move = (id, boundingRectangle) => {
      itemsRef().doc(id).update({ boundingRectangle });
      board.move(id, boundingRectangle);
    };
    function handleBoardSnapshot(boardSnapshot) {
      const boardData = boardSnapshot.data();
      board.setName(boardData.name);
    }
    function handleItemsSnapshot(itemsSnapshot) {
      itemsSnapshot.docChanges().forEach((change) => {
        if (change.type === "added" || change.type === "modified") {
          const data = change.doc.data();
          board.update(change.doc.id, data);
        } else {
          board.remove(change.doc.id);
        }
      });
    }
    passThroughtAllOtherMethods(this, board);
    this.connect();
  };
}

function passThroughtAllOtherMethods(source, destination) {
  Object.getOwnPropertyNames(destination).forEach((methodName) => {
    if (typeof destination[methodName] === "function" && !source[methodName]) {
      source[methodName] = function (...args) {
        return destination[methodName](...args);
      }.bind(destination);
    }
  });
}

module.exports = {
  Board,
  ConnectedBoard: wrapWithDB(Board),
};
