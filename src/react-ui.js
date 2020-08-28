const ReactDOM = require("react-dom");
const React = require("react");

class ReactUIAdapter {
  constructor() {
    this.h = this.h.bind(this);
    this.c = this.c.bind(this);
  }

  mount(element, mountPoint) {
    ReactDOM.render(element, mountPoint);
  }

  h(tag, props, children) {
    return React.createElement(tag, props, children);
  }

  c(bareComponent) {
    const h = this.h,
      c = this.c;
    return class WrappedComponent extends React.Component {
      constructor(props) {
        super(props);
        this.delegate = new bareComponent({
          h,
          c,
          rerender: () => this.forceUpdate(),
        });
        this.componentDidMount = () => {
          if (typeof this.delegate.setup === "function") {
            this.delegate.setup(props);
          }
        };
      }
      render() {
        return this.delegate.render(this.props);
      }
    };
  }
}

module.exports = { ReactUIAdapter };
