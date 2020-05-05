export class LocalDatastore {
  stickies = {};
  board = undefined;
  idGen = 0;
  observers = [];

  isReadyForUse = () => true;

  getBoard = (defaults) => {
    this.board = this.board || defaults;
    return clone(this.board);
  };

  getSticky = (id) => {
    const sticky = this.stickies[id];
    if (!sticky) {
      throw new Error("No such sticky id=" + id);
    }
    return sticky;
  };

  createSticky = (sticky) => {
    this.stickies[++this.idGen] = sticky;
    this.notifyStickyChange(this.idGen);
    return this.idGen;
  };

  deleteSticky = (id) => {
    delete this.stickies[id];
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
    Object.assign(this.board, board);
    this.notifyBoardChange();
  };

  connect() {}

  getState = () => clone({ stickies: this.stickies, idGen: this.idGen });

  setState = (state) => {
    this.stickies = state.stickies;
    this.idGen = state.idGen;
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
