const createBoardComponent = (board) =>
  function boardComponent(h, rerender) {
    board.addListener(rerender, rerender);
    return {
      render(props) {
        return h("div", { className: "board" }, this.renderItems());
      },
      renderItems() {
        const entries = Object.entries(board.getItems());
        return entries.map(([id, item]) =>
          h(itemContainerComponent, { key: id, item })
        );
      },
    };
  };

function itemContainerComponent(h, rerender) {
  return {
    render(props) {
      return h("div", { className: "item-container" });
    },
  };
}

module.exports = {
  createBoardComponent,
  itemContainerComponent,
};
