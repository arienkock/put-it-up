export class NetworkedBoard {
  constructor(board, log, network, clientId) {
    this.board = board;
    this.log = log;
    this.network = network;
    this.prevIndex = -1;
    this.clientId = clientId;
    this.saveStates = {
      "-1": board.getState()
    };
  }

  // TODO: connect should return a promise
  connect() {
    this.network.connect(this);
  }

  receiveEvent(event) {
    const index = this.log.receiveEvent(event);
    this.rewindTo(index);
    this.log.forEachEventFrom(index, this.processEvent);
  }

  handleNetworkMessage(message) {
    this.receiveEvent(message);
  }

  rewindTo(index) {
    if (index <= this.prevIndex) {
      const indexesOfSaveStates = Object.keys(this.saveStates);
      const saveIndex = indexesOfSaveStates
        .reverse()
        .find(saveIndex => saveIndex < index);
      this.board.setState(this.saveStates[saveIndex]);
      this.log.forEachEventFrom(+saveIndex + 1, this.processEvent, index);
    }
    this.prevIndex = index - 1;
  }

  sendEvent(method, args) {
    const event = {
      sequence: this.log.nextSequence(),
      timestamp: Date.now(),
      clientId: this.clientId,
      method,
      args
    };
    this.log.receiveEvent(event);
    this.network.broadcast(this, event);
  }

  updateText = (...args) => {
    const result = this.board.updateText(...args);
    this.sendEvent("updateText", args);
    return result;
  };

  putSticky = (...args) => {
    const result = this.board.putSticky(...args);
    this.sendEvent("putSticky", args);
    return result;
  };

  moveSticky = (...args) => {
    const result = this.board.moveSticky(...args);
    this.sendEvent("moveSticky", args);
    return result;
  };

  getState() {
    return this.board.getState();
  }

  processEvent = event => {
    const { method, args } = event;
    try {
      this.board[method](...args);
    } catch (err) {
      console.log("Error processing event. Out of order?", err);
    }
  };

  getStickyLocation = (...args) => {
    const result = this.board.getStickyLocation(...args);
    return result;
  };

  getSticky = (...args) => {
    const result = this.board.getSticky(...args);
    return result;
  };
  // TODO: remove duplication by using a generic method to proxy board methods
  notifyStickyChange = (...args) => this.board.notifyStickyChange(...args)
  notifyBoardChange = (...args) => this.board.notifyBoardChange(...args)
  addObserver = (...args) => this.board.addObserver(...args)
}
