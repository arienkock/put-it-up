import { getAllPlugins } from './board-items/plugin-registry.js';

export function getAppState() {
  if (!window.appState) {
    // Initialize plugin-specific state dynamically
    const pluginState = {};
    const pluginSelections = {};
    const plugins = getAllPlugins();
    
    // Initialize storage for each plugin
    plugins.forEach(plugin => {
      const type = plugin.getType();
      const storageKey = plugin.getSelectionType();
      pluginState[storageKey] = {};
      pluginSelections[storageKey] = {};
    });
    
    // Initialize UI state for each plugin
    const pluginUIState = {};
    plugins.forEach(plugin => {
      const type = plugin.getType();
      const creationFlag = plugin.getCreationModeFlag();
      if (creationFlag) {
        pluginUIState[creationFlag] = false;
      }
      // Store default color and moved-by-dragging arrays
      const storageKey = plugin.getSelectionType();
      pluginUIState[`${storageKey}MovedByDragging`] = [];
      pluginUIState[`current${type.charAt(0).toUpperCase() + type.slice(1)}Color`] = plugin.getDefaultColor();
    });
    
    window.appState = {
      board: undefined,
      // Initialize plugin storage dynamically
      ...pluginState,
      connectors: {},
      // Initialize id generators dynamically
      idGen: 0,
      connectorIdGen: 0,
      ...Object.fromEntries(plugins.map(plugin => {
        const type = plugin.getType();
        return [`${type}IdGen`, 0];
      })),
      ui: {
        boardScale: undefined,
        currentColor: "khaki", // Legacy - kept for backward compatibility
        currentConnectorColor: "#000000", // Current color for new connectors
        currentArrowHead: "filled",
        nextClickCreatesConnector: false,
        connectorOriginId: null,
        selection: {},
        connectorSelection: {},
        // Initialize plugin-specific UI state
        ...pluginUIState,
        // Initialize plugin selections
        ...pluginSelections,
        // Store plugin state map for easy access
        pluginState: pluginUIState,
      },
    };
  }
  return window.appState;
}
