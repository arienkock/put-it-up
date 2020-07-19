import React from "react";
import ReactDOM from "react-dom";
import * as serviceWorker from "./serviceWorker";

import { Board } from "put-it-up/src/board";
import { createRoot } from "put-it-up/src/root-component";
import { ReactUIAdapter } from "put-it-up/src/react-ui";

const ui = new ReactUIAdapter();

const App = ui.wrapComponentWithReactComponent(createRoot(new Board("test")));

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
