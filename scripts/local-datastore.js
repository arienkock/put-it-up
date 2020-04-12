export class LocalDatastore {
  stickies = {};
  idGen = 0;
  observers = [];

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

  setLocation = (id, location) => {
    this.getSticky(id).location = location;
    this.notifyStickyChange(id);
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
