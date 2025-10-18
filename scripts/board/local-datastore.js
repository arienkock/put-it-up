import { getAppState } from "../app-state.js";

export class LocalDatastore {
  observers = [];

  isReadyForUse = () => true;

  getBoard = (defaults) => {
    const state = getAppState();
    state.board = state.board || defaults;
    return clone(state.board);
  };

  getSticky = (id) => {
    const sticky = getAppState().stickies[id];
    if (!sticky) {
      throw new Error("No such sticky id=" + id);
    }
    return sticky;
  };

  createSticky = (sticky) => {
    const state = getAppState();
    const id = ++state.idGen;
    state.stickies[id] = sticky;
    this.notifyStickyChange(id);
    return id;
  };

  deleteSticky = (id) => {
    const state = getAppState();
    delete state.stickies[id];
    this.notifyStickyChange(id);
  };

  updateText = (id, text) => {
    this.getSticky(id).text = text;
    this.notifyStickyChange(id);
  };

  updateColor = (id, color) => {
    this.getSticky(id).color = color;
    this.notifyStickyChange(id);
  };

  updateSize = (id, size) => {
    const sticky = this.getSticky(id);
    sticky.size = size;
    this.notifyStickyChange(id);
  };

  setLocation = (id, location) => {
    this.getSticky(id).location = location;
    this.notifyStickyChange(id);
  };

  updateBoard = (board) => {
    const state = getAppState();
    state.board = state.board || {};
    Object.assign(state.board, board);
    this.notifyBoardChange();
  };

  connect() {}

  getConnector = (id) => {
    const connector = getAppState().connectors[id];
    if (!connector) {
      throw new Error("No such connector id=" + id);
    }
    return connector;
  };

  getImage = (id) => {
    const image = getAppState().images[id];
    if (!image) {
      throw new Error("No such image id=" + id);
    }
    return image;
  };

  createConnector = (connector) => {
    const state = getAppState();
    const id = ++state.connectorIdGen;
    state.connectors[id] = connector;
    this.notifyConnectorChange(id);
    return id;
  };

  createImage = (image) => {
    const state = getAppState();
    const id = ++state.imageIdGen;
    state.images[id] = image;
    this.notifyImageChange(id);
    return id;
  };

  deleteConnector = (id) => {
    const state = getAppState();
    delete state.connectors[id];
    this.notifyConnectorChange(id);
  };

  deleteImage = (id) => {
    const state = getAppState();
    delete state.images[id];
    this.notifyImageChange(id);
  };

  updateArrowHead = (id, arrowHead) => {
    this.getConnector(id).arrowHead = arrowHead;
    this.notifyConnectorChange(id);
  };

  updateConnectorColor = (id, color) => {
    this.getConnector(id).color = color;
    this.notifyConnectorChange(id);
  };

  // Ensure connector has a default color if none exists
  ensureConnectorHasColor = (id) => {
    const connector = this.getConnector(id);
    if (!connector.color) {
      connector.color = "#000000"; // Default connector color (black)
    }
  };

  updateConnectorEndpoint = (id, endpoint, data) => {
    const connector = this.getConnector(id);
    
    if (endpoint === 'origin') {
      if (data.stickyId) {
        connector.originId = data.stickyId;
        delete connector.originPoint;
      } else if (data.imageId) {
        connector.originImageId = data.imageId;
        delete connector.originPoint;
      } else if (data.point) {
        connector.originPoint = data.point;
        delete connector.originId;
        delete connector.originImageId;
      }
    } else if (endpoint === 'destination') {
      if (data.stickyId) {
        connector.destinationId = data.stickyId;
        delete connector.destinationPoint;
      } else if (data.imageId) {
        connector.destinationImageId = data.imageId;
        delete connector.destinationPoint;
      } else if (data.point) {
        connector.destinationPoint = data.point;
        delete connector.destinationId;
        delete connector.destinationImageId;
      }
    }
    
    this.notifyConnectorChange(id);
  };

  setImageLocation = (id, location) => {
    this.getImage(id).location = location;
    this.notifyImageChange(id);
  };

  updateImageSize = (id, width, height) => {
    const image = this.getImage(id);
    image.width = width;
    image.height = height;
    this.notifyImageChange(id);
  };

  getState = () => {
    const { stickies, connectors, images, idGen, connectorIdGen, imageIdGen } = getAppState();
    return clone({ stickies, connectors, images, idGen, connectorIdGen, imageIdGen });
  };

  setState = (state) => {
    const appState = getAppState();
    appState.stickies = state.stickies || {};
    appState.connectors = state.connectors || {};
    appState.images = state.images || {};
    appState.idGen = state.idGen || 0;
    appState.connectorIdGen = state.connectorIdGen || 0;
    appState.imageIdGen = state.imageIdGen || 0;
    this.notifyBoardChange();
  };

  notifyStickyChange = (id) => {
    this.observers.forEach((o) => o.onStickyChange(id));
  };
  notifyConnectorChange = (id) => {
    this.observers.forEach((o) => o.onConnectorChange && o.onConnectorChange(id));
  };
  notifyImageChange = (id) => {
    this.observers.forEach((o) => o.onImageChange && o.onImageChange(id));
  };
  notifyBoardChange = () => {
    this.observers.forEach((o) => o.onBoardChange());
  };
  addObserver = (observer) => {
    this.observers.push(observer);
  };

  getAppState = () => {
    return getAppState();
  };
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}
