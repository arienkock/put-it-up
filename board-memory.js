export class BoardMemory {
  constructor(board, log) {
    this.board = board;
    this.log = log;
    this.prevIndex = -1;
    this.saveStates = {
      "-1": board.getState()
    };
  }

  receiveEvent(event) {
    const index = this.log.receiveEvent(event);
    this.rewindTo(index);
    this.log.forEachEventFrom(index, this.processEvent);
  }

  rewindTo(index) {
    if (index <= this.prevIndex) {
      let savedState = this.saveStates[index-1];
      if (savedState) {
        this.board.setState(savedState);
      } else {
        for (let i = index - 2; i >= -1; i--) {
          savedState = this.saveStates[i];
          if (savedState) {
            this.board.setState(savedState);
            this.log.forEachEventFrom(i + 1, this.processEvent, index);
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
