const { boardComponent } = require("./board-component");

const createRoot = (board) => ({ h, c }) => {
  const boardC = c(boardComponent);
  return {
    render: () => h("div", {}, [h(boardC, { board })]),
  };
};

module.exports = {
  createRoot,
};
