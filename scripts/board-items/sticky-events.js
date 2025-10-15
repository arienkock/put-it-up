import { fitContentInSticky } from "./text-fitting.js";
import { STICKY_TYPE } from "./sticky.js";
import { getAppState } from "../app-state.js";

/**
 * Sets up all event handlers for a sticky note
 * 
 * @param {HTMLElement} container - The sticky container element
 * @param {string} id - Sticky ID
 * @param {Function} updateTextById - Function to update sticky text
 * @param {Function} getStickyLocation - Function to get sticky location
 * @param {Object} selectedStickies - Selection management object
 * @returns {Object} Object with cleanup functions if needed
 */
export function setupStickyEvents(
  container,
  id,
  updateTextById,
  getStickyLocation,
  selectedStickies
) {
  const appState = getAppState();
  // Drag start event
  container.ondragstart = (event) => {
    // Don't start sticky drag if we're in connector creation mode
    if (appState.ui.nextClickCreatesConnector) {
      event.preventDefault();
      return;
    }
    
    const { pageX: x, pageY: y } = event;
    let originalLocations = {};
    
    if (selectedStickies.isSelected(id)) {
      selectedStickies.forEach((sid) => {
        originalLocations[sid] = getStickyLocation(sid);
      });
    } else {
      originalLocations[id] = getStickyLocation(id);
    }
    
    event.dataTransfer.setData(
      STICKY_TYPE,
      JSON.stringify({ originalLocations, dragStart: { x, y } })
    );
    moveToFront();
  };

  // Editable state management
  function setEditable(enabled) {
    if (enabled) {
      container.classList.add("editing");
      container.inputElement.focus();
    } else {
      container.classList.remove("editing");
      container.inputElement.blur();
    }
  }

  // Input element events
  container.inputElement.onblur = () => setEditable(false);
  
  container.inputElement.onfocus = () => {
    setEditable(true);
    moveToFront();
  };
  
  container.inputElement.onkeydown = (event) => {
    event.stopPropagation();
    if (event.key === "Escape") {
      setEditable(false);
    }
  };
  
  container.inputElement.onkeyup = (event) => {
    event.stopPropagation();
    if (event.keyCode === 13) {
      setEditable(false);
    }
  };
  
  container.inputElement.onclick = (event) => {
    if (event.shiftKey) {
      event.preventDefault();
    }
  };

  // Move sticky to front (z-index)
  function moveToFront() {
    [...container.parentNode.children].forEach((el) => {
      if (el === container) {
        el.style.zIndex = "1";
      } else {
        el.style.zIndex = "unset";
      }
    });
  }

  // Input event for text updates
  container.inputElement.addEventListener("input", () => {
    moveToFront();
    container.inputElement.value = updateTextById(
      id,
      container.inputElement.value
    );
    fitContentInSticky(container.sticky, container.inputElement);
  });

  // Sticky click event for selection
  container.sticky.onclick = (event) => {
    // Don't handle sticky selection if we're in connector creation mode
    if (appState.ui.nextClickCreatesConnector) {
      return;
    }
    
    moveToFront();
    
    if (event.shiftKey) {
      selectedStickies.toggleSelected(id);
      setEditable(false);
      if (window.menuRenderCallback) {
        window.menuRenderCallback();
      }
    } else {
      selectedStickies.replaceSelection(id);
      if (window.menuRenderCallback) {
        window.menuRenderCallback();
      }
    }
  };

  // Initial state
  moveToFront();

  return {
    // Could add cleanup functions here if needed
  };
}
