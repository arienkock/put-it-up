export function getAppState() {
  if (!window.appState) {
    window.appState = {
      board: undefined,
      stickies: {},
      idGen: 0,
      ui: {
        boardScale: undefined,
        currentColor: "khaki",
        nextClickCreatesNewSticky: false,
        stickiesMovedByDragging: [],
        selection: {},
      },
    };
  }
  return window.appState;
}
