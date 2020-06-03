export class BoardComponent {
  constructor(board) {
    this.board = board;
  }
  render(h) {
    return h("div", { className: "board" });
  }
}

export class ItemContainerComponent {
  render(h) {
    return h("div", { className: "item-container" });
  }
}
