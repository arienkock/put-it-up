import { changeZoomLevel } from "./zoom.js";
import { changeColor } from "./color-management.js";

/**
 * Sets up global keyboard event handlers for board interactions
 * 
 * @param {Object} board - Board instance
 * @param {Object} selectedStickies - Selection management object
 * @param {Object} appState - Application state object
 * @param {Object} callbacks - Callback functions for various actions
 * @param {Function} callbacks.onZoomChange - Called when zoom changes
 * @param {Function} callbacks.onColorChange - Called when color changes
 * @param {Function} callbacks.onNewStickyRequest - Called when user requests new sticky
 * @param {Function} callbacks.onCancelAction - Called when user cancels action
 * @returns {Function} Cleanup function to remove event handlers
 */
export function setupKeyboardHandlers(
  board,
  selectedStickies,
  appState,
  callbacks
) {
  const keydownHandler = (event) => {
    // Zoom in/out with 'o' or 'O' (shift)
    if (event.key === "o" || event.key === "O") {
      const newScale = changeZoomLevel(appState.ui.boardScale, event.shiftKey);
      appState.ui.boardScale = newScale;
      callbacks.onZoomChange();
    }
    // New sticky with 'n'
    else if (event.key === "n") {
      appState.ui.nextClickCreatesNewSticky = true;
      callbacks.onNewStickyRequest();
    }
    // Cancel action with Escape
    else if (event.key === "Escape") {
      if (appState.ui.nextClickCreatesNewSticky) {
        appState.ui.nextClickCreatesNewSticky = false;
        callbacks.onCancelAction();
      }
    }
    // Change color with 'c' or 'C' (shift)
    else if (event.key === "c" || event.key === "C") {
      const newColor = changeColor(
        board,
        selectedStickies,
        appState.ui.currentColor,
        event.shiftKey
      );
      appState.ui.currentColor = newColor;
      callbacks.onColorChange();
    }
    // Delete selected stickies with Delete key
    else if (event.key === "Delete") {
      selectedStickies.forEach((id) => {
        board.deleteSticky(id);
      });
    }
    // Move selection with arrow keys
    else if (event.key.startsWith("Arrow") && selectedStickies.hasItems()) {
      event.preventDefault();
      const gridUnit = board.getGridUnit();
      let dx = 0;
      let dy = 0;

      switch (event.key) {
        case "ArrowUp":
          dy = -gridUnit;
          break;
        case "ArrowDown":
          dy = gridUnit;
          break;
        case "ArrowLeft":
          dx = -gridUnit;
          break;
        case "ArrowRight":
          dx = gridUnit;
          break;
        default:
          break;
      }

      moveSelection(dx, dy);
    }
  };

  // Helper function to move selected stickies
  function moveSelection(dx, dy) {
    selectedStickies.forEach((sid) => {
      const originalLocation = board.getStickyLocation(sid);
      const newLocation = {
        x: originalLocation.x + dx,
        y: originalLocation.y + dy,
      };
      board.moveSticky(sid, newLocation);
    });
  }

  // Attach handler
  document.body.onkeydown = keydownHandler;

  // Return cleanup function
  return () => {
    document.body.onkeydown = null;
  };
}
