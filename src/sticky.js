const getset = require("./getset");

class Sticky {
  constructor() {
    this._color = Colors.default;
    this.text = getset("");
    this.color = getset(Colors.default);
  }
}

const Colors = Object.freeze({
  default: "rgb(254, 213, 44)",
  orange: "rgb(255, 153, 42)",
  pink: "rgb(255, 104, 185)",
  blue: "rgb(52, 153, 254)",
  green: "rgb(108, 218, 108)",
});

module.exports = {
  Sticky,
  Colors,
};
