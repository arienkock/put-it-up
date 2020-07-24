const ReactDOM = require("react-dom");
const React = require("react");

class ReactUIAdapter {
  // TODO: Consider removing the render, since the create-react-app does this, and that makes the most sense
  render(bareComponent, mountPointSelector) {
    const Component = this.wrapComponentWithReactComponent(bareComponent);
    ReactDOM.render(
      React.createElement(Component),
      document.querySelector(mountPointSelector)
    );
  }

  // TODO: rename to exclude the term React
  wrapComponentWithReactComponent(bareComponent) {
    // TODO: move h to outer class
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
