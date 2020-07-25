const ReactDOM = require("react-dom");
const React = require("react");

class ReactUIAdapter {
  constructor() {
    this.h = this.h.bind(this);
    this.c = this.c.bind(this);
  }

  mount(Component, mountPointSelector) {
    ReactDOM.render(
      React.createElement(Component),
      document.querySelector(mountPointSelector)
    );
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
        this.delegate = bareComponent({
          h,
          c,
          rerender: this.forceUpdate.bind(this),
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
