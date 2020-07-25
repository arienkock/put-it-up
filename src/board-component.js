function boardComponent(h, rerender) {
  return {
    setup({ board }) {
      board.addListener(rerender, rerender);
    },
    render(props) {
      const { board } = props;
      return h(
        "div",
        {
          className: "board",
          styles: {
            width: "100vw",
            height: "100vh",
          },
        },
        this.renderItems(board)
      );
    },
    renderItems(board) {
      const entries = Object.entries(board.items());
      return entries.map(([id, item]) =>
        h(itemContainerComponent, { key: id, item })
      );
    },
  };
}

function itemContainerComponent(h, rerender) {
  return {
    name: "Container",
    render(props) {
      return h("div", { className: "item-container" });
    },
  };
}

module.exports = {
  boardComponent,
  itemContainerComponent,
};
