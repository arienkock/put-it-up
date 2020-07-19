const createRoot = (board) => (h, rerender) => ({
  render: () => h("div", {}, "testing"),
});

module.exports = {
  createRoot,
};
