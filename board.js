const snapDimension = (x, gridSize) => {
  const remainder = x % gridSize;
  x -= remainder;
  if (remainder > gridSize / 2) {
    x += gridSize;
  }
  return x;
};
const snapLocation = (location, gridSize) => ({
  x: snapDimension(Math.floor(location.x), gridSize),
  y: snapDimension(Math.floor(location.y), gridSize)
});

const clone = data => JSON.parse(JSON.stringify(data));

export function Board() {
  let stickies = {};
  let idGen = 0;
  this.gridSize = 25;

  const getStickyInternal = id => {
    const sticky = stickies[id];
    if (!sticky) {
      throw new Error("No such sticky id=" + id);
    }
    return sticky;
  };

  const removeNewlines = text => text.replace(/\n/g, "");

  this.getSticky = id => clone(getStickyInternal(id));

  this.putSticky = (sticky, location) => {
    const id = ++idGen;
    stickies[id] = sticky;
    this.updateText(id, sticky.text);
    this.moveSticky(id, location);
    return id;
  };

  this.updateText = (id, text) => {
    const sticky = getStickyInternal(id);
    sticky.text = removeNewlines(text);
    return sticky.text;
  };

  this.getStickyLocation = id => {
    return clone(getStickyInternal(id).location);
  };

  this.moveSticky = (id, newLocation) => {  
    const sticky = getStickyInternal(id);
    newLocation = snapLocation(newLocation || { x: 0, y: 0 }, this.gridSize);
    sticky.location = sticky.location || { x: 0, y: 0 };
    sticky.location.x = newLocation.x;
    sticky.location.y = newLocation.y;
  };

  this.getState = () => clone({ stickies, idGen });

  this.setState = state => {
    stickies = clone(state.stickies);
    idGen = state.idGen;
  };
}
