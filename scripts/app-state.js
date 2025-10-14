export function getAppState() {
  if (!window.appState) {
    window.appState = {
      board: undefined,
      stickies: {},
      connectors: {},
      idGen: 0,
      connectorIdGen: 0,
      ui: {
        boardScale: undefined,
        currentColor: "khaki",
        currentArrowHead: "filled",
        nextClickCreatesNewSticky: false,
        nextClickCreatesConnector: false,
        connectorOriginId: null,
        stickiesMovedByDragging: [],
        selection: {},
        connectorSelection: {},
      },
    };
  }
  return window.appState;
}
