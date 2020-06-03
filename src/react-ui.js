import * as ReactDOM from "react-dom";
import * as React from "react";

export class ReactUIAdapter {
  render(component, mountPointSelector) {
    const Component = this.wrapComponentWithReactComponent(component);
    ReactDOM.render(
      React.createElement(Component),
      document.querySelector(mountPointSelector)
    );
  }

  wrapComponentWithReactComponent(bareComponent) {
    const h = React.createElement.bind(React);
    return class WrappedComponent extends React.Component {
      render(props) {
        return bareComponent.render(h, props);
      }
    };
  }
}
