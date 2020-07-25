const ReactDOM = require("react-dom");
const React = require("react");

class ReactUIAdapter {
  render(bareComponent, mountPointSelector) {
    const Component = this.wrapComponentWithReactComponent(bareComponent);
    ReactDOM.render(
      React.createElement(Component),
      document.querySelector(mountPointSelector)
    );
  }

  wrapComponentWithReactComponent(bareComponent) {
    const h = (tag, props, children) => {
      if (typeof tag !== "string") {
        tag = this.wrapComponentWithReactComponent(tag);
      }
      return React.createElement(tag, props, children);
    };
    let i = 0, j=0
    return class WrappedComponent extends React.Component {
      constructor(props) {
        super(props);
        this.delegate = bareComponent(h, () => {
          this.forceUpdate()
        });
        this.componentDidMount = () => {
          if (typeof this.delegate.setup === "function") {
            this.delegate.setup(props)
          }
        }
      }
      render() {
        return this.delegate.render(this.props);
      }
    };
  }
}

module.exports = { ReactUIAdapter };
