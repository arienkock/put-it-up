export function getAppState() {
  if (!window.appState) {
    window.appState = {
      board: undefined,
      stickies: {},
      connectors: {},
      images: {},
      idGen: 0,
      connectorIdGen: 0,
      imageIdGen: 0,
      ui: {
        boardScale: undefined,
        currentColor: "khaki", // Legacy - kept for backward compatibility
        currentStickyColor: "khaki", // Current color for new stickies
        currentConnectorColor: "#000000", // Current color for new connectors
        currentArrowHead: "filled",
        nextClickCreatesNewSticky: false,
        nextClickCreatesConnector: false,
        connectorOriginId: null,
        stickiesMovedByDragging: [],
        imagesMovedByDragging: [],
        selection: {},
        connectorSelection: {},
        imageSelection: {},
      },
    };
  }
  return window.appState;
}
