import React from "react";
import ReactDOM from "react-dom";
import * as serviceWorker from "./serviceWorker";

import { Board } from "put-it-up/src/board";
import { RootComponent } from "put-it-up/src/root-component";
import { ReactUIAdapter } from "put-it-up/src/react-ui";

const ui = new ReactUIAdapter();

const App = ui.c(RootComponent);

ui.mount(
  ui.h(App, { board: new Board("test") }),
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
