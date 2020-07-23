const { createBoardComponent } = require("./components");

const createRoot = (board) => (h, rerender) => {
  const boardComp = createBoardComponent(board);
  return {
    render: () => h("div", {}, [h(boardComp)]),
  };
};

module.exports = {
  createRoot,
};
