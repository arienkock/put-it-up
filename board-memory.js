export class BoardMemory {
  constructor(board, log) {
    this.board = board;
    this.log = log;
    this.prevIndex = -1;
    this.saveStates = {
      0: board.getState()
    };
  }

  receiveEvent(event) {
    const index = this.log.receiveEvent(event);
    this.rewindTo(index);
    this.log.forEachEventFrom(index, this.processEvent);
  }

  rewindTo(index) {
    if (index <= this.prevIndex) {
      let savedState = this.saveStates[index];
      if (savedState) {
        this.board.setState(savedState);
      } else {
        for (let i = index - 1; i >= 0; i++) {
          savedState = this.saveStates[index];
          if (savedState) {
            this.board.setState(savedState);
            this.log.forEachEventFrom(i, this.processEvent, index);
            break;
          }
        }
      }
    }
    this.prevIndex = index;
  }

  processEvent = event => {
    const { method, args } = event;
    this.board[method](...args);
  };
}
