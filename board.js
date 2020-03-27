export function Board() {
  const stickies = {};
  let idGen = 0;
  this.gridWidth = 25

  const getStickyInternal = id => {
    const sticky = stickies[id];
    if (!sticky) {
      throw new Error("No such sticky " + stickyId);
    }
    return sticky;
  };

  const removeNewlines = text => text.replace(/\n/g, "");

  const clone = data => JSON.parse(JSON.stringify(data));

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
    newLocation = this.snapLocation(newLocation || { x: 0, y: 0 });
    sticky.location = sticky.location || { x: 0, y: 0 };
    sticky.location.x = newLocation.x;
    sticky.location.y = newLocation.y;
  };

  const snapDimension = (x) => {
    const remainder = x % this.gridWidth
    x -= remainder
    if (remainder > (this.gridWidth / 2)) {
        x += this.gridWidth
    }
    return x
  }
  this.snapLocation = (location) => (
      {
          x: snapDimension(Math.floor(location.x)),
          y: snapDimension(Math.floor(location.y))
      }
  )

  this.getState = () => clone({ stickies });
}
