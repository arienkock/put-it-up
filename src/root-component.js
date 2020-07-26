const { boardComponent } = require("./board-component");

const createRoot = (board) => (h, rerender) => ({
  render: () => h("div", {}, [h(boardComponent, { board })]),
});

module.exports = {
  createRoot,
};
