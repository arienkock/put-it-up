export function Board(aStore) {
  let store = aStore;
  this.gridSize = 25;

  const removeNewlines = text => text.replace(/\n/g, "");

  this.getSticky = id => clone(store.getSticky(id));

  this.putSticky = sticky => {
    sticky.text = sticky.text || "";
    sticky.text = removeNewlines(sticky.text);
    sticky.location = snapLocation(sticky.location || { x: 0, y: 0 }, this.gridSize);
    const id = store.createSticky(sticky);
    return id;
  };

  this.updateText = (id, text) => {
    text = text || "";
    text = removeNewlines(text);
    store.updateText(id, text);
    return text
  };

  this.getStickyLocation = id => {
    return clone(store.getSticky(id).location);
  };

  this.moveSticky = (id, newLocation) => {
    newLocation = snapLocation(newLocation || { x: 0, y: 0 }, this.gridSize);
    store.setLocation(id, newLocation);
  };

  this.getState = () => store.getState();

  this.setState = state => {
    store.setState(state);
  };

  this.addObserver = store.addObserver
}

export class StubDatastore {
  stickies = {};
  idGen = 0;

  getSticky = id => {
    const sticky = this.stickies[id];
    if (!sticky) {
      throw new Error("No such sticky id=" + id);
    }
    return sticky;
  };

  createSticky = sticky => {
    this.stickies[++this.idGen] = sticky;
    return this.idGen;
  };

  updateText = (id, text) => {
    this.getSticky(id).text = text;
  };

  setLocation = (id, location) => {
    this.getSticky(id).location = location;
  };

  connect() {}

  getState = () => clone({ stickies: this.stickies, idGen: this.idGen });

  setState = state => {
    this.stickies = state.stickies;
    this.idGen = state.idGen;
  };

}

function snapDimension(x, gridSize) {
  const remainder = x % gridSize;
  x -= remainder;
  if (remainder > gridSize / 2) {
    x += gridSize;
  }
  return x;
}

function snapLocation(location, gridSize) {
  return {
    x: snapDimension(Math.floor(location.x), gridSize),
    y: snapDimension(Math.floor(location.y), gridSize)
  };
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}
