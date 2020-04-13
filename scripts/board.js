export function Board(aStore) {
  let store = aStore;
  let gridSize = 25;

  const removeNewlines = (text) => text.replace(/\n/g, "");

  this.getSticky = (id) => store.getSticky(id);

  this.getStickySafe = (id) => {
    let sticky;
    try {
      sticky = this.getSticky(id);
    } catch (e) {}
    return sticky;
  };

  this.putSticky = (sticky) => {
    sticky.text = sticky.text || "";
    sticky.text = removeNewlines(sticky.text);
    sticky.location = snapLocation(sticky.location || { x: 0, y: 0 }, gridSize);
    const id = store.createSticky(sticky);
    return id;
  };

  this.deleteSticky = (id) => {
    store.deleteSticky(id);
  };

  this.updateText = (id, text) => {
    text = text || "";
    text = removeNewlines(text);
    store.updateText(id, text);
    return text;
  };

  this.updateColor = (id, color) => {
    store.updateColor(id, color);
  };

  this.getStickyLocation = (id) => {
    return store.getSticky(id).location;
  };

  this.moveSticky = (id, newLocation) => {
    newLocation = snapLocation(newLocation || { x: 0, y: 0 }, gridSize);
    store.setLocation(id, newLocation);
  };

  this.getState = () => store.getState();

  this.setState = (state) => {
    store.setState(state);
  };

  this.getStickyBaseSize = () => 100;
  this.getGridUnit = () => gridSize;
  this.getBoardSize = () => ({ width: 2400, height: 1350 });

  this.addObserver = store.addObserver;
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
    y: snapDimension(Math.floor(location.y), gridSize),
  };
}
