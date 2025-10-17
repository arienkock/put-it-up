const DEFAULT_BOARD = {
  origin: { x: 0, y: 0 },
  limit: { x: 12000, y: 6750 },
};

export function Board(aStore) {
  let store = aStore;
  let gridSize = 25;

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

  this.getConnector = (id) => store.getConnector(id);

  this.getConnectorSafe = (id) => {
    let connector;
    try {
      connector = this.getConnector(id);
    } catch (e) {}
    return connector;
  };

  this.putConnector = (connector) => {
    const id = store.createConnector(connector);
    return id;
  };

  this.deleteConnector = (id) => {
    store.deleteConnector(id);
  };

  this.updateArrowHead = (id, arrowHead) => {
    store.updateArrowHead(id, arrowHead);
  };

  this.updateConnectorColor = (id, color) => {
    store.updateConnectorColor(id, color);
  };

  this.ensureConnectorHasColor = (id) => {
    store.ensureConnectorHasColor(id);
  };

  this.updateConnectorEndpoint = (id, endpoint, data) => {
    store.updateConnectorEndpoint(id, endpoint, data);
  };

  this.putSticky = (sticky) => {
    const { origin, limit } = getBoardInternal();
    sticky.text = sticky.text || "";
    sticky.text = removeNewlines(sticky.text);
    const sizeUnits = (sticky.size && { x: sticky.size.x || 1, y: sticky.size.y || 1 }) || { x: 1, y: 1 };
    const sizeIncrements = { x: 100, y: 100 };
    const widthPx = sizeIncrements.x * sizeUnits.x;
    const heightPx = sizeIncrements.y * sizeUnits.y;
    sticky.location = snapLocationWithSize(
      sticky.location || { x: 0, y: 0 },
      gridSize,
      origin,
      limit,
      widthPx,
      heightPx
    );
    const id = store.createSticky(sticky);
    return id;
  };

  this.deleteSticky = (id) => {
    // Delete all connectors attached to this sticky
    const state = store.getState();
    Object.entries(state.connectors).forEach(([connectorId, connector]) => {
      if (connector.originId == id || connector.destinationId == id) {
        store.deleteConnector(connectorId);
      }
    });
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
    const { origin, limit } = getBoardInternal();
    const sticky = store.getSticky(id);
    const sizeUnits = (sticky.size && { x: sticky.size.x || 1, y: sticky.size.y || 1 }) || { x: 1, y: 1 };
    const sizeIncrements = { x: 100, y: 100 };
    const widthPx = sizeIncrements.x * sizeUnits.x;
    const heightPx = sizeIncrements.y * sizeUnits.y;
    newLocation = snapLocationWithSize(
      newLocation || { x: 0, y: 0 },
      gridSize,
      origin,
      limit,
      widthPx,
      heightPx
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

  this.moveInBounds = ({ origin, limit }) => {
    const state = store.getState();
    Object.entries(state.stickies).forEach(([id, sticky]) => {
      const oldLocation = sticky.location;
      const sizeUnits = (sticky.size && { x: sticky.size.x || 1, y: sticky.size.y || 1 }) || { x: 1, y: 1 };
      const widthPx = sizeIncrements.x * sizeUnits.x;
      const heightPx = sizeIncrements.y * sizeUnits.y;
      const newLocation = snapLocationWithSize(oldLocation, gridSize, origin, limit, widthPx, heightPx);
      let outOfBounds =
        oldLocation.x != newLocation.x || oldLocation.y != newLocation.y;
      if (outOfBounds) {
        store.setLocation(id, newLocation);
      }
    });
  };

  this.changeStickySize = (id, isGrow, side) => {
    const sticky = store.getSticky(id);
    const sizeUnits = (sticky.size && { x: sticky.size.x || 1, y: sticky.size.y || 1 }) || { x: 1, y: 1 };
    const location = { x: sticky.location.x, y: sticky.location.y };
    const factor = isGrow ? 1 : -1;
    const sizeIncrements = { x: 100, y: 100 };
    let changed = false;
    switch (side) {
      case "left":
        if (isGrow || (!isGrow && sizeUnits.x > 1)) {
          sizeUnits.x += factor;
          location.x -= sizeIncrements.x * (isGrow ? 1 : -1);
          changed = true;
        }
        break;
      case "right":
        if (isGrow || (!isGrow && sizeUnits.x > 1)) {
          sizeUnits.x += factor;
          changed = true;
        }
        break;
      case "top":
        if (isGrow || (!isGrow && sizeUnits.y > 1)) {
          sizeUnits.y += factor;
          location.y -= sizeIncrements.y * (isGrow ? 1 : -1);
          changed = true;
        }
        break;
      case "bottom":
        if (isGrow || (!isGrow && sizeUnits.y > 1)) {
          sizeUnits.y += factor;
          changed = true;
        }
        break;
      default:
        break;
    }
    // Enforce minimum of 1x1
    sizeUnits.x = Math.max(1, sizeUnits.x);
    sizeUnits.y = Math.max(1, sizeUnits.y);
    if (!changed) return;
    const { origin, limit } = getBoardInternal();
    const widthPx = sizeIncrements.x * sizeUnits.x;
    const heightPx = sizeIncrements.y * sizeUnits.y;
    const snappedLocation = snapLocationWithSize(location, gridSize, origin, limit, widthPx, heightPx);
    store.updateSize(id, { x: sizeUnits.x, y: sizeUnits.y });
    store.setLocation(id, snappedLocation);
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

function snapLocationWithSize(location, gridSize, origin, limit, widthPx, heightPx) {
  return {
    x: Math.min(
      limit.x - widthPx,
      Math.max(origin.x, snapDimension(Math.floor(location.x), gridSize))
    ),
    y: Math.min(
      limit.y - heightPx,
      Math.max(origin.y, snapDimension(Math.floor(location.y), gridSize))
    ),
  };
}
