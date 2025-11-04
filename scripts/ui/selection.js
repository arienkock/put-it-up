/**
 * Manages selection state for board items (stickies or connectors)
 * Notifies observers when selection changes
 */
export class Selection {
  constructor(observer, selectionKey, changeNotifier, store) {
    this.observer = observer;
    this.store = store;
    this.selectionKey = selectionKey || "selection";
    this.changeNotifier = changeNotifier || "onStickyChange";
    const appState = this.store.getAppState();
    appState.ui[this.selectionKey] = appState.ui[this.selectionKey] || {};
  }

  /**
   * Replaces the entire selection with a single item
   * @param {string} id - Item ID to select
   */
  replaceSelection(id) {
    const appState = this.store.getAppState();
    const prevData = appState.ui[this.selectionKey];
    appState.ui[this.selectionKey] = { [id]: true };
    Object.keys(prevData).forEach((id) => this.observer[this.changeNotifier](id));
    this.observer[this.changeNotifier](id);
  }

  /**
   * Toggles selection state of an item
   * @param {string} id - Item ID to toggle
   */
  toggleSelected(id) {
    const appState = this.store.getAppState();
    if (!appState.ui[this.selectionKey]) {
      appState.ui[this.selectionKey] = {};
    }
    const data = appState.ui[this.selectionKey];
    if (data[id]) {
      delete data[id];
    } else {
      data[id] = true;
    }
    this.observer[this.changeNotifier](id);
  }

  /**
   * Adds an item to selection without affecting other items
   * @param {string} id - Item ID to add
   */
  addToSelection(id) {
    const appState = this.store.getAppState();
    const data = appState.ui[this.selectionKey];
    if (window.DEBUG_MODE) {
      console.log('[ADD TO SELECTION]', { id, selectionKey: this.selectionKey, wasSelected: !!data[id], currentSelection: Object.keys(data) });
    }
    if (!data[id]) {
      data[id] = true;
      this.observer[this.changeNotifier](id);
      if (window.DEBUG_MODE) {
        console.log('[ADD TO SELECTION] Added', { id, newSelection: Object.keys(data) });
      }
    }
  }

  /**
   * Clears all selections
   */
  clearSelection() {
    const appState = this.store.getAppState();
    const prevData = appState.ui[this.selectionKey];
    appState.ui[this.selectionKey] = {};
    Object.keys(prevData).forEach((id) => this.observer[this.changeNotifier](id));
  }

  /**
   * Checks if an item is selected
   * @param {string} id - Item ID to check
   * @returns {boolean} True if selected
   */
  isSelected(id) {
    const appState = this.store.getAppState();
    return appState.ui[this.selectionKey][id];
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
    const appState = this.store.getAppState();
    return Object.keys(appState.ui[this.selectionKey]).forEach(fn);
  }

  /**
   * Returns the number of selected items
   * @returns {number} Number of selected items
   */
  size() {
    const appState = this.store.getAppState();
    return Object.keys(appState.ui[this.selectionKey]).length;
  }
}
