import { getAppState } from "../app-state.js";

/**
 * Manages selection state for board items (stickies or connectors)
 * Notifies observers when selection changes
 */
export class Selection {
  constructor(observer, selectionKey, changeNotifier) {
    this.observer = observer;
    this.appState = getAppState();
    this.selectionKey = selectionKey || "selection";
    this.changeNotifier = changeNotifier || "onStickyChange";
    this.appState.ui[this.selectionKey] = this.appState.ui[this.selectionKey] || {};
  }

  /**
   * Replaces the entire selection with a single item
   * @param {string} id - Item ID to select
   */
  replaceSelection(id) {
    const prevData = this.appState.ui[this.selectionKey];
    this.appState.ui[this.selectionKey] = { [id]: true };
    Object.keys(prevData).forEach((id) => this.observer[this.changeNotifier](id));
    this.observer[this.changeNotifier](id);
  }

  /**
   * Toggles selection state of an item
   * @param {string} id - Item ID to toggle
   */
  toggleSelected(id) {
    const data = this.appState.ui[this.selectionKey];
    if (data[id]) {
      delete data[id];
    } else {
      data[id] = true;
    }
    this.observer[this.changeNotifier](id);
  }

  /**
   * Clears all selections
   */
  clearSelection() {
    const prevData = this.appState.ui[this.selectionKey];
    this.appState.ui[this.selectionKey] = {};
    Object.keys(prevData).forEach((id) => this.observer[this.changeNotifier](id));
  }

  /**
   * Checks if an item is selected
   * @param {string} id - Item ID to check
   * @returns {boolean} True if selected
   */
  isSelected(id) {
    return this.appState.ui[this.selectionKey][id];
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
    return Object.keys(this.appState.ui[this.selectionKey]).forEach(fn);
  }

  /**
   * Returns the number of selected items
   * @returns {number} Number of selected items
   */
  size() {
    return Object.keys(this.appState.ui[this.selectionKey]).length;
  }
}
