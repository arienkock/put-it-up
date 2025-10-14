import { getAppState } from "../app-state.js";

/**
 * Manages selection state for board items (stickies)
 * Notifies observers when selection changes
 */
export class Selection {
  constructor(observer) {
    this.observer = observer;
    this.appState = getAppState();
    this.appState.ui.selection = this.appState.ui.selection || {};
  }

  /**
   * Replaces the entire selection with a single item
   * @param {string} id - Item ID to select
   */
  replaceSelection(id) {
    const prevData = this.appState.ui.selection;
    this.appState.ui.selection = { [id]: true };
    Object.keys(prevData).forEach((id) => this.observer.onStickyChange(id));
    this.observer.onStickyChange(id);
  }

  /**
   * Toggles selection state of an item
   * @param {string} id - Item ID to toggle
   */
  toggleSelected(id) {
    const data = this.appState.ui.selection;
    if (data[id]) {
      delete data[id];
    } else {
      data[id] = true;
    }
    this.observer.onStickyChange(id);
  }

  /**
   * Clears all selections
   */
  clearSelection() {
    const prevData = this.appState.ui.selection;
    this.appState.ui.selection = {};
    Object.keys(prevData).forEach((id) => this.observer.onStickyChange(id));
  }

  /**
   * Checks if an item is selected
   * @param {string} id - Item ID to check
   * @returns {boolean} True if selected
   */
  isSelected(id) {
    return this.appState.ui.selection[id];
  }

  /**
   * Checks if any items are selected
   * @returns {boolean} True if selection is not empty
   */
  hasItems() {
    return this.size() !== 0;
  }

  /**
   * Iterates over all selected item IDs
   * @param {Function} fn - Function to call for each selected ID
   */
  forEach(fn) {
    return Object.keys(this.appState.ui.selection).forEach(fn);
  }

  /**
   * Returns the number of selected items
   * @returns {number} Number of selected items
   */
  size() {
    return Object.keys(this.appState.ui.selection).length;
  }
}
