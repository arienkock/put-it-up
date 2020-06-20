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
    const h = (tag, ...rest) => {
      if (typeof tag !== "string") {
        tag = this.wrapComponentWithReactComponent(tag);
      }
      return React.createElement(tag, ...rest);
    };
    return class WrappedComponent extends React.Component {
      constructor(...args) {
        super(...args);
        this.delegate = bareComponent(h, () => this.forceUpdate());
      }
      render(props) {
        return this.delegate.render(props);
      }
    };
  }
}

module.exports = { ReactUIAdapter };
