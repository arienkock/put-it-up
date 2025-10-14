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

  getState = () => {
    const { stickies, idGen } = getAppState();
    return clone({ stickies, idGen });
  };

  setState = (state) => {
    const appState = getAppState();
    appState.stickies = state.stickies || {};
    appState.idGen = state.idGen || 0;
    this.notifyBoardChange();
  };

  notifyStickyChange = (id) => {
    this.observers.forEach((o) => o.onStickyChange(id));
  };
  notifyBoardChange = () => {
    this.observers.forEach((o) => o.onBoardChange());
  };
  addObserver = (observer) => {
    this.observers.push(observer);
  };
}

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}
