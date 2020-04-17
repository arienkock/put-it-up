const DEFAULT_BOARD = {
  origin: { x: 0, y: 0 },
  limit: { x: 2400, y: 1350 },
};

export function Board(aStore) {
  let store = aStore;
  let gridSize = 25;
  const sizeIncrements = { x: 1200, y: 1350 };

  const removeNewlines = (text) => text.replace(/\n/g, "");

  const getBoardInternal = () => {
    let { origin, limit } = store.getBoard(DEFAULT_BOARD);
    return { origin, limit };
  };

  this.isReadyForUse = () => store.isReadyForUse();

  this.getSticky = (id) => store.getSticky(id);

  this.getStickySafe = (id) => {
    let sticky;
    try {
      sticky = this.getSticky(id);
    } catch (e) {}
    return sticky;
  };

  this.putSticky = (sticky) => {
    const { origin, limit } = getBoardInternal();
    sticky.text = sticky.text || "";
    sticky.text = removeNewlines(sticky.text);
    sticky.location = snapLocation(
      sticky.location || { x: 0, y: 0 },
      gridSize,
      origin,
      limit
    );
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

  this.moreSpace = (direction) => {
    const { origin, limit } = getBoardInternal();
    switch (direction) {
      case "left":
        origin.x -= sizeIncrements.x;
        store.updateBoard({
          origin,
          limit,
        });
      default:
        break;
    }
  };

  this.updateColor = (id, color) => {
    store.updateColor(id, color);
  };

  this.getStickyLocation = (id) => {
    return store.getSticky(id).location;
  };

  this.moveSticky = (id, newLocation) => {
    const { origin, limit } = getBoardInternal();
    newLocation = snapLocation(
      newLocation || { x: 0, y: 0 },
      gridSize,
      origin,
      limit
    );
    store.setLocation(id, newLocation);
  };

  this.getState = () => store.getState();

  this.setState = (state) => {
    store.setState(state);
  };

  this.getStickyBaseSize = () => 100;
  this.getGridUnit = () => gridSize;
  this.getBoardSize = () => {
    const { origin, limit } = getBoardInternal();
    return {
      width: limit.x - origin.x,
      height: limit.y - origin.y,
    };
  };

  this.getOrigin = () => {
    const { origin } = getBoardInternal();
    return { x: origin.x, y: origin.y };
  };

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

function snapLocation(location, gridSize, origin, limit) {
  return {
    x: Math.min(
      limit.x - 100,
      Math.max(origin.x, snapDimension(Math.floor(location.x), gridSize))
    ),
    y: Math.min(
      limit.y - 100,
      Math.max(origin.y, snapDimension(Math.floor(location.y), gridSize))
    ),
  };
}
