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

  this.getImage = (id) => store.getImage(id);

  this.getImageSafe = (id) => {
    let image;
    try {
      image = this.getImage(id);
    } catch (e) {}
    return image;
  };

  this.putConnector = (connector) => {
    const id = store.createConnector(connector);
    return id;
  };

  this.putImage = (image) => {
    // Validate image data
    if (!image.dataUrl || !image.naturalWidth || !image.naturalHeight) {
      throw new Error("Invalid image data");
    }
    
    // Set initial size capped at 75% of viewport, maintaining aspect ratio
    const maxWidth = window.innerWidth * 0.75;
    const maxHeight = window.innerHeight * 0.75;
    const aspectRatio = image.naturalWidth / image.naturalHeight;
    
    let width = image.naturalWidth;
    let height = image.naturalHeight;
    
    if (width > maxWidth) {
      width = maxWidth;
      height = width / aspectRatio;
    }
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
    
    image.width = width;
    image.height = height;
    image.location = image.location || { x: 0, y: 0 };
    
    const id = store.createImage(image);
    return id;
  };

  this.deleteConnector = (id) => {
    store.deleteConnector(id);
  };

  this.deleteImage = (id) => {
    // Delete all connectors attached to this image
    const state = store.getState();
    Object.entries(state.connectors).forEach(([connectorId, connector]) => {
      if (connector.originImageId == id || connector.destinationImageId == id) {
        store.deleteConnector(connectorId);
      }
    });
    store.deleteImage(id);
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

  this.getImageLocation = (id) => {
    return store.getImage(id).location;
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

  this.moveImage = (id, newLocation) => {
    // Images move freely without grid snapping
    const { origin, limit } = getBoardInternal();
    const image = store.getImage(id);
    const widthPx = image.width;
    const heightPx = image.height;
    
    // Still respect board boundaries
    newLocation = {
      x: Math.min(limit.x - widthPx, Math.max(origin.x, newLocation.x || 0)),
      y: Math.min(limit.y - heightPx, Math.max(origin.y, newLocation.y || 0))
    };
    store.setImageLocation(id, newLocation);
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

  this.resizeImage = (id, isGrow, side) => {
    const image = store.getImage(id);
    const aspectRatio = image.naturalWidth / image.naturalHeight;
    const sizeIncrement = 20; // pixels
    const factor = isGrow ? 1 : -1;
    const increment = sizeIncrement * factor;
    
    let newWidth = image.width;
    let newHeight = image.height;
    let location = { x: image.location.x, y: image.location.y };
    
    // Calculate new dimensions maintaining aspect ratio
    switch (side) {
      case "left":
        newWidth += increment;
        newHeight = newWidth / aspectRatio;
        location.x -= (newWidth - image.width);
        break;
      case "right":
        newWidth += increment;
        newHeight = newWidth / aspectRatio;
        break;
      case "top":
        newHeight += increment;
        newWidth = newHeight * aspectRatio;
        location.y -= (newHeight - image.height);
        break;
      case "bottom":
        newHeight += increment;
        newWidth = newHeight * aspectRatio;
        break;
      default:
        return;
    }
    
    // Enforce minimum size
    newWidth = Math.max(20, newWidth);
    newHeight = Math.max(20, newHeight);
    
    // Check board boundaries
    const { origin, limit } = getBoardInternal();
    if (location.x < origin.x) {
      location.x = origin.x;
    }
    if (location.y < origin.y) {
      location.y = origin.y;
    }
    if (location.x + newWidth > limit.x) {
      newWidth = limit.x - location.x;
      newHeight = newWidth / aspectRatio;
    }
    if (location.y + newHeight > limit.y) {
      newHeight = limit.y - location.y;
      newWidth = newHeight * aspectRatio;
    }
    
    store.updateImageSize(id, newWidth, newHeight);
    store.setImageLocation(id, location);
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
