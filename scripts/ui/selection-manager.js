/**
 * Manages selection across different content types (stickies, connectors, etc.)
 * Ensures proper cross-type selection clearing when items are selected without shift
 */
export class SelectionManager {
  constructor() {
    this.selections = new Map(); // Map of selection type name -> Selection instance
  }

  /**
   * Registers a selection instance for a content type
   * @param {string} typeName - Name of the content type (e.g., 'stickies', 'connectors')
   * @param {Selection} selectionInstance - The Selection instance to manage
   */
  registerSelection(typeName, selectionInstance) {
    this.selections.set(typeName, selectionInstance);
  }

  /**
   * Selects an item with proper cross-type selection management
   * @param {string} typeName - The content type being selected
   * @param {string} itemId - The ID of the item to select
   * @param {Object} options - Selection options
   * @param {boolean} options.addToSelection - If true, add to selection; if false, replace selection
   */
  selectItem(typeName, itemId, options = {}) {
    const { addToSelection = false } = options;
    const targetSelection = this.selections.get(typeName);
    
    if (!targetSelection) {
      console.warn(`No selection registered for type: ${typeName}`);
      return;
    }

    if (addToSelection) {
      // Shift-click: just toggle in the target selection
      targetSelection.toggleSelected(itemId);
    } else {
      // Regular click: clear all other selections first, then select this item
      this.clearAllSelectionsExcept(typeName);
      targetSelection.replaceSelection(itemId);
    }
  }

  /**
   * Adds an item to the current selection without toggling
   * Used when starting a drag to ensure the item is selected without deselecting others
   * @param {string} typeName - The content type being selected
   * @param {string} itemId - The ID of the item to select
   */
  addToSelection(typeName, itemId) {
    if (window.DEBUG_MODE) {
      console.log('[SELECTION MANAGER] addToSelection called', { typeName, itemId });
    }
    const targetSelection = this.selections.get(typeName);
    
    if (!targetSelection) {
      console.warn(`No selection registered for type: ${typeName}`);
      return;
    }
    
    targetSelection.addToSelection(itemId);
  }

  /**
   * Clears all selections except the specified type
   * @param {string} exceptType - The type to exclude from clearing
   */
  clearAllSelectionsExcept(exceptType) {
    for (const [typeName, selection] of this.selections) {
      if (typeName !== exceptType) {
        selection.clearSelection();
      }
    }
  }

  /**
   * Clears all selections across all types
   */
  clearAllSelections() {
    for (const selection of this.selections.values()) {
      selection.clearSelection();
    }
  }

  /**
   * Gets a selection instance by type name
   * @param {string} typeName - The content type name
   * @returns {Selection|null} The selection instance or null if not found
   */
  getSelection(typeName) {
    return this.selections.get(typeName) || null;
  }

  /**
   * Checks if any items are selected across all types
   * @returns {boolean} True if any selection has items
   */
  hasAnySelection() {
    for (const selection of this.selections.values()) {
      if (selection.hasItems()) {
        return true;
      }
    }
    return false;
  }
}
