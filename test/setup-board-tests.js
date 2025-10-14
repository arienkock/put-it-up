// Setup file for board unit tests that need window global
// These tests import modules directly rather than running in a browser page

if (typeof window === 'undefined') {
  global.window = {
    appState: undefined
  };
}
