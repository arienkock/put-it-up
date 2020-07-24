const createBoardComponent = (board) =>
  // TODO: Pass single argument "ui". include a "wrap" function to wrap compontents once and only once.
  function boardComponent(h, rerender) {
    board.addListener(rerender, rerender);
    return {
      render(props) {
        return h(
          "div",
          {
            className: "board",
            styles: {
              width: "100vw",
              height: "100vh",
            },
          },
          this.renderItems()
        );
      },
      renderItems() {
        const entries = Object.entries(board.items());
        return entries.map(([id, item]) =>
          h(itemContainerComponent, { key: id, item })
        );
      },
    };
  };
// TODO: Split into its own module
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
