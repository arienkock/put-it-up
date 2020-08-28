const { boardComponent } = require("./board-component");

function RootComponent({ h, c }) {
  const boardC = c(boardComponent);
  this.render = ({ board }) => h("div", {}, [h(boardC, { board })]);
}

module.exports = {
  RootComponent,
};
