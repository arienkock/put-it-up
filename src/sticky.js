class Sticky {
  constructor() {
    this._text = "";
    this._color = Colors.default;
  }
  text(t) {
    if (arguments.length === 0) {
      return this._text;
    } else {
      this._text = t;
    }
  }
  color(c) {
    if (arguments.length === 0) {
      return this._color;
    } else {
      this._color = Colors[c] || this._color;
    }
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
